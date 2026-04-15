from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, Float
from sqlalchemy.sql import func
from database import Base


class Vendor(Base):
    """廠商管理 - 對應流程圖中的廠商評選與管理"""
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False)
    tax_id = Column(String(20))  # 統一編號 / 稅籍登記
    business_reg_no = Column(String(50))  # 商工登記號碼
    contact_name = Column(String(100))  # 廠商聯絡人
    contact_phone = Column(String(50))
    contact_email = Column(String(200))
    address = Column(String(500))  # 廠商名稱/地址
    category = Column(String(100))  # 廠商類別
    tax_registered = Column(Boolean, default=False)  # 稅籍登記完成
    business_registered = Column(Boolean, default=False)  # 商工登記完成
    bank_account = Column(String(200))  # 匯款帳戶
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class VendorEvaluation(Base):
    """廠商評選 - 對應流程圖前置流程中的初選/決選"""
    __tablename__ = "vendor_evaluations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, nullable=False)  # 關聯合約
    vendor_id = Column(Integer, nullable=False)
    eval_type = Column(String(20))  # preliminary(初選), final(決選)
    score = Column(Float)  # 評分
    evaluator_id = Column(Integer)  # 評分人
    criteria = Column(Text)  # 評選條件 JSON
    notes = Column(Text)  # 備註(含產品設計資料、解決方案、現場簡報Q&A)
    result = Column(String(20))  # pass, fail, selected
    created_at = Column(DateTime, server_default=func.now())
