from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class ApprovalRecord(Base):
    """簽核紀錄 - 對應流程圖中各階段的簽核動作"""
    __tablename__ = "approval_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    stage = Column(String(50), nullable=False)  # 所屬合約階段
    workflow_id = Column(Integer, nullable=True)
    step_id = Column(Integer, nullable=True)
    step_order = Column(Integer)
    step_type = Column(String(20), default="sequential")
    step_name = Column(String(100))
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(20))  # approved, rejected, delegated
    status = Column(String(20), default="pending")  # pending, waiting, approved, rejected
    comment = Column(Text)
    acted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
