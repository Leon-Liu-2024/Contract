from pydantic import BaseModel
from datetime import date, datetime

class ContractCreate(BaseModel):
    title: str
    counterparty: str | None = None
    amount: float | None = None
    contract_type: str = "other"
    start_date: date | None = None
    end_date: date | None = None

class ContractUpdate(BaseModel):
    title: str | None = None
    counterparty: str | None = None
    amount: float | None = None
    contract_type: str | None = None
    start_date: date | None = None
    end_date: date | None = None

class ContractResponse(BaseModel):
    id: int
    contract_no: str
    title: str
    counterparty: str | None
    amount: float | None
    contract_type: str | None
    start_date: date | None
    end_date: date | None
    status: str
    creator_id: int
    creator_name: str | None = None
    current_step: int
    workflow_id: int | None
    void_reason: str | None
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True

class ContractListItem(BaseModel):
    id: int
    contract_no: str
    title: str
    counterparty: str | None
    amount: float | None
    contract_type: str | None
    status: str
    creator_name: str | None = None
    current_approver_name: str | None = None
    updated_at: datetime | None

    class Config:
        from_attributes = True

class VoidRequest(BaseModel):
    reason: str
