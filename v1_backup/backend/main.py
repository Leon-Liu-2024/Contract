from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routers import auth, contracts, approvals, workflows, notifications, dashboard, users

app = FastAPI(title="合約簽核管理系統", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(contracts.router)
app.include_router(approvals.router)
app.include_router(workflows.router)
app.include_router(notifications.router)
app.include_router(dashboard.router)
app.include_router(users.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "合約簽核管理系統 API v2.0"}


@app.on_event("startup")
def startup():
    init_db()
    _seed_data()


def _seed_data():
    """初始化種子資料（僅在空資料庫時執行）"""
    from database import SessionLocal
    from models.user import User
    from models.workflow import Workflow, WorkflowStep
    from services.auth_service import hash_password

    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return  # 已有資料

        # 預設使用者（密碼皆為 pass1234）
        pwd = hash_password("pass1234")
        users_data = [
            User(name="王大明", email="admin@company.com", password_hash=pwd, department="法務部", role="admin"),
            User(name="李小華", email="manager1@company.com", password_hash=pwd, department="採購部", role="manager"),
            User(name="張志偉", email="manager2@company.com", password_hash=pwd, department="財務部", role="manager"),
            User(name="陳美玲", email="user1@company.com", password_hash=pwd, department="業務部", role="user"),
            User(name="林建宏", email="ceo@company.com", password_hash=pwd, department="總經理室", role="admin"),
        ]
        db.add_all(users_data)
        db.flush()

        # 預設簽核流程
        w1 = Workflow(name="一般合約簽核", contract_type=None, created_by=1)
        db.add(w1)
        db.flush()
        db.add(WorkflowStep(workflow_id=w1.id, step_order=1, step_type="sequential", approver_id=2))
        db.add(WorkflowStep(workflow_id=w1.id, step_order=2, step_type="sequential", approver_id=1))

        w2 = Workflow(name="高額採購簽核", contract_type="purchase", amount_min=1000000, created_by=1)
        db.add(w2)
        db.flush()
        db.add(WorkflowStep(workflow_id=w2.id, step_order=1, step_type="sequential", approver_id=2))
        db.add(WorkflowStep(workflow_id=w2.id, step_order=2, step_type="sequential", approver_id=3))
        db.add(WorkflowStep(workflow_id=w2.id, step_order=3, step_type="sequential", approver_id=5))

        w3 = Workflow(name="NDA 會簽流程", contract_type="nda", created_by=1)
        db.add(w3)
        db.flush()
        db.add(WorkflowStep(workflow_id=w3.id, step_order=1, step_type="countersign", approver_id=2))
        db.add(WorkflowStep(workflow_id=w3.id, step_order=1, step_type="countersign", approver_id=3))
        db.add(WorkflowStep(workflow_id=w3.id, step_order=2, step_type="sequential", approver_id=1))

        db.commit()
        print("[Seed] 種子資料已建立（5 位使用者 + 3 個流程範本）")
    except Exception as e:
        db.rollback()
        print(f"[Seed] 種子資料建立失敗: {e}")
    finally:
        db.close()
