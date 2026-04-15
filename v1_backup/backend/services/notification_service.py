from sqlalchemy.orm import Session
from models.notification import Notification

def create_notification(
    db: Session,
    user_id: int,
    contract_id: int | None,
    ntype: str,
    message: str,
):
    notif = Notification(
        user_id=user_id,
        contract_id=contract_id,
        type=ntype,
        message=message,
    )
    db.add(notif)
    db.flush()
    return notif
