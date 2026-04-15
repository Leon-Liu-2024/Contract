from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Workflow(Base):
    """簽核流程範本"""
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    stage = Column(String(50), nullable=False)  # 適用的合約階段
    contract_type = Column(String(50), nullable=True)  # 適用的合約類別
    amount_min = Column(Float, nullable=True)
    amount_max = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer)

    steps = relationship("WorkflowStep", back_populates="workflow", lazy="selectin",
                         order_by="WorkflowStep.step_order")


class WorkflowStep(Base):
    __tablename__ = "workflow_steps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    step_order = Column(Integer, nullable=False)
    step_type = Column(String(20), default="sequential")  # sequential, countersign
    approver_id = Column(Integer, nullable=True)
    approver_role = Column(String(50), nullable=True)  # 依角色動態指派
    step_name = Column(String(100))  # 步驟名稱（如：部門主管, 法務, PMO）

    workflow = relationship("Workflow", back_populates="steps")
