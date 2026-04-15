from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.approval import ApprovalRecord
from models.contract import Contract, CONTRACT_STAGES
from models.user import User
from schemas.approval import ApprovalAction, BatchApproveRequest
from middleware.auth import get_current_user
from services.contract_engine import process_approval
from database import get_db
from utils.datetime_utils import to_iso_utc

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


@router.get("/pending")
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = (
        db.query(ApprovalRecord, Contract, User)
        .join(Contract, ApprovalRecord.contract_id == Contract.id)
        .outerjoin(User, Contract.creator_id == User.id)
        .filter(
            ApprovalRecord.approver_id == current_user.id,
            ApprovalRecord.status == "pending",
        )
        .all()
    )
    result = []
    for record, contract, creator in records:
        stage_info = CONTRACT_STAGES.get(contract.current_stage, {})
        result.append(
            {
                "record_id": record.id,
                "contract_id": contract.id,
                "contract_no": contract.contract_no,
                "title": contract.title,
                "amount": contract.amount,
                "current_stage": contract.current_stage,
                "stage_label": stage_info.get("label", contract.current_stage) if isinstance(stage_info, dict) else contract.current_stage,
                "step_order": record.step_order,
                "step_name": record.step_name,
                "creator_name": creator.name if creator else None,
                "created_at": to_iso_utc(record.created_at),
            }
        )
    return result


@router.post("/{record_id}/approve")
def approve_record(
    record_id: int,
    body: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = db.query(ApprovalRecord).filter(ApprovalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Approval record not found")
    if record.approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to approve this record")
    if record.status != "pending":
        raise HTTPException(status_code=400, detail="Record is not pending")

    result = process_approval(db, record, "approved", comment=body.comment)
    return {"message": "Approved successfully", "result": result}


@router.post("/{record_id}/reject")
def reject_record(
    record_id: int,
    body: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.comment:
        raise HTTPException(status_code=400, detail="Comment is required when rejecting")

    record = db.query(ApprovalRecord).filter(ApprovalRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Approval record not found")
    if record.approver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to reject this record")
    if record.status != "pending":
        raise HTTPException(status_code=400, detail="Record is not pending")

    result = process_approval(db, record, "rejected", comment=body.comment)
    return {"message": "Rejected successfully", "result": result}


@router.post("/batch-approve")
def batch_approve(
    body: BatchApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    results = []
    errors = []
    for record_id in body.record_ids:
        try:
            record = db.query(ApprovalRecord).filter(ApprovalRecord.id == record_id).first()
            if not record:
                errors.append({"record_id": record_id, "error": "Not found"})
                continue
            if record.approver_id != current_user.id:
                errors.append({"record_id": record_id, "error": "Not authorized"})
                continue
            if record.status != "pending":
                errors.append({"record_id": record_id, "error": "Not pending"})
                continue

            result = process_approval(db, record, "approved", comment=body.comment)
            results.append({"record_id": record_id, "status": "approved"})
        except Exception as e:
            errors.append({"record_id": record_id, "error": str(e)})

    return {"approved": results, "errors": errors}
