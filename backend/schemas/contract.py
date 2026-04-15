from pydantic import BaseModel
from datetime import date


class ContractCreate(BaseModel):
    title: str
    contract_type: str = "other"
    contract_format: str = "non_standard"
    vendor_id: int | None = None
    amount: float | None = None
    currency: str = "TWD"
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None
    requester_dept: str | None = None
    project_name: str | None = None
    roi_required: bool = False
    ip_notification_required: bool = False
    stamp_copies: int = 2


class ContractUpdate(BaseModel):
    title: str | None = None
    contract_type: str | None = None
    contract_format: str | None = None
    vendor_id: int | None = None
    amount: float | None = None
    start_date: date | None = None
    end_date: date | None = None
    description: str | None = None
    requester_dept: str | None = None
    project_name: str | None = None
    purchase_request_no: str | None = None
    purchase_decision_no: str | None = None
    roi_required: bool | None = None
    roi_value: float | None = None
    roi_years: int | None = None
    is_capital_expense: bool | None = None
    stamp_copies: int | None = None
    ip_notification_required: bool | None = None
    archive_location: str | None = None


class StageAdvanceRequest(BaseModel):
    comment: str | None = None
    action: str = "advance"  # advance, reject, void


class VoidRequest(BaseModel):
    reason: str
