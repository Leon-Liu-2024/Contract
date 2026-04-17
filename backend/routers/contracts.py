from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from database import get_db
from models.contract import Contract, ContractStageLog
from models.document import Document
from models.vendor import Vendor
from models.approval import ApprovalRecord
from models.user import User
from schemas.contract import ContractCreate, ContractUpdate, StageAdvanceRequest, VoidRequest
from middleware.auth import get_current_user
from services.contract_engine import advance_stage, reject_to_previous, void_contract, submit_for_approval, STAGE_ORDER
from services.file_service import save_upload
from utils.datetime_utils import to_iso_utc

router = APIRouter(prefix="/api/contracts", tags=["合約管理"])


def _gen_contract_no(db: Session, contract_type: str) -> str:
    prefix = {"purchase": "PUR", "nda": "NDA", "service": "SVC", "maintenance": "MNT"}.get(contract_type, "CTR")
    today = date.today().strftime("%Y%m%d")
    count = db.query(Contract).filter(Contract.contract_no.like(f"{prefix}-{today}-%")).count()
    return f"{prefix}-{today}-{count+1:03d}"


@router.get("/")
def list_contracts(
    status_filter: Optional[str] = Query(None, alias="status", description="合約階段"),
    contract_type: Optional[str] = Query(None, description="合約類型"),
    keyword: Optional[str] = Query(None, description="搜尋標題或合約編號"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Contract)

    # Visibility based on role
    if current_user.role not in ("admin", "pmo"):
        if current_user.role == "manager":
            query = query.join(User, Contract.creator_id == User.id, isouter=True).filter(
                (Contract.creator_id == current_user.id)
                | (User.department == current_user.department)
            )
        else:
            query = query.filter(Contract.creator_id == current_user.id)

    if status_filter:
        query = query.filter(Contract.current_stage == status_filter)
    if contract_type:
        query = query.filter(Contract.contract_type == contract_type)
    if keyword:
        query = query.filter(
            (Contract.title.ilike(f"%{keyword}%")) | (Contract.contract_no.ilike(f"%{keyword}%"))
        )

    total = query.count()
    contracts = (
        query.order_by(Contract.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for c in contracts:
        items.append({
            "id": c.id,
            "contract_no": c.contract_no,
            "title": c.title,
            "contract_type": c.contract_type,
            "contract_format": c.contract_format,
            "vendor_id": c.vendor_id,
            "vendor_name": c.vendor.name if c.vendor else None,
            "amount": c.amount,
            "currency": c.currency,
            "start_date": str(c.start_date) if c.start_date else None,
            "end_date": str(c.end_date) if c.end_date else None,
            "current_stage": c.current_stage,
            "creator_id": c.creator_id,
            "creator_name": c.creator.name if c.creator else None,
            "created_at": to_iso_utc(c.created_at),
            "updated_at": to_iso_utc(c.updated_at),
        })

    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_contract(
    data: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract_no = _gen_contract_no(db, data.contract_type)
    contract = Contract(
        **data.model_dump(),
        contract_no=contract_no,
        current_stage="draft",
        creator_id=current_user.id,
    )
    db.add(contract)
    db.flush()

    log = ContractStageLog(
        contract_id=contract.id,
        from_stage=None,
        to_stage="draft",
        operator_id=current_user.id,
        comment="合約建立",
    )
    db.add(log)
    db.commit()
    db.refresh(contract)
    return {
        "id": contract.id,
        "contract_no": contract.contract_no,
        "title": contract.title,
        "current_stage": contract.current_stage,
    }


@router.get("/{contract_id}")
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")

    # Build response manually to include related names
    approval_records = (
        db.query(ApprovalRecord, User)
        .outerjoin(User, ApprovalRecord.approver_id == User.id)
        .filter(
            ApprovalRecord.contract_id == contract_id,
            ApprovalRecord.status != "cancelled",
        )
        .all()
    )

    # 依流程順序排序（STAGE_ORDER 定義 10 個階段的先後），同階段內再依 step_order 排
    _stage_index = {s: i for i, s in enumerate(STAGE_ORDER)}
    approval_records.sort(key=lambda x: (_stage_index.get(x[0].stage, 999), x[0].step_order))

    approvals = []
    for ar, approver in approval_records:
        approvals.append({
            "id": ar.id,
            "stage": ar.stage,
            "step_order": ar.step_order,
            "step_type": ar.step_type,
            "step_name": ar.step_name,
            "approver_id": ar.approver_id,
            "approver_name": approver.name if approver else None,
            "action": ar.action,
            "status": ar.status,
            "comment": ar.comment,
            "acted_at": to_iso_utc(ar.acted_at),
            "created_at": to_iso_utc(ar.created_at),
        })

    stage_logs = []
    for log in (contract.stage_logs or []):
        operator = db.query(User).filter(User.id == log.operator_id).first()
        stage_logs.append({
            "id": log.id,
            "from_stage": log.from_stage,
            "to_stage": log.to_stage,
            "operator_name": operator.name if operator else None,
            "comment": log.comment,
            "created_at": to_iso_utc(log.created_at),
        })

    documents = []
    for doc in (contract.documents or []):
        uploader = db.query(User).filter(User.id == doc.uploader_id).first()
        documents.append({
            "id": doc.id,
            "doc_type": doc.doc_type,
            "filename": doc.filename,
            "file_size": doc.file_size,
            "stage": doc.stage,
            "uploader_name": uploader.name if uploader else None,
            "description": doc.description,
            "version": doc.version,
            "created_at": to_iso_utc(doc.created_at),
        })

    return {
        "id": contract.id,
        "contract_no": contract.contract_no,
        "title": contract.title,
        "contract_type": contract.contract_type,
        "contract_format": contract.contract_format,
        "vendor_id": contract.vendor_id,
        "vendor_name": contract.vendor.name if contract.vendor else None,
        "amount": contract.amount,
        "currency": contract.currency,
        "start_date": str(contract.start_date) if contract.start_date else None,
        "end_date": str(contract.end_date) if contract.end_date else None,
        "description": contract.description,
        "current_stage": contract.current_stage,
        "creator_id": contract.creator_id,
        "creator_name": contract.creator.name if contract.creator else None,
        "requester_dept": contract.requester_dept,
        "project_name": contract.project_name,
        "purchase_request_no": contract.purchase_request_no,
        "purchase_decision_no": contract.purchase_decision_no,
        "roi_required": contract.roi_required,
        "roi_value": contract.roi_value,
        "stamp_copies": contract.stamp_copies,
        "internal_stamp_done": contract.internal_stamp_done,
        "vendor_stamp_done": contract.vendor_stamp_done,
        "ip_notification_required": contract.ip_notification_required,
        "ip_notification_done": contract.ip_notification_done,
        "void_reason": contract.void_reason,
        "created_at": to_iso_utc(contract.created_at),
        "updated_at": to_iso_utc(contract.updated_at),
        "documents": documents,
        "stage_logs": stage_logs,
        "approvals": approvals,
    }


@router.put("/{contract_id}")
def update_contract(
    contract_id: int,
    data: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")
    if contract.current_stage != "draft":
        raise HTTPException(status_code=400, detail="僅草稿階段可編輯合約")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(contract, key, value)
    db.commit()
    db.refresh(contract)
    return {"id": contract.id, "title": contract.title, "current_stage": contract.current_stage}


@router.post("/{contract_id}/advance")
def advance_contract_stage(
    contract_id: int,
    body: StageAdvanceRequest = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")
    comment = body.comment if body else None
    result = advance_stage(db, contract, current_user.id, comment=comment)
    return result


@router.post("/{contract_id}/reject")
def reject_contract(
    contract_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")
    comment = body.get("comment")
    if not comment:
        raise HTTPException(status_code=400, detail="退回原因為必填")
    result = reject_to_previous(db, contract, current_user.id, comment=comment)
    return result


@router.post("/{contract_id}/void")
def void_contract_route(
    contract_id: int,
    body: VoidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")
    result = void_contract(db, contract, current_user.id, reason=body.reason)
    return result


@router.post("/{contract_id}/submit-approval")
def submit_approval(
    contract_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")
    workflow_id = body.get("workflow_id")
    if not workflow_id:
        raise HTTPException(status_code=400, detail="workflow_id 為必填")
    result = submit_for_approval(db, contract, workflow_id, current_user.id)
    return result


@router.post("/{contract_id}/stamp")
def update_stamp(
    contract_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")

    if "internal_stamp_done" in body:
        contract.internal_stamp_done = body["internal_stamp_done"]
    if "vendor_stamp_done" in body:
        contract.vendor_stamp_done = body["vendor_stamp_done"]

    db.commit()
    db.refresh(contract)
    return {"id": contract.id, "internal_stamp_done": contract.internal_stamp_done, "vendor_stamp_done": contract.vendor_stamp_done}


@router.post("/{contract_id}/upload")
async def upload_document(
    contract_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form("other"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="合約不存在")

    saved_path = await save_upload(file, contract_id)

    document = Document(
        contract_id=contract_id,
        doc_type=doc_type,
        filename=file.filename,
        file_path=saved_path,
        file_size=file.size,
        stage=contract.current_stage,
        uploader_id=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return {"id": document.id, "filename": document.filename, "doc_type": document.doc_type}
