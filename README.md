# 合約簽核管理系統 V2

企業合約完整生命週期管理系統，涵蓋合約建立、10 階段流程推進、多層簽核、ibon 範本自動填入、統計報表與歸檔查詢。

## 系統架構

```
前端: React 18 + TypeScript + Vite 6 + Ant Design 5
後端: Python 3.11 + FastAPI + SQLAlchemy 2
資料庫: SQLite（預設，檔案路徑 backend/contract_v2.db）
         ※ 可改為 PostgreSQL，見下方「切換資料庫」說明
```

## 目錄結構

```
合約系統_簽核管理/
├── backend/               # FastAPI 後端
│   ├── main.py            # 應用程式進入點、CORS、seed data
│   ├── config.py          # 設定（JWT、DB URL）
│   ├── database.py        # SQLAlchemy engine / session
│   ├── models/            # ORM 資料表定義
│   ├── routers/           # API 路由（contracts / approvals / dashboard …）
│   ├── services/          # 業務邏輯（contract_engine / auth_service …）
│   ├── middleware/        # JWT 驗證 / 角色權限
│   ├── schemas/           # Pydantic 請求 / 回應模型
│   ├── templates/ibon/    # ibon 制式合約 docx 範本（19 種）
│   ├── uploads/           # 使用者上傳附件（git 只追蹤 .gitkeep）
│   ├── .env.example       # 環境變數範本
│   └── requirements.txt   # Python 套件清單
├── frontend/              # React 前端
│   ├── src/
│   │   ├── pages/         # 頁面元件（Login / Dashboard / ContractDetail …）
│   │   ├── api/client.ts  # Axios 封裝 + API 呼叫函式
│   │   ├── store/         # Zustand 狀態（authStore）
│   │   └── types/         # TypeScript 型別定義
│   └── package.json
├── v1_backup/             # V1 舊版本備份（Node.js + Express，僅供參考）
└── docs/screenshots/      # 系統截圖（用於簡報 / 文件）
```

## 合約 10 階段流程

```
起始作業(draft) → 簽呈 → 請購單 → 決購建議表 → 非制式合約會辦
→ 用印 → 寄送廠商用印 → 收件/簽約完成 → 入檔 → 驗收(acceptance)
```

每一階段可設定獨立簽核流程（序簽 / 會簽），支援代理人機制。

## 快速開始

### 1. 後端

```bash
cd backend

# 建立虛擬環境並安裝套件
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt

# （選用）複製環境變數範本
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux

# 啟動開發伺服器（port 8000）
uvicorn main:app --reload
```

> 資料庫檔案 `contract_v2.db` 與預設帳號會在第一次啟動時自動建立。

### 2. 前端

```bash
cd frontend
npm install
npm run dev     # port 5173
```

### 3. 預設測試帳號

| 帳號 | 密碼 | 角色 |
|---|---|---|
| admin@company.com | pass1234 | 系統管理員 (admin) |
| director@company.com | pass1234 | 部門主管 (director) |
| lin@company.com | pass1234 | 法務主管 (legal) |
| shen@company.com | pass1234 | 合約法務 (legal) |
| user@company.com | pass1234 | 一般使用者 (user) |

## 切換資料庫（SQLite → PostgreSQL）

1. 修改 `backend/config.py`：

```python
# 原本（SQLite）
DATABASE_URL = "sqlite:///contract_v2.db"

# 改為 PostgreSQL
DATABASE_URL = "postgresql://user:password@localhost:5432/contract_system"
```

2. 安裝 PostgreSQL 驅動：

```bash
pip install psycopg2-binary
```

3. 重新啟動即可；SQLAlchemy 會自動建立資料表。

> SQLite 適合開發與小型部署；PostgreSQL 適合多人同時使用的正式環境。

## 主要 API 端點

| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | /api/auth/login | 登入取得 JWT Token |
| GET | /api/auth/me | 取得目前使用者資訊 |
| GET | /api/contracts | 合約列表（支援搜尋 / 篩選）|
| POST | /api/contracts | 建立合約 |
| GET | /api/contracts/{id} | 合約詳情（含簽核紀錄）|
| PUT | /api/contracts/{id} | 更新合約（僅 draft 階段）|
| POST | /api/contracts/{id}/advance | 推進至下一階段 |
| POST | /api/contracts/{id}/reject | 退回至上一階段 |
| POST | /api/contracts/{id}/void | 作廢合約 |
| POST | /api/contracts/{id}/submit | 提交指定流程簽核 |
| GET | /api/approvals/pending | 我的待簽核列表 |
| POST | /api/approvals/{id}/approve | 核准 |
| POST | /api/approvals/{id}/reject | 駁回 |
| POST | /api/approvals/batch-approve | 批次核准 |
| GET | /api/dashboard/stats | 儀表板統計數字 |
| GET | /api/workflows | 流程設定列表 |
| GET | /api/notifications | 我的通知 |

完整 API 文件請啟動後端後開啟：http://localhost:8000/docs

## 環境需求

| 項目 | 版本 |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
