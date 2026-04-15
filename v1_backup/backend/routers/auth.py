from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.user import User
from schemas.auth import LoginRequest, TokenResponse, UserProfile
from services.auth_service import verify_password, create_access_token
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/auth", tags=["認證"])

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號已停用")
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)

@router.get("/me", response_model=UserProfile)
def get_me(user: User = Depends(get_current_user)):
    return user
