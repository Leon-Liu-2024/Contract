from pydantic import BaseModel
from datetime import datetime

class SubmitRequest(BaseModel):
    workflow_id: int

class ApprovalAction(BaseModel):
    comment: str | None = None

class BatchApproveRequest(BaseModel):
    contract_ids: list[int]
    comment: str | None = None

class ApprovalRecordResponse(BaseModel):
    id: int
    contract_id: int
    step_order: int | None
    step_type: str | None
    approver_id: int
    approver_name: str | None = None
    action: str | None
    comment: str | None
    status: str
    acted_at: datetime | None
    created_at: datetime | None

    class Config:
        from_attributes = True
