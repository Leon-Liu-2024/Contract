from pydantic import BaseModel


class ApprovalAction(BaseModel):
    comment: str | None = None


class BatchApproveRequest(BaseModel):
    record_ids: list[int]
    comment: str | None = None
