from pydantic import BaseModel


class VendorCreate(BaseModel):
    name: str
    tax_id: str | None = None
    business_reg_no: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    address: str | None = None
    category: str | None = None
    notes: str | None = None


class VendorUpdate(VendorCreate):
    name: str | None = None
    tax_registered: bool | None = None
    business_registered: bool | None = None
    bank_account: str | None = None
