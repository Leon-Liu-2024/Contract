from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from middleware.auth import get_current_user, require_role
from services.auth_service import hash_password

router = APIRouter(prefix="/api/users", tags=["使用者"])


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    department: str | None = None
    role: str = "user"


class UserUpdate(BaseModel):
    name: str | None = None
    department: str | None = None
    role: str | None = None
    is_active: bool | None = None
    deputy_id: int | None = None
    deputy_start: str | None = None
    deputy_end: str | None = None


@router.get("/")
def list_users(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    users = db.query(User).filter(User.is_active == True).all()
    return [
        {
            "id": u.id, "name": u.name, "email": u.email,
            "department": u.department, "role": u.role, "is_active": u.is_active,
        }
        for u in users
    ]


@router.post("/", status_code=201)
def create_user(
    req: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(400, "Email 已存在")

    new_user = User(
        name=req.name, email=req.email,
        password_hash=hash_password(req.password),
        department=req.department, role=req.role,
    )
    db.add(new_user)
    db.commit()
    return {"id": new_user.id, "name": new_user.name}


@router.put("/{user_id}")
def update_user(
    user_id: int, req: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role("admin")),
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(404, "使用者不存在")

    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(target, field, value)
    db.commit()
    return {"success": True}
