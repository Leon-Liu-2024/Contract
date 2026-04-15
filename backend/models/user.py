from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Date
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(200), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
    department = Column(String(100))  # 需求單位, 總務, 法務, PMO, 財務
    role = Column(String(50), default="user")  # admin, manager, legal, pmo, user
    title = Column(String(100))  # 職稱: 部長, 主管, 專員
    is_active = Column(Boolean, default=True)
    deputy_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    deputy_start = Column(Date, nullable=True)
    deputy_end = Column(Date, nullable=True)
