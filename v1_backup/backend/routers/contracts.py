from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.contract import Contract, ContractAttachment
from schemas.contract import ContractCreate, ContractUpdate, ContractResponse, VoidRequest
from middleware.auth import get_current_user
from services.file_service import save_upload, get_file_path

router = APIRouter(prefix="/api/contracts", tags=["合約"])


def _generate_contract_no(db: Session, contract_type: str) -> str:
    prefix_map = {"purchase": "PUR", "nda": "NDA", "service": "SVC", "sales": "SAL"}
    prefix = prefix_map.get(contract_type, "CTR")
    now = datetime.now()
    ym = now.strftime("%Y%m%d")
    count = db.query(Contract).filter(Contract.contract_no.like(f"{prefix}-{ym}-%")).count()
    return f"{prefix}-{ym}-{str(count + 1).zfill(3)}"


@router.get("/")
def list_contracts(
    status: str | None = None,
    keyword: str | None = None,
    contract_type: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Contract)

    # 可見範圍控制
    if user.role == "user":
        q = q.filter(Contract.creator_id == user.id)
    elif user.role == "manager":
        dept_users = db.query(User.id).filter(User.department == user.department)
        q = q.filter(Contract.creator_id.in_(dept_users))
    # admin 可見全部

    if status:
        q = q.filter(Contract.status == status)
    if contract_type:
        q = q.filter(Contract.contract_type == contract_type)
    if keyword:
        like = f"%{keyword}%"
        q = q.filter(
            (Contract.title.like(like))
            | (Contract.contract_no.like(like))
            | (Contract.counterparty.like(like))
        )

    total = q.count()
    items = (
        q.order_by(Contract.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    data = []
    for c in items:
        creator = db.get(User, c.creator_id)
        data.append({
            "id": c.id, "contract_no": c.contract_no, "title": c.title,
            "counterparty": c.counterparty, "amount": c.amount,
            "contract_type": c.contract_type, "status": c.status,
            "creator_name": creator.name if creator else None,
            "current_step": c.current_step,
            "start_date": str(c.start_date) if c.start_date else None,
            "end_date": str(c.end_date) if c.end_date else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        })

    return {"data": data, "total": total, "page": page, "page_size": page_size}


@router.post("/", status_code=201)
def create_contract(
    req: ContractCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contract = Contract(
        contract_no=_generate_contract_no(db, req.contract_type),
        title=req.title,
        counterparty=req.counterparty,
        amount=req.amount,
        contract_type=req.contract_type,
        start_date=req.start_date,
        end_date=req.end_date,
        status="draft",
        creator_id=user.id,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)
    return {"id": contract.id, "contract_no": contract.contract_no}


@router.get("/{contract_id}")
def get_contract(contract_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    contract = db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "合約不存在")

    creator = db.get(User, contract.creator_id)
    attachments = [
        {"id": a.id, "filename": a.filename, "file_size": a.file_size, "uploaded_at": a.uploaded_at.isoformat() if a.uploaded_at else None}
        for a in contract.attachments
    ]
    approvals = []
    for rec in sorted(contract.approval_records, key=lambda r: r.step_order or 0):
        approver = db.get(User, rec.approver_id)
        approvals.append({
            "id": rec.id, "step_order": rec.step_order, "step_type": rec.step_type,
            "approver_id": rec.approver_id, "approver_name": approver.name if approver else None,
            "action": rec.action, "comment": rec.comment, "status": rec.status,
            "acted_at": rec.acted_at.isoformat() if rec.acted_at else None,
        })

    return {
        "id": contract.id, "contract_no": contract.contract_no, "title": contract.title,
        "counterparty": contract.counterparty, "amount": contract.amount,
        "contract_type": contract.contract_type, "status": contract.status,
        "start_date": str(contract.start_date) if contract.start_date else None,
        "end_date": str(contract.end_date) if contract.end_date else None,
        "creator_id": contract.creator_id, "creator_name": creator.name if creator else None,
        "current_step": contract.current_step, "workflow_id": contract.workflow_id,
        "void_reason": contract.void_reason,
        "created_at": contract.created_at.isoformat() if contract.created_at else None,
        "updated_at": contract.updated_at.isoformat() if contract.updated_at else None,
        "attachments": attachments,
        "approval_records": approvals,
    }


@router.put("/{contract_id}")
def update_contract(
    contract_id: int, req: ContractUpdate,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    contract = db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "合約不存在")
    if contract.status not in ("draft", "rejected"):
        raise HTTPException(403, "僅草稿或退回狀態可編輯")
    if contract.creator_id != user.id and user.role != "admin":
        raise HTTPException(403, "僅建立者或管理員可編輯")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    contract.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True}


@router.post("/{contract_id}/void")
def void_contract(
    contract_id: int, req: VoidRequest,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    contract = db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "合約不存在")
    if user.role not in ("admin", "manager"):
        raise HTTPException(403, "僅管理員或主管可作廢合約")

    contract.status = "void"
    contract.void_reason = req.reason
    contract.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True}


@router.post("/{contract_id}/attachments")
async def upload_attachment(
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    contract = db.get(Contract, contract_id)
    if not contract:
        raise HTTPException(404, "合約不存在")

    try:
        info = await save_upload(file, contract_id)
    except ValueError as e:
        raise HTTPException(400, str(e))

    att = ContractAttachment(
        contract_id=contract_id,
        filename=info["filename"],
        stored_path=info["stored_path"],
        file_size=info["file_size"],
    )
    db.add(att)
    db.commit()
    return {"id": att.id, "filename": att.filename, "file_size": att.file_size}


@router.get("/{contract_id}/attachments/{file_id}")
def download_attachment(
    contract_id: int, file_id: int,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    att = db.query(ContractAttachment).filter(
        ContractAttachment.id == file_id,
        ContractAttachment.contract_id == contract_id,
    ).first()
    if not att:
        raise HTTPException(404, "附件不存在")

    path = get_file_path(att.stored_path)
    if not path:
        raise HTTPException(404, "檔案遺失")
    return FileResponse(path, filename=att.filename)
