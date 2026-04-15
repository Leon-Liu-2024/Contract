from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class ApprovalRecord(Base):
    __tablename__ = "approval_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"))
    step_id = Column(Integer, ForeignKey("workflow_steps.id"), nullable=True)
    step_order = Column(Integer)
    step_type = Column(String, default="sequential")
    approver_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String, nullable=True)  # approved | rejected | delegated
    comment = Column(Text, nullable=True)
    status = Column(String, default="pending")  # pending | waiting | approved | rejected
    acted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    contract = relationship("Contract", back_populates="approval_records")
    approver = relationship("User", foreign_keys=[approver_id])
    step = relationship("WorkflowStep", foreign_keys=[step_id])
