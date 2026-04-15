# 合約簽核系統 技術規劃

## 技術主軸

| 層級 | 技術選型 |
|------|----------|
| 前端 | React.js 18 + TypeScript |
| 後端 | Python 3.12 + FastAPI |
| 資料庫 | SQLite（開發／小型部署）|
| 檔案儲存 | 本地檔案系統（`/uploads`）|

---

## 專案目錄結構

```
contract/
├── backend/                  # Python FastAPI 後端
│   ├── main.py               # 應用程式入口
│   ├── database.py           # SQLite 連線與初始化
│   ├── models/               # SQLAlchemy ORM 模型
│   │   ├── contract.py
│   │   ├── approval.py
│   │   ├── user.py
│   │   └── notification.py
│   ├── routers/              # API 路由（按功能模組分檔）
│   │   ├── auth.py
│   │   ├── contracts.py
│   │   ├── approvals.py
│   │   ├── workflows.py
│   │   ├── notifications.py
│   │   ├── dashboard.py
│   │   └── users.py
│   ├── schemas/              # Pydantic 請求／回應 Schema
│   ├── services/             # 業務邏輯層
│   │   ├── approval_engine.py   # 簽核流程引擎
│   │   ├── notification.py      # 通知發送邏輯
│   │   └── file_service.py      # 檔案上傳處理
│   ├── middleware/
│   │   └── auth.py           # JWT 驗證 middleware
│   ├── uploads/              # 合約附件存放目錄
│   └── requirements.txt
│
├── frontend/                 # React.js 前端
│   ├── src/
│   │   ├── api/              # Axios API 呼叫封裝
│   │   ├── components/       # 共用 UI 元件
│   │   │   ├── ContractStatusBadge.tsx
│   │   │   ├── ApprovalTimeline.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   └── NotificationBell.tsx
│   │   ├── pages/            # 頁面元件
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ContractList.tsx
│   │   │   ├── ContractDetail.tsx
│   │   │   ├── ContractForm.tsx
│   │   │   ├── PendingApprovals.tsx
│   │   │   ├── WorkflowSettings.tsx
│   │   │   └── UserManagement.tsx
│   │   ├── store/            # Zustand 狀態管理
│   │   ├── hooks/            # 自訂 React Hooks
│   │   ├── types/            # TypeScript 型別定義
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
│
└── contract.db               # SQLite 資料庫檔案
```

---

## 後端技術細節

### 核心套件

```
fastapi==0.115.x
uvicorn[standard]
sqlalchemy==2.0.x       # ORM
alembic                 # 資料庫 migration
pydantic==2.x           # 資料驗證
python-jose[cryptography] # JWT
passlib[bcrypt]         # 密碼雜湊
python-multipart        # 檔案上傳
aiofiles                # 非同步檔案操作
APScheduler             # 排程任務（逾期催簽）
openpyxl                # 匯出 Excel
```

### 資料庫設計（SQLite / SQLAlchemy）

#### users — 使用者
```sql
id            INTEGER PRIMARY KEY
name          TEXT NOT NULL
email         TEXT UNIQUE NOT NULL
password_hash TEXT NOT NULL
department    TEXT
role          TEXT  -- admin | manager | user
deputy_id     INTEGER  -- 代理人 FK → users.id
deputy_start  DATE
deputy_end    DATE
is_active     BOOLEAN DEFAULT 1
created_at    DATETIME
```

#### contracts — 合約主表
```sql
id            INTEGER PRIMARY KEY
contract_no   TEXT UNIQUE           -- 系統自動產生，如 CTR-20260331-001
title         TEXT NOT NULL
counterparty  TEXT                  -- 合約對象
amount        DECIMAL
contract_type TEXT                  -- purchase | nda | service | other
start_date    DATE
end_date      DATE
status        TEXT                  -- draft | pending | approved | rejected | void
creator_id    INTEGER FK → users.id
workflow_id   INTEGER FK → workflows.id
current_step  INTEGER DEFAULT 0     -- 目前在第幾個節點
created_at    DATETIME
updated_at    DATETIME
void_reason   TEXT
```

#### contract_attachments — 合約附件
```sql
id            INTEGER PRIMARY KEY
contract_id   INTEGER FK → contracts.id
filename      TEXT
stored_path   TEXT                  -- 伺服器儲存路徑
file_size     INTEGER
uploaded_at   DATETIME
```

#### workflows — 簽核流程範本
```sql
id            INTEGER PRIMARY KEY
name          TEXT NOT NULL
contract_type TEXT                  -- 適用合約類型，null 表示通用
amount_min    DECIMAL               -- 適用金額下限
amount_max    DECIMAL               -- 適用金額上限
is_active     BOOLEAN DEFAULT 1
created_by    INTEGER FK → users.id
```

#### workflow_steps — 流程節點
```sql
id            INTEGER PRIMARY KEY
workflow_id   INTEGER FK → workflows.id
step_order    INTEGER               -- 節點順序，從 1 開始
step_type     TEXT                  -- sequential | countersign（循序 or 會簽）
approver_id   INTEGER FK → users.id -- null 表示動態指定
approver_role TEXT                  -- 若無固定人員則以角色決定
```

#### approval_records — 簽核紀錄
```sql
id            INTEGER PRIMARY KEY
contract_id   INTEGER FK → contracts.id
step_id       INTEGER FK → workflow_steps.id
approver_id   INTEGER FK → users.id
action        TEXT                  -- approved | rejected | delegated
comment       TEXT
acted_at      DATETIME
```

#### notifications — 通知
```sql
id            INTEGER PRIMARY KEY
user_id       INTEGER FK → users.id
contract_id   INTEGER FK → contracts.id
type          TEXT                  -- pending_approval | approved | rejected | reminder
message       TEXT
is_read       BOOLEAN DEFAULT 0
created_at    DATETIME
```

