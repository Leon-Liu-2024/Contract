from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# 文件類型（對應流程圖中各種文件）
DOC_TYPES = {
    "rfp": "需求建議書(RFP)",
    "pep": "專案執行計畫書(PEP)",
    "approval_memo": "簽呈",
    "expense_memo": "簽呈(費用動支)",
    "purchase_request": "請購單",
    "purchase_decision": "決購建議表",
    "vendor_quote": "廠商取價單/報價單",
    "eval_preliminary": "評分表(初選)",
    "eval_final": "評分表(決選)",
    "roi_report": "投資報酬率(ROI)",
    "contract_review_form": "非制式合約會辦單",
    "contract_draft": "合約書草稿",
    "contract_final": "合約書定稿",
    "legal_stamp_form": "合約法務核章送用印",
    "ip_checklist": "智財權逐取清冊(EXCEL)",
    "ip_notification": "智財權通報",
    "legal_approval_mail": "法務同意Mail",
    "vendor_registration": "商工登記公示資料",
    "envelope_cover": "信封封面",
    "acceptance_report": "驗收報告",
    "invoice": "請款單/發票",
    "attachment": "其他附件",
}


class Document(Base):
    """文件管理 - 對應流程圖中各階段的文件"""
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    doc_type = Column(String(50), nullable=False)  # DOC_TYPES key
    filename = Column(String(500), nullable=False)
    file_path = Column(String(1000))
    file_size = Column(Integer)
    stage = Column(String(50))  # 在哪個階段上傳的
    uploader_id = Column(Integer, ForeignKey("users.id"))
    description = Column(Text)
    version = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=func.now())

    contract = relationship("Contract", back_populates="documents")
