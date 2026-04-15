"""
合約流程引擎 - 管理合約在 10 個階段之間的推進
對應流程圖主軸：起始作業→簽呈→請購單→決購建議表→非制式合約會辦→用印→寄送→收件→入檔→驗收
"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models.contract import Contract, ContractStageLog, CONTRACT_STAGES
from models.approval import ApprovalRecord
from models.notification import Notification
from models.workflow import Workflow, WorkflowStep
from models.user import User


# 定義階段順序
STAGE_ORDER = [
    "draft", "approval_memo", "purchase_request", "purchase_decision",
    "contract_review", "stamping", "vendor_stamping", "signing_complete",
    "archived", "acceptance"
]


def get_next_stage(current_stage: str) -> str | None:
    """取得下一個階段"""
    if current_stage not in STAGE_ORDER:
        return None
    idx = STAGE_ORDER.index(current_stage)
    if idx + 1 < len(STAGE_ORDER):
        return STAGE_ORDER[idx + 1]
    return None


def get_prev_stage(current_stage: str) -> str | None:
    """取得上一個階段（退回用）"""
    if current_stage not in STAGE_ORDER:
        return None
    idx = STAGE_ORDER.index(current_stage)
    if idx > 0:
        return STAGE_ORDER[idx - 1]
    return None


def advance_stage(db: Session, contract: Contract, operator_id: int, comment: str = None) -> dict:
    """推進合約到下一階段"""
    current = contract.current_stage
    next_stage = get_next_stage(current)

    if not next_stage:
        return {"success": False, "error": "已是最後階段"}

    # 檢查此階段是否有待簽核的紀錄
    pending = db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == contract.id,
        ApprovalRecord.stage == current,
        ApprovalRecord.status == "pending"
    ).count()
    if pending > 0:
        return {"success": False, "error": f"此階段還有 {pending} 筆待簽核"}

    # 記錄階段變更
    log = ContractStageLog(
        contract_id=contract.id,
        from_stage=current,
        to_stage=next_stage,
        operator_id=operator_id,
        comment=comment
    )
    db.add(log)

    contract.previous_stage = current
    contract.current_stage = next_stage
    if next_stage == "acceptance":
        contract.completed_at = datetime.now(timezone.utc)

    db.commit()

    # 建立下一階段的簽核記錄（如果有對應的 workflow）
    _create_stage_approvals(db, contract, next_stage)

    # 通知相關人員
    _notify_stage_change(db, contract, current, next_stage)

    return {"success": True, "stage": next_stage, "label": CONTRACT_STAGES[next_stage]["label"]}


def reject_to_previous(db: Session, contract: Contract, operator_id: int, comment: str) -> dict:
    """退回到上一階段"""
    current = contract.current_stage
    prev_stage = get_prev_stage(current)

    if not prev_stage:
        return {"success": False, "error": "無法再退回"}

    # 取消目前階段未完成的簽核紀錄，避免重新推進時產生重複
    db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == contract.id,
        ApprovalRecord.stage == current,
        ApprovalRecord.status.in_(["pending", "waiting"])
    ).update(
        {"status": "cancelled", "comment": f"[退回取消] {comment}"},
        synchronize_session="fetch"
    )

    log = ContractStageLog(
        contract_id=contract.id,
        from_stage=current,
        to_stage=prev_stage,
        operator_id=operator_id,
        comment=f"[退回] {comment}"
    )
    db.add(log)

    contract.previous_stage = current
    contract.current_stage = prev_stage
    db.commit()

    _notify_stage_change(db, contract, current, prev_stage, is_reject=True)

    return {"success": True, "stage": prev_stage, "label": CONTRACT_STAGES[prev_stage]["label"]}


def void_contract(db: Session, contract: Contract, operator_id: int, reason: str) -> dict:
    """作廢合約"""
    log = ContractStageLog(
        contract_id=contract.id,
        from_stage=contract.current_stage,
        to_stage="void",
        operator_id=operator_id,
        comment=f"[作廢] {reason}"
    )
    db.add(log)

    contract.previous_stage = contract.current_stage
    contract.current_stage = "void"
    contract.void_reason = reason
    db.commit()
    return {"success": True, "stage": "void"}


def submit_for_approval(db: Session, contract: Contract, workflow_id: int, submitter_id: int) -> dict:
    """為目前階段建立簽核紀錄"""
    workflow = db.get(Workflow, workflow_id)
    if not workflow:
        return {"success": False, "error": "流程不存在"}

    stage = contract.current_stage

    # 防重：若此階段已有未完成紀錄，先標記取消再重建
    db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == contract.id,
        ApprovalRecord.stage == stage,
        ApprovalRecord.status.in_(["pending", "waiting"])
    ).update(
        {"status": "cancelled", "comment": "[重建取消] 重新提交簽核"},
        synchronize_session="fetch"
    )
    db.flush()

    for step in workflow.steps:
        approver_id = _resolve_approver(db, step, contract)
        record = ApprovalRecord(
            contract_id=contract.id,
            stage=stage,
            workflow_id=workflow_id,
            step_id=step.id,
            step_order=step.step_order,
            step_type=step.step_type,
            step_name=step.step_name,
            approver_id=approver_id,
            status="pending" if step.step_order == 1 else "waiting"
        )
        db.add(record)

    db.commit()

    # 通知第一關簽核人
    first_records = db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == contract.id,
        ApprovalRecord.stage == stage,
        ApprovalRecord.step_order == 1,
        ApprovalRecord.status == "pending"
    ).all()
    for r in first_records:
        db.add(Notification(
            user_id=r.approver_id, contract_id=contract.id,
            type="approval_needed",
            message=f"合約 {contract.contract_no}「{contract.title}」的{CONTRACT_STAGES.get(stage, {}).get('label', stage)}階段等待您簽核"
        ))
    db.commit()

    return {"success": True, "stage": stage}


def process_approval(db: Session, record: ApprovalRecord, action: str, comment: str = None) -> dict:
    """處理單筆簽核"""
    record.action = action
    record.status = action  # approved or rejected
    record.comment = comment
    record.acted_at = datetime.now(timezone.utc)
    db.flush()

    contract = db.get(Contract, record.contract_id)

    if action == "rejected":
        # 退回 - 清除此階段所有待簽核
        db.query(ApprovalRecord).filter(
            ApprovalRecord.contract_id == record.contract_id,
            ApprovalRecord.stage == record.stage,
            ApprovalRecord.status.in_(["pending", "waiting"])
        ).update({"status": "rejected", "comment": "因其他關卡退回而取消"}, synchronize_session="fetch")
        db.commit()

        _notify_stage_change(db, contract, record.stage, record.stage, is_reject=True)
        return {"success": True, "action": "rejected", "stage": record.stage}

    # approved - 檢查同一 step_order 的會簽是否都完成（忽略已取消紀錄）
    same_step = db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == record.contract_id,
        ApprovalRecord.stage == record.stage,
        ApprovalRecord.step_order == record.step_order,
        ApprovalRecord.status != "cancelled",
    ).all()

    all_approved = all(r.status == "approved" for r in same_step)
    if not all_approved:
        db.commit()
        return {"success": True, "action": "approved", "stage": record.stage, "note": "等待會簽完成"}

    # 啟動下一關（忽略已取消紀錄）
    next_order = record.step_order + 1
    next_records = db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == record.contract_id,
        ApprovalRecord.stage == record.stage,
        ApprovalRecord.step_order == next_order,
        ApprovalRecord.status != "cancelled",
    ).all()

    if next_records:
        for r in next_records:
            r.status = "pending"
            db.add(Notification(
                user_id=r.approver_id, contract_id=contract.id,
                type="approval_needed",
                message=f"合約 {contract.contract_no}「{contract.title}」等待您簽核"
            ))
        db.commit()
        return {"success": True, "action": "approved", "stage": record.stage, "note": "進入下一關"}

    # 此階段所有簽核完成 - 自動推進到下一階段
    db.commit()
    return advance_stage(db, contract, record.approver_id, "簽核通過，自動推進")


def _resolve_approver(db: Session, step: WorkflowStep, contract: Contract) -> int:
    """解析簽核人，支援代理人機制"""
    if step.approver_id:
        user = db.get(User, step.approver_id)
        if user and user.deputy_id and user.deputy_start and user.deputy_end:
            from datetime import date
            today = date.today()
            if user.deputy_start <= today <= user.deputy_end:
                return user.deputy_id
        return step.approver_id

    # 依角色指派
    if step.approver_role:
        user = db.query(User).filter(
            User.role == step.approver_role, User.is_active == True
        ).first()
        if user:
            return user.id

    return contract.creator_id


def _create_stage_approvals(db: Session, contract: Contract, stage: str):
    """自動為新階段建立簽核（如有對應 workflow）"""
    workflow = db.query(Workflow).filter(
        Workflow.stage == stage,
        Workflow.is_active == True,
        (Workflow.contract_type == contract.contract_type) | (Workflow.contract_type == None)
    ).first()

    if workflow:
        submit_for_approval(db, contract, workflow.id, contract.creator_id)


def _notify_stage_change(db: Session, contract: Contract, from_stage: str, to_stage: str, is_reject: bool = False):
    """通知階段變更"""
    action = "退回" if is_reject else "推進"
    to_label = CONTRACT_STAGES.get(to_stage, {}).get("label", to_stage)
    msg = f"合約 {contract.contract_no}「{contract.title}」已{action}至「{to_label}」階段"

    db.add(Notification(
        user_id=contract.creator_id, contract_id=contract.id,
        type="stage_change", message=msg
    ))
    db.commit()
