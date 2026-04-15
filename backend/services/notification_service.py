from sqlalchemy.orm import Session
from models.notification import Notification


def create_notification(db: Session, user_id: int, contract_id: int | None, type: str, message: str):
    n = Notification(user_id=user_id, contract_id=contract_id, type=type, message=message)
    db.add(n)
    db.commit()
    return n
