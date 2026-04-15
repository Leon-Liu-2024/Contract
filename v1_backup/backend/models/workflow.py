from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    contract_type = Column(String, nullable=True)  # 適用合約類型
    amount_min = Column(Float, nullable=True)
    amount_max = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

    steps = relationship("WorkflowStep", back_populates="workflow",
                         cascade="all, delete-orphan", order_by="WorkflowStep.step_order")

class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id", ondelete="CASCADE"))
    step_order = Column(Integer, nullable=False)
    step_type = Column(String, default="sequential")  # sequential | countersign
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    approver_role = Column(String, nullable=True)  # 以角色動態指定

    workflow = relationship("Workflow", back_populates="steps")
    approver = relationship("User", foreign_keys=[approver_id])
