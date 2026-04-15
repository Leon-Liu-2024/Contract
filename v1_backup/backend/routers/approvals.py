from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.contract import Contract
from models.approval import ApprovalRecord
from schemas.approval import SubmitRequest, ApprovalAction, BatchApproveRequest
from middleware.auth import get_current_user
from services.approval_engine import (
    submit_contract, advance_contract, batch_approve, remind_approver
)

router = APIRouter(prefix="/api/approvals", tags=["簽核"])


@router.get("/pending")
def get_pending(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """待我簽核清單"""
    records = db.query(ApprovalRecord).filter(
        ApprovalRecord.approver_id == user.id,
        ApprovalRecord.status == "pending",
    ).all()

    items = []
    for rec in records:
        contract = db.get(Contract, rec.contract_id)
        if not contract:
            continue
        creator = db.get(User, contract.creator_id)
        total_steps = db.query(ApprovalRecord).filter(
            ApprovalRecord.contract_id == contract.id
        ).count()
        items.append({
            "record_id": rec.id, "contract_id": contract.id,
            "contract_no": contract.contract_no, "title": contract.title,
            "counterparty": contract.counterparty, "amount": contract.amount,
            "contract_type": contract.contract_type,
            "step_order": rec.step_order, "step_type": rec.step_type,
            "total_steps": total_steps,
            "creator_name": creator.name if creator else None,
            "created_at": contract.created_at.isoformat() if contract.created_at else None,
        })

    return items


@router.post("/{contract_id}/submit")
def submit(
    contract_id: int, req: SubmitRequest,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    try:
        contract = submit_contract(db, contract_id, req.workflow_id, user.id)
        db.commit()
        return {"success": True, "status": contract.status}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{contract_id}/approve")
def approve(
    contract_id: int, req: ApprovalAction,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    try:
        contract = advance_contract(db, contract_id, "approved", user.id, req.comment)
        db.commit()
        return {"success": True, "status": contract.status}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/{contract_id}/reject")
def reject(
    contract_id: int, req: ApprovalAction,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    if not req.comment:
        raise HTTPException(400, "退回須填寫原因")
    try:
        contract = advance_contract(db, contract_id, "rejected", user.id, req.comment)
        db.commit()
        return {"success": True, "status": contract.status}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/batch-approve")
def batch(
    req: BatchApproveRequest,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    results = batch_approve(db, req.contract_ids, user.id, req.comment)
    db.commit()
    return results


@router.post("/{contract_id}/remind")
def remind(
    contract_id: int,
    db: Session = Depends(get_db), user: User = Depends(get_current_user),
):
    try:
        result = remind_approver(db, contract_id, user.id)
        db.commit()
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
