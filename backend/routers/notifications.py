from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.notification import Notification
from models.user import User
from middleware.auth import get_current_user
from database import get_db
from utils.datetime_utils import to_iso_utc

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("/")
def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Notification).filter(Notification.user_id == current_user.id)

    if unread_only:
        query = query.filter(Notification.is_read == False)

    notifications = (
        query.order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )

    return [
        {
            "id": n.id,
            "contract_id": n.contract_id,
            "type": n.type,
            "message": n.message,
            "is_read": n.is_read,
            "created_at": to_iso_utc(n.created_at),
        }
        for n in notifications
    ]


@router.post("/{id}/read")
def mark_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .update({"is_read": True})
    )
    db.commit()
    return {"message": f"Marked {count} notifications as read", "count": count}
