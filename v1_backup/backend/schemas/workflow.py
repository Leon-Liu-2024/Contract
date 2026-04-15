from pydantic import BaseModel

class WorkflowStepCreate(BaseModel):
    step_order: int
    step_type: str = "sequential"  # sequential | countersign
    approver_id: int | None = None
    approver_role: str | None = None

class WorkflowCreate(BaseModel):
    name: str
    contract_type: str | None = None
    amount_min: float | None = None
    amount_max: float | None = None
    steps: list[WorkflowStepCreate]

class WorkflowStepResponse(BaseModel):
    id: int
    step_order: int
    step_type: str
    approver_id: int | None
    approver_role: str | None
    approver_name: str | None = None

    class Config:
        from_attributes = True

class WorkflowResponse(BaseModel):
    id: int
    name: str
    contract_type: str | None
    amount_min: float | None
    amount_max: float | None
    is_active: bool
    steps: list[WorkflowStepResponse] = []

    class Config:
        from_attributes = True
