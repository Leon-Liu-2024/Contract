from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from middleware.auth import get_current_user, require_role
from services.auth_service import hash_password

router = APIRouter(prefix="/api/users", tags=["使用者管理"])


@router.get("/", dependencies=[Depends(require_role("admin", "pmo"))])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    users = db.query(User).all()
    return [
        {
            "id": u.id, "name": u.name, "email": u.email,
            "department": u.department, "role": u.role, "title": u.title,
            "is_active": u.is_active,
        }
        for u in users
    ]


@router.post("/", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_role("admin"))])
def create_user(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.get("email") or not data.get("password"):
        raise HTTPException(status_code=400, detail="email 和 password 為必填")

    existing = db.query(User).filter(User.email == data["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="此 email 已存在")

    password_raw = data.pop("password")
    user = User(
        **data,
        password_hash=hash_password(password_raw),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role}


@router.put("/{user_id}", dependencies=[Depends(require_role("admin"))])
def update_user(
    user_id: int,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="使用者不存在")

    allowed_fields = {
        "name", "department", "role", "title",
        "deputy_id", "deputy_start", "deputy_end", "is_active",
    }

    for key, value in data.items():
        if key in allowed_fields:
            setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return {"id": user.id, "name": user.name, "email": user.email, "role": user.role, "department": user.department}