---

### API 端點設計

#### 認證 `/api/auth`
| Method | Path | 說明 |
|--------|------|------|
| POST | `/login` | 登入，回傳 JWT |
| POST | `/logout` | 登出 |
| GET | `/me` | 取得目前登入者資訊 |

#### 合約 `/api/contracts`
| Method | Path | 說明 |
|--------|------|------|
| GET | `/` | 合約列表（支援篩選、分頁） |
| POST | `/` | 建立合約 |
| GET | `/{id}` | 合約詳情 |
| PUT | `/{id}` | 編輯合約（草稿或退回狀態） |
| POST | `/{id}/submit` | 送出簽核 |
| POST | `/{id}/void` | 作廢合約 |
| POST | `/{id}/attachments` | 上傳附件 |
| GET | `/{id}/attachments/{file_id}` | 下載附件 |

#### 簽核 `/api/approvals`
| Method | Path | 說明 |
|--------|------|------|
| GET | `/pending` | 待我簽核清單 |
| POST | `/{contract_id}/approve` | 同意 |
| POST | `/{contract_id}/reject` | 退回（附意見）|
| POST | `/{contract_id}/remind` | 催簽 |
| POST | `/batch-approve` | 批次同意 |

#### 流程範本 `/api/workflows`
| Method | Path | 說明 |
|--------|------|------|
| GET | `/` | 範本列表 |
| POST | `/` | 建立範本 |
| PUT | `/{id}` | 編輯範本 |
| DELETE | `/{id}` | 刪除範本 |
| GET | `/recommend` | 依合約類型 & 金額推薦範本 |

#### 通知 `/api/notifications`
| Method | Path | 說明 |
|--------|------|------|
| GET | `/` | 我的通知清單 |
| POST | `/{id}/read` | 標為已讀 |
| POST | `/read-all` | 全部已讀 |

#### 儀表板 `/api/dashboard`
| Method | Path | 說明 |
|--------|------|------|
| GET | `/stats` | 個人統計數字 |
| GET | `/admin/stats` | 管理員全局統計 |
| GET | `/admin/export` | 匯出 Excel |

---

### 簽核流程引擎（`services/approval_engine.py`）

```
advance_contract(contract_id, action, approver_id, comment)
  ├── 取得合約目前節點
  ├── 驗證操作人是否為當前簽核人
  ├── action == "approved"
  │   ├── step_type == "sequential" → 移至下一節點
  │   ├── step_type == "countersign" → 檢查同節點其他人是否都已同意
  │   └── 無下一節點 → 合約狀態改為 approved，發送完成通知
  └── action == "rejected"
      ├── 合約狀態改為 rejected
      └── 發送退回通知給申請人
```

---

## 前端技術細節

### 核心套件

```
react 18 + typescript
vite                    # 建置工具
react-router-dom v6     # 路由
axios                   # HTTP 客戶端
zustand                 # 輕量狀態管理
@tanstack/react-query   # API 資料快取與同步
ant-design (antd)       # UI 元件庫
dayjs                   # 日期處理
react-pdf               # PDF 預覽
```

### 頁面與路由

```
/login                        登入頁
/dashboard                    個人儀表板
/contracts                    合約列表
/contracts/new                建立合約
/contracts/:id                合約詳情
/contracts/:id/edit           編輯合約
/approvals/pending            待我簽核
/approvals/in-progress        我的簽核中
/approvals/completed          我的已完成
/approvals/rejected           我的退回
/settings/workflows           流程範本管理
/admin/users                  使用者管理（管理員）
/admin/reports                管理報表（管理員）
```

### 狀態管理策略

- **Server State**：使用 `@tanstack/react-query` 管理所有 API 資料，自動快取與背景同步
- **Client State**：使用 `zustand` 管理登入使用者資訊、通知未讀數等全域 UI 狀態
- **Form State**：合約表單使用 `react-hook-form` 管理

### 關鍵元件

| 元件 | 功能 |
|------|------|
| `ApprovalTimeline` | 視覺化顯示簽核進度，標示已完成／當前／待簽節點 |
| `ContractStatusBadge` | 依狀態顯示對應顏色標籤 |
| `FileUploader` | 拖拉上傳，顯示上傳進度，支援多檔案 |
| `NotificationBell` | 鈴鐺圖示 + 未讀數 badge，點開 Popover 顯示最新通知 |
| `WorkflowBuilder` | 拖拉排序的流程節點編輯器 |

---

## 開發環境啟動

### 後端
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head             # 建立資料庫 schema
uvicorn main:app --reload --port 8000
```

### 前端
```bash
cd frontend
npm install
npm run dev                      # 啟動於 http://localhost:5173
```

### 環境變數（`backend/.env`）
```
SECRET_KEY=your-jwt-secret-key
UPLOAD_DIR=./uploads
DATABASE_URL=sqlite:///./contract.db
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

---

## 開發里程碑

| 階段 | 內容 | 產出 |
|------|------|------|
| **P0 基礎建設** | 專案骨架、DB schema、JWT 認證、登入頁 | 可登入的空殼 |
| **P1 合約 CRUD** | 建立／編輯／列表／詳情、附件上傳 | 合約可建立與查看 |
| **P2 簽核引擎** | 流程範本、循序簽核、同意／退回邏輯 | 端對端簽核跑通 |
| **P3 通知系統** | 系統通知、催簽、Email 通知 | 簽核事件有通知 |
| **P4 儀表板** | 個人統計、管理報表、Excel 匯出 | 數據可視化 |
| **P5 進階功能** | 會簽、代理簽核、批次操作、PDF 預覽 | 功能完整 |
