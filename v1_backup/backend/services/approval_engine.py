"""
簽核流程引擎
支援：循序簽核、會簽（countersign）、退回、代理人自動轉派
"""
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session
from models.contract import Contract
from models.workflow import Workflow, WorkflowStep
from models.approval import ApprovalRecord
from models.user import User
from services.notification_service import create_notification


def _resolve_approver(db: Session, step: WorkflowStep) -> int | None:
    """解析步驟的實際簽核人（固定人員 or 依角色動態指定），含代理人判斷"""
    if step.approver_id:
        approver = db.get(User, step.approver_id)
    elif step.approver_role:
        approver = db.query(User).filter(
            User.role == step.approver_role, User.is_active == True
        ).first()
    else:
        return None

    if not approver:
        return None

    # 代理人判斷
    today = date.today()
    if (approver.deputy_id
        and approver.deputy_start and approver.deputy_end
        and approver.deputy_start <= today <= approver.deputy_end):
        deputy = db.get(User, approver.deputy_id)
        if deputy and deputy.is_active:
            return deputy.id

    return approver.id


def submit_contract(db: Session, contract_id: int, workflow_id: int, submitter_id: int):
    """送出合約進入簽核流程"""
    contract = db.get(Contract, contract_id)
    if not contract:
        raise ValueError("合約不存在")
    if contract.status not in ("draft", "rejected"):
        raise ValueError("僅草稿或退回狀態可送出簽核")

    workflow = db.get(Workflow, workflow_id)
    if not workflow or not workflow.is_active:
        raise ValueError("簽核流程不存在或已停用")

    # 清除舊的審核記錄（重新送出時）
    db.query(ApprovalRecord).filter(ApprovalRecord.contract_id == contract_id).delete()
    db.flush()

    # 建立各步驟的審核記錄
    for step in workflow.steps:
        approver_id = _resolve_approver(db, step)
        if not approver_id:
            raise ValueError(f"步驟 {step.step_order}「{step.approver_role}」找不到簽核人")

        is_first = step.step_order == 1
        record = ApprovalRecord(
            contract_id=contract_id,
            step_id=step.id,
            step_order=step.step_order,
            step_type=step.step_type,
            approver_id=approver_id,
            status="pending" if is_first else "waiting",
        )
        db.add(record)

    contract.status = "pending"
    contract.workflow_id = workflow_id
    contract.current_step = 1
    db.flush()

    # 通知第一步簽核人
    first_records = db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == contract_id,
        ApprovalRecord.step_order == 1,
    ).all()
    for rec in first_records:
        create_notification(
            db, rec.approver_id, contract_id, "pending_approval",
            f"合約「{contract.title}」需要您的審核"
        )

    return contract


def advance_contract(db: Session, contract_id: int, action: str,
                     approver_id: int, comment: str | None = None):
    """簽核操作：approved / rejected"""
    contract = db.get(Contract, contract_id)
    if not contract or contract.status != "pending":
        raise ValueError("合約不存在或非待簽狀態")

    # 找到當前待審核的記錄
    record = db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == contract_id,
        ApprovalRecord.approver_id == approver_id,
        ApprovalRecord.status == "pending",
    ).first()

    if not record:
        raise ValueError("您不是當前步驟的簽核人，或已完成簽核")

    now = datetime.now(timezone.utc)
    record.action = action
    record.comment = comment
    record.acted_at = now

    if action == "approved":
        record.status = "approved"

        # 會簽模式：檢查同步驟是否所有人都已核准
        if record.step_type == "countersign":
            same_step = db.query(ApprovalRecord).filter(
                ApprovalRecord.contract_id == contract_id,
                ApprovalRecord.step_order == record.step_order,
            ).all()
            all_approved = all(r.status == "approved" for r in same_step)
            if not all_approved:
                db.flush()
                return contract  # 等待其他會簽人

        # 檢查是否有下一步驟
        next_records = db.query(ApprovalRecord).filter(
            ApprovalRecord.contract_id == contract_id,
            ApprovalRecord.step_order == record.step_order + 1,
        ).all()

        if next_records:
            # 推進到下一步
            contract.current_step = record.step_order + 1
            for nr in next_records:
                nr.status = "pending"
                create_notification(
                    db, nr.approver_id, contract_id, "pending_approval",
                    f"合約「{contract.title}」需要您的審核（第 {nr.step_order} 關）"
                )
        else:
            # 全部核准完成
            contract.status = "approved"
            contract.current_step = record.step_order
            create_notification(
                db, contract.creator_id, contract_id, "approved",
                f"您的合約「{contract.title}」已全數核准通過"
            )
    elif action == "rejected":
        record.status = "rejected"
        contract.status = "rejected"
        approver = db.get(User, approver_id)
        create_notification(
            db, contract.creator_id, contract_id, "rejected",
            f"您的合約「{contract.title}」被 {approver.name} 退回。原因：{comment or '無'}"
        )

        # 會簽模式：其中一人退回 → 整個節點退回
        if record.step_type == "countersign":
            same_step = db.query(ApprovalRecord).filter(
                ApprovalRecord.contract_id == contract_id,
                ApprovalRecord.step_order == record.step_order,
                ApprovalRecord.id != record.id,
            ).all()
            for sr in same_step:
                if sr.status == "pending":
                    sr.status = "rejected"

    db.flush()
    return contract


def batch_approve(db: Session, contract_ids: list[int], approver_id: int, comment: str | None = None):
    """批次同意多筆合約"""
    results = []
    for cid in contract_ids:
        try:
            c = advance_contract(db, cid, "approved", approver_id, comment)
            results.append({"contract_id": cid, "status": c.status, "success": True})
        except ValueError as e:
            results.append({"contract_id": cid, "error": str(e), "success": False})
    return results


def remind_approver(db: Session, contract_id: int, requester_id: int):
    """催簽：對當前簽核人發送提醒"""
    contract = db.get(Contract, contract_id)
    if not contract or contract.status != "pending":
        raise ValueError("合約不存在或非待簽狀態")
    if contract.creator_id != requester_id:
        raise ValueError("僅合約申請人可催簽")

    pending = db.query(ApprovalRecord).filter(
        ApprovalRecord.contract_id == contract_id,
        ApprovalRecord.status == "pending",
    ).all()

    for rec in pending:
        # 防止重複催簽（同一天）
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        existing = db.query(Notification).filter(
            Notification.user_id == rec.approver_id,
            Notification.contract_id == contract_id,
            Notification.type == "reminder",
            Notification.created_at >= today_start,
        ).first()
        if not existing:
            create_notification(
                db, rec.approver_id, contract_id, "reminder",
                f"申請人催簽：合約「{contract.title}」仍待您的審核"
            )

    return {"reminded_count": len(pending)}
