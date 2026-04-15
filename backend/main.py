from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db

app = FastAPI(title="合約簽核管理系統 V2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "合約簽核管理系統 API v2.0 - 完整合約作業流程"}


@app.on_event("startup")
def startup():
    init_db()
    _seed_data()


def _seed_data():
    """初始化種子資料"""
    from database import SessionLocal
    from models.user import User
    from models.vendor import Vendor
    from models.workflow import Workflow, WorkflowStep
    from services.auth_service import hash_password

    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        pwd = hash_password("pass1234")

        # === 使用者（對應流程圖中的負責窗口） ===
        users = [
            User(name="系統管理員", email="admin@company.com", password_hash=pwd,
                 department="資訊部", role="admin", title="系統管理員"),
            User(name="林育良", email="lin@company.com", password_hash=pwd,
                 department="法務部", role="legal", title="法務主管"),
            User(name="沈翌廷", email="shen@company.com", password_hash=pwd,
                 department="法務部", role="legal", title="合約法務"),
            User(name="Alvin", email="alvin@company.com", password_hash=pwd,
                 department="總務部", role="manager", title="總務專員"),
            User(name="Anna", email="anna@company.com", password_hash=pwd,
                 department="PMO", role="pmo", title="PMO"),
            User(name="Evelyn", email="evelyn@company.com", password_hash=pwd,
                 department="總務部", role="manager", title="總務專員"),
            User(name="陳部長", email="director@company.com", password_hash=pwd,
                 department="資訊部", role="manager", title="部長"),
            User(name="王需求", email="requester@company.com", password_hash=pwd,
                 department="業務部", role="user", title="專案經理"),
            User(name="李技術", email="tech@company.com", password_hash=pwd,
                 department="技術部", role="user", title="技術主管"),
            User(name="張財務", email="finance@company.com", password_hash=pwd,
                 department="財務部", role="manager", title="財務主管"),
        ]
        db.add_all(users)
        db.flush()

        # === 測試廠商 ===
        vendors = [
            Vendor(name="台灣資訊科技公司", tax_id="12345678", contact_name="王經理",
                   contact_email="wang@vendor.com", category="IT服務", tax_registered=True, business_registered=True),
            Vendor(name="雲端解決方案公司", tax_id="87654321", contact_name="陳業務",
                   contact_email="chen@cloud.com", category="雲端服務"),
            Vendor(name="企業軟體開發公司", tax_id="11223344", contact_name="林顧問",
                   contact_email="lin@soft.com", category="軟體開發"),
        ]
        db.add_all(vendors)
        db.flush()

        # === 簽核流程範本（對應各階段） ===

        # 簽呈階段 - 部門主管 → 部長
        w1 = Workflow(name="簽呈簽核流程", stage="approval_memo", created_by=1)
        db.add(w1)
        db.flush()
        db.add(WorkflowStep(workflow_id=w1.id, step_order=1, step_type="sequential",
                            approver_id=7, step_name="部門主管"))  # 部長
        db.add(WorkflowStep(workflow_id=w1.id, step_order=2, step_type="sequential",
                            approver_id=10, step_name="財務確認"))  # 財務

        # 請購單階段 - 總務確認
        w2 = Workflow(name="請購單簽核", stage="purchase_request", created_by=1)
        db.add(w2)
        db.flush()
        db.add(WorkflowStep(workflow_id=w2.id, step_order=1, step_type="sequential",
                            approver_id=4, step_name="總務確認"))  # Alvin

        # 決購建議表 - 主管 → 財務
        w3 = Workflow(name="決購建議表簽核", stage="purchase_decision", created_by=1)
        db.add(w3)
        db.flush()
        db.add(WorkflowStep(workflow_id=w3.id, step_order=1, step_type="sequential",
                            approver_id=7, step_name="部門主管"))
        db.add(WorkflowStep(workflow_id=w3.id, step_order=2, step_type="sequential",
                            approver_id=10, step_name="財務審核"))

        # 非制式合約會辦 - 法務審查 (會簽)
        w4 = Workflow(name="非制式合約會辦簽核", stage="contract_review", created_by=1)
        db.add(w4)
        db.flush()
        db.add(WorkflowStep(workflow_id=w4.id, step_order=1, step_type="countersign",
                            approver_id=2, step_name="法務主管"))  # 林育良
        db.add(WorkflowStep(workflow_id=w4.id, step_order=1, step_type="countersign",
                            approver_id=3, step_name="合約法務"))  # 沈翌廷

        # 用印階段 - PMO確認 → 總務用印
        w5 = Workflow(name="合約用印流程", stage="stamping", created_by=1)
        db.add(w5)
        db.flush()
        db.add(WorkflowStep(workflow_id=w5.id, step_order=1, step_type="sequential",
                            approver_id=5, step_name="PMO確認"))  # Anna
        db.add(WorkflowStep(workflow_id=w5.id, step_order=2, step_type="sequential",
                            approver_id=6, step_name="總務用印"))  # Evelyn

        db.commit()
        print("[Seed] v2 種子資料已建立（10位使用者 + 3廠商 + 5個流程範本）")
    except Exception as e:
        db.rollback()
        print(f"[Seed] 種子資料建立失敗: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


# 延遲匯入 routers（等 agent 建好檔案後才能 import）
def _register_routers():
    try:
        from routers import auth, contracts, vendors, approvals, workflows, notifications, dashboard, users, documents
        from routers.templates import router_templates, router_generate
        app.include_router(auth.router)
        app.include_router(contracts.router)
        app.include_router(vendors.router)
        app.include_router(approvals.router)
        app.include_router(workflows.router)
        app.include_router(notifications.router)
        app.include_router(dashboard.router)
        app.include_router(users.router)
        app.include_router(documents.router)
        app.include_router(router_templates)   # GET /api/templates/
        app.include_router(router_generate)    # POST /api/contracts/{id}/generate-template
    except ImportError as e:
        print(f"[Warning] Router import failed: {e}")


_register_routers()
