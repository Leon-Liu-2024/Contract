from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# 合約作業流程 10 階段（對應流程圖主軸紅色箭頭）
CONTRACT_STAGES = {
    "prerequisite":     {"order": 0, "label": "前置作業", "desc": "需求條件規劃、廠商初選/決選"},
    "draft":            {"order": 1, "label": "起始作業", "desc": "合約起草與基本資料建立"},
    "approval_memo":    {"order": 2, "label": "簽呈", "desc": "簽呈(費用動支)提交"},
    "purchase_request": {"order": 3, "label": "請購單", "desc": "請購單建立與核准"},
    "purchase_decision":{"order": 4, "label": "決購建議表簽核", "desc": "決購建議表簽核"},
    "contract_review":  {"order": 5, "label": "非制式合約會辦單", "desc": "法務審查與合約會辦"},
    "stamping":         {"order": 6, "label": "合約用印", "desc": "兩式合約安裝內頁用印"},
    "vendor_stamping":  {"order": 7, "label": "寄送廠商用印", "desc": "兩式用印合約寄送廠商用印"},
    "signing_complete": {"order": 8, "label": "收件簽約完成", "desc": "收件合約一式簽約完成"},
    "archived":         {"order": 9, "label": "合約入檔", "desc": "合約歸檔"},
    "acceptance":       {"order": 10, "label": "依合約驗收請款", "desc": "依合約驗收請款"},
    "void":             {"order": -1, "label": "已作廢", "desc": "合約作廢"},
}

# 合約類別（對應流程圖底部）
CONTRACT_TYPES = {
    "main_hourly": "主約(工時版)",
    "supplemental": "補充合約",
    "hourly": "工時合約",
    "maintenance": "維護合約",
    "purchase": "採購合約",
    "nda": "保密協議(NDA)",
    "service": "勞務合約",
    "other": "其他",
    # ibon 制式合約類別
    "ibon_main_a":        "ibon服務交易 主約A（一般）",
    "ibon_main_a1":       "ibon服務交易 主約A1（第三方金流）",
    "ibon_main_b":        "ibon服務交易 主約B（票券）",
    "ibon_main_b1":       "ibon服務交易 主約B1（票券非連線）",
    "ibon_main_c":        "ibon服務交易 主約C（紅利）",
    "ibon_main_e":        "ibon服務交易 主約E（好康）",
    "ibon_agr_a1":        "ibon服務交易 協議書a1（一般）",
    "ibon_agr_a2":        "ibon服務交易 協議書a2（列印）",
    "ibon_agr_b1":        "ibon服務交易 協議書b1（票券連線）",
    "ibon_agr_b2":        "ibon服務交易 協議書b2（電影票）",
    "ibon_agr_b3":        "ibon服務交易 協議書b3（演唱會保證）",
    "ibon_agr_c":         "ibon服務交易 協議書c（紅利）",
    "ibon_agr_e":         "ibon服務交易 協議書e（好康）",
    "ibon_agr_e_igift":   "ibon服務交易 協議書e（好康 i禮贈）",
    "ibon_ticket_main":   "ibon售票平台 主約（E票券）",
    "ibon_ticket_guarantee": "ibon售票平台 主約（E票券保證）",
    "ibon_izan_main":     "i禮讚平台 主約",
    "ibon_social_memo":   "社群合作備忘錄",
    "ibon_payment_main":  "繳費通服務交易 主約",
    "ibon_payment_agr":   "繳費通服務交易 協議書",
}

# ibon 制式合約 contract_format 標記
IBON_CONTRACT_TYPES = {k for k in CONTRACT_TYPES if k.startswith("ibon_")}


class Contract(Base):
    __tablename__ = "contracts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_no = Column(String(50), unique=True, nullable=False)
    title = Column(String(500), nullable=False)

    # 合約基本資訊
    contract_type = Column(String(50), default="other")  # CONTRACT_TYPES key
    contract_format = Column(String(20), default="non_standard")  # standard(制式), non_standard(非制式)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True)
    amount = Column(Float, nullable=True)
    currency = Column(String(10), default="TWD")
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    description = Column(Text)

    # 流程狀態
    current_stage = Column(String(50), default="draft")  # CONTRACT_STAGES key
    previous_stage = Column(String(50), nullable=True)

    # 相關人員
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    requester_dept = Column(String(100))  # 需求單位
    project_name = Column(String(200))  # 專案名稱

    # 請購相關
    purchase_request_no = Column(String(50))  # 請購單號
    purchase_decision_no = Column(String(50))  # 決購建議表號

    # ROI 相關
    roi_required = Column(Boolean, default=False)  # 是否需要 ROI
    roi_value = Column(Float, nullable=True)  # 投資報酬率
    roi_years = Column(Integer, nullable=True)  # 攤提年數
    is_capital_expense = Column(Boolean, default=False)  # 是否為資本支出

    # 用印相關
    stamp_copies = Column(Integer, default=2)  # 合約份數（二式/三式）
    internal_stamp_done = Column(Boolean, default=False)  # 內部用印完成
    vendor_stamp_done = Column(Boolean, default=False)  # 廠商用印完成
    stamp_received_date = Column(Date, nullable=True)  # 收件日期

    # 智財相關
    ip_notification_required = Column(Boolean, default=False)  # 需要智財授權通報
    ip_notification_done = Column(Boolean, default=False)  # 智財通報完成
    ip_approval_done = Column(Boolean, default=False)  # 法務同意 Mail

    # 合約歸檔
    archive_location = Column(String(200))  # 歸檔位置
    void_reason = Column(Text, nullable=True)

    # 時間戳
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    vendor = relationship("Vendor", lazy="selectin")
    creator = relationship("User", lazy="selectin", foreign_keys=[creator_id])
    documents = relationship("Document", back_populates="contract", lazy="selectin")
    stage_logs = relationship("ContractStageLog", back_populates="contract", lazy="selectin",
                              order_by="ContractStageLog.created_at")


class ContractStageLog(Base):
    """合約階段變更紀錄"""
    __tablename__ = "contract_stage_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    from_stage = Column(String(50))
    to_stage = Column(String(50), nullable=False)
    operator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    contract = relationship("Contract", back_populates="stage_logs")
