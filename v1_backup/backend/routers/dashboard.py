import io
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from models.contract import Contract
from models.approval import ApprovalRecord
from models.notification import Notification
from middleware.auth import get_current_user, require_role

router = APIRouter(prefix="/api/dashboard", tags=["儀表板"])


@router.get("/stats")
def personal_stats(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pending = db.query(ApprovalRecord).filter(
        ApprovalRecord.approver_id == user.id, ApprovalRecord.status == "pending"
    ).count()

    in_progress = db.query(Contract).filter(
        Contract.creator_id == user.id, Contract.status == "pending"
    ).count()

    month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0)
    completed = db.query(Contract).filter(
        Contract.creator_id == user.id,
        Contract.status == "approved",
        Contract.updated_at >= month_start,
    ).count()

    rejected = db.query(Contract).filter(
        Contract.creator_id == user.id, Contract.status == "rejected"
    ).count()

    unread = db.query(Notification).filter(
        Notification.user_id == user.id, Notification.is_read == False
    ).count()

    return {
        "pending_approvals": pending,
        "in_progress": in_progress,
        "completed_this_month": completed,
        "rejected": rejected,
        "unread_notifications": unread,
    }


@router.get("/recent-activity")
def recent_activity(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    records = (
        db.query(ApprovalRecord)
        .filter(ApprovalRecord.acted_at != None)
        .order_by(ApprovalRecord.acted_at.desc())
        .limit(10)
        .all()
    )
    items = []
    for r in records:
        contract = db.get(Contract, r.contract_id)
        approver = db.get(User, r.approver_id)
        items.append({
            "contract_no": contract.contract_no if contract else None,
            "title": contract.title if contract else None,
            "approver_name": approver.name if approver else None,
            "action": r.action,
            "comment": r.comment,
            "acted_at": r.acted_at.isoformat() if r.acted_at else None,
        })
    return items


@router.get("/admin/stats")
def admin_stats(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    # 各部門合約數
    dept_stats = (
        db.query(User.department, func.count(Contract.id))
        .join(Contract, Contract.creator_id == User.id)
        .group_by(User.department)
        .all()
    )

    # 各狀態數
    status_stats = (
        db.query(Contract.status, func.count(Contract.id))
        .group_by(Contract.status)
        .all()
    )

    # 平均簽核時長（小時）
    approved = (
        db.query(ApprovalRecord)
        .filter(ApprovalRecord.action == "approved", ApprovalRecord.acted_at != None)
        .all()
    )
    durations = []
    for r in approved:
        if r.acted_at and r.created_at:
            d = (r.acted_at - r.created_at).total_seconds() / 3600
            durations.append(d)
    avg_hours = round(sum(durations) / len(durations), 1) if durations else 0

    return {
        "department_stats": [{"department": d, "count": c} for d, c in dept_stats],
        "status_stats": {s: c for s, c in status_stats},
        "avg_approval_hours": avg_hours,
        "total_contracts": db.query(Contract).count(),
    }


@router.get("/admin/export")
def export_excel(
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = "合約清單"
    ws.append(["合約編號", "標題", "對象", "金額", "類型", "狀態", "建立人", "建立日期"])

    contracts = db.query(Contract).order_by(Contract.created_at.desc()).all()
    for c in contracts:
        creator = db.get(User, c.creator_id)
        ws.append([
            c.contract_no, c.title, c.counterparty, c.amount,
            c.contract_type, c.status,
            creator.name if creator else "", str(c.created_at or ""),
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=contracts_export.xlsx"},
    )


@router.get("/admin/overdue")
def overdue_contracts(
    days: int = 3,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    """逾期未簽核合約清單"""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    overdue = (
        db.query(ApprovalRecord)
        .filter(ApprovalRecord.status == "pending", ApprovalRecord.created_at < cutoff)
        .all()
    )
    items = []
    for r in overdue:
        contract = db.get(Contract, r.contract_id)
        approver = db.get(User, r.approver_id)
        items.append({
            "contract_id": r.contract_id,
            "contract_no": contract.contract_no if contract else None,
            "title": contract.title if contract else None,
            "approver_name": approver.name if approver else None,
            "pending_since": r.created_at.isoformat() if r.created_at else None,
        })
    return items
