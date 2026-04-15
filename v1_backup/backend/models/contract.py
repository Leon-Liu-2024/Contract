from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_no = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    counterparty = Column(String)
    amount = Column(Float, nullable=True)
    contract_type = Column(String)  # purchase | nda | service | other
    start_date = Column(Date)
    end_date = Column(Date)
    status = Column(String, default="draft")  # draft | pending | approved | rejected | void
    creator_id = Column(Integer, ForeignKey("users.id"))
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=True)
    current_step = Column(Integer, default=0)
    void_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    creator = relationship("User", foreign_keys=[creator_id])
    attachments = relationship("ContractAttachment", back_populates="contract", cascade="all, delete-orphan")
    approval_records = relationship("ApprovalRecord", back_populates="contract", cascade="all, delete-orphan")

class ContractAttachment(Base):
    __tablename__ = "contract_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"))
    filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, server_default=func.now())

    contract = relationship("Contract", back_populates="attachments")
