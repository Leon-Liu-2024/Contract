from pydantic import BaseModel


class WorkflowStepCreate(BaseModel):
    step_order: int
    step_type: str = "sequential"
    approver_id: int | None = None
    approver_role: str | None = None
    step_name: str | None = None


class WorkflowCreate(BaseModel):
    name: str
    stage: str
    contract_type: str | None = None
    amount_min: float | None = None
    amount_max: float | None = None
    steps: list[WorkflowStepCreate] = []
