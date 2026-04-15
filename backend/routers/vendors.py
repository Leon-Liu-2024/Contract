from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from database import get_db
from models.vendor import Vendor
from models.user import User
from schemas.vendor import VendorCreate, VendorUpdate
from middleware.auth import get_current_user

router = APIRouter(prefix="/api/vendors", tags=["廠商管理"])


@router.get("/")
def list_vendors(
    search: Optional[str] = Query(None, description="搜尋廠商名稱或統編"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Vendor).filter(Vendor.is_active == True)
    if search:
        query = query.filter(
            (Vendor.name.ilike(f"%{search}%")) | (Vendor.tax_id.ilike(f"%{search}%"))
        )
    return query.all()


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_vendor(
    data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = Vendor(**data.model_dump())
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/{vendor_id}")
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.is_active == True).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="廠商不存在")
    return vendor


@router.put("/{vendor_id}")
def update_vendor(
    vendor_id: int,
    data: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.is_active == True).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="廠商不存在")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(vendor, key, value)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id, Vendor.is_active == True).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="廠商不存在")
    vendor.is_active = False
    db.commit()
