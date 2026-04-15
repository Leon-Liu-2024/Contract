from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    id: int
    name: str
    email: str
    department: str | None
    role: str
    title: str | None
    is_active: bool

    class Config:
        from_attributes = True
