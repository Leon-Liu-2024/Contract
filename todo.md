# 合約簽核系統 開發 TODO

> 執行原則：每個階段獨立可測試，低耦合，由基礎到進階逐步堆疊。
> `[ ]` 待完成　`[x]` 已完成

---

## 階段 1｜專案骨架與環境建置

### 1.1 後端初始化
- [ ] 建立 `backend/` 目錄，初始化 Python venv
- [ ] 安裝並鎖定 `requirements.txt`（fastapi, uvicorn, sqlalchemy, alembic, pydantic, python-jose, passlib, python-multipart, aiofiles）
- [ ] 建立 `main.py`，啟動最小 FastAPI app，根路由回傳 `{"status": "ok"}`
- [ ] 建立 `database.py`，設定 SQLite 連線與 SQLAlchemy session factory
- [ ] 建立 `.env` 與 `config.py`，統一管理環境變數（SECRET_KEY、DATABASE_URL、UPLOAD_DIR）

### 1.2 前端初始化
- [ ] 使用 Vite 建立 `frontend/`，選擇 React + TypeScript 範本
- [ ] 安裝核心套件（react-router-dom、axios、zustand、@tanstack/react-query、antd、dayjs）
- [ ] 建立 `src/api/client.ts`，設定 Axios baseURL 與 JWT Token 攔截器
- [ ] 建立基本路由結構（`App.tsx` + `router.tsx`），加入 `/login` 與 `/dashboard` 佔位頁

### 1.3 階段測試
- [ ] 後端：`GET /` 回傳 200，確認 FastAPI 啟動正常
- [ ] 前端：`npm run dev` 啟動，瀏覽器開啟不報錯，路由可切換
- [ ] 前後端：確認前端 Axios 能呼叫後端 `/`，CORS 設定正確

---

## 階段 2｜資料庫 Schema 與 Migration

### 2.1 建立 ORM 模型
- [ ] 建立 `models/user.py`（users 資料表）
- [ ] 建立 `models/contract.py`（contracts、contract_attachments 資料表）
- [ ] 建立 `models/workflow.py`（workflows、workflow_steps 資料表）
- [ ] 建立 `models/approval.py`（approval_records 資料表）
- [ ] 建立 `models/notification.py`（notifications 資料表）
- [ ] 在 `database.py` 中統一 import 所有模型，確保 metadata 完整

### 2.2 Alembic Migration
- [ ] 初始化 Alembic（`alembic init alembic`），設定 `env.py` 指向 SQLAlchemy metadata
- [ ] 產生初始 migration（`alembic revision --autogenerate -m "init"`）
- [ ] 執行 `alembic upgrade head`，確認 SQLite 建立所有資料表
- [ ] 撰寫 seed 腳本 `seed.py`，新增測試用管理員帳號與 2 筆範本流程

### 2.3 階段測試
- [ ] 確認所有資料表欄位與 FK 關係正確（sqlite3 CLI 或 DB Browser 驗證）
- [ ] 執行 seed 腳本後，查詢 users 與 workflows 資料存在
- [ ] 測試 migration rollback（`alembic downgrade -1`）再 upgrade 不報錯

---

## 階段 3｜使用者認證（JWT）

### 3.1 後端認證 API
- [ ] 建立 `schemas/auth.py`（LoginRequest、TokenResponse、UserProfile）
- [ ] 建立 `services/auth_service.py`，實作 `verify_password`、`create_access_token`、`decode_token`
- [ ] 建立 `routers/auth.py`，實作 `POST /api/auth/login`（驗證帳密，回傳 JWT）
- [ ] 建立 `middleware/auth.py`，實作 `get_current_user` dependency（Bearer token 驗證）
- [ ] 實作 `GET /api/auth/me`（需登入，回傳目前使用者資訊）

### 3.2 前端登入流程
- [ ] 建立 `pages/Login.tsx`，表單含帳號、密碼欄位（Ant Design Form）
- [ ] 建立 `store/authStore.ts`（zustand），儲存 token 與使用者資訊，持久化至 localStorage
- [ ] 登入成功後將 JWT 存入 store，並導向 `/dashboard`
- [ ] 建立 `components/PrivateRoute.tsx`，未登入自動導向 `/login`
- [ ] 所有非公開路由套用 PrivateRoute

### 3.3 階段測試
- [ ] 後端：`POST /api/auth/login` 正確帳密回傳 token，錯誤帳密回傳 401
- [ ] 後端：`GET /api/auth/me` 無 token 回傳 401，有效 token 回傳使用者資訊
- [ ] 前端：登入後 localStorage 存有 token，重整頁面保持登入狀態
- [ ] 前端：未登入直接進 `/dashboard` 被導向 `/login`

---

## 階段 4｜合約 CRUD

### 4.1 後端合約 API
- [ ] 建立 `schemas/contract.py`（ContractCreate、ContractUpdate、ContractResponse、ContractListItem）
- [ ] 建立 `routers/contracts.py`，實作：
  - [ ] `GET /api/contracts`（列表，支援 status/keyword/date/type/amount 篩選與分頁）
  - [ ] `POST /api/contracts`（建立，初始狀態為 draft）
  - [ ] `GET /api/contracts/{id}`（詳情，含附件清單）
  - [ ] `PUT /api/contracts/{id}`（編輯，限 draft 或 rejected 狀態）
  - [ ] `POST /api/contracts/{id}/void`（作廢，需填原因）
- [ ] 自動產生合約編號（格式：`CTR-YYYYMMDD-NNN`）

### 4.2 附件上傳
- [ ] 建立 `services/file_service.py`，處理檔案存至 `uploads/{contract_id}/` 目錄
- [ ] 實作 `POST /api/contracts/{id}/attachments`（multipart 上傳，驗證副檔名與大小）
- [ ] 實作 `GET /api/contracts/{id}/attachments/{file_id}`（下載附件，驗證存取權限）

### 4.3 前端合約頁面
- [ ] 建立 `pages/ContractList.tsx`：列表、篩選列、分頁、狀態 Badge
- [ ] 建立 `pages/ContractForm.tsx`：新增／編輯表單，含 FileUploader 元件
- [ ] 建立 `components/FileUploader.tsx`：拖拉上傳，顯示上傳進度
- [ ] 建立 `pages/ContractDetail.tsx`：合約基本資訊 + 附件列表（含下載連結）
- [ ] 建立 `components/ContractStatusBadge.tsx`：依狀態顯示對應顏色標籤
- [ ] 使用 `@tanstack/react-query` 封裝合約相關 API 呼叫（`useContracts`、`useContract`）

### 4.4 階段測試
- [ ] 後端：建立合約 → 查詢列表可見 → 編輯 → 作廢，狀態流轉正確
- [ ] 後端：上傳附件後可下載，檔案實際存在 `uploads/` 目錄
- [ ] 後端：draft 以外狀態呼叫 PUT 回傳 403
- [ ] 前端：新增合約表單驗證必填欄位，送出後列表出現新資料
- [ ] 前端：上傳附件後顯示檔名，點下載可取得檔案

---

## 階段 5｜簽核流程引擎

### 5.1 流程範本 API
- [ ] 建立 `schemas/workflow.py`（WorkflowCreate、WorkflowStepCreate、WorkflowResponse）
- [ ] 建立 `routers/workflows.py`，實作範本 CRUD（GET / POST / PUT / DELETE）
- [ ] 實作 `GET /api/workflows/recommend`（依合約類型與金額推薦適合範本）

### 5.2 簽核引擎核心
- [ ] 建立 `services/approval_engine.py`，實作 `submit_contract(contract_id, workflow_id)`：
  - [ ] 複製 workflow_steps 為合約專屬簽核節點，設定 `current_step = 1`，狀態改為 pending
- [ ] 實作 `advance_contract(contract_id, action, approver_id, comment)`：
  - [ ] 驗證 approver_id 是否為當前節點負責人
  - [ ] action=approved：循序模式移至下一節點；無下一節點則合約改為 approved
  - [ ] action=rejected：合約改為 rejected
  - [ ] 每次操作寫入 `approval_records`

### 5.3 簽核 API
- [ ] 建立 `routers/approvals.py`，實作：
  - [ ] `POST /api/contracts/{id}/submit`（送出簽核，選擇流程）
  - [ ] `GET /api/approvals/pending`（待我簽核清單）
  - [ ] `POST /api/approvals/{contract_id}/approve`（同意）
  - [ ] `POST /api/approvals/{contract_id}/reject`（退回，需填意見）
  - [ ] `POST /api/approvals/batch-approve`（批次同意）

### 5.4 前端簽核頁面
- [ ] 建立 `pages/PendingApprovals.tsx`：待簽清單，含快速同意／退回操作與批次勾選
- [ ] 建立 `pages/InProgressContracts.tsx`：我的簽核中合約，顯示當前卡關節點
- [ ] 建立 `pages/CompletedContracts.tsx`：已完成合約列表
- [ ] 建立 `pages/RejectedContracts.tsx`：退回合約列表，含重新送出入口
- [ ] 建立 `components/ApprovalTimeline.tsx`：視覺化簽核進度（已完成／當前／待簽）
- [ ] 在 `ContractDetail.tsx` 嵌入 ApprovalTimeline 與簽核操作按鈕

### 5.5 階段測試
- [ ] 後端：建立合約 → submit → 第一關 approve → 第二關 approve → 狀態變 approved
- [ ] 後端：建立合約 → submit → 第一關 reject → 狀態變 rejected，申請人可重送
- [ ] 後端：非當前簽核人呼叫 approve 回傳 403
- [ ] 後端：批次同意 3 筆合約，每筆均正確推進節點
- [ ] 前端：ApprovalTimeline 正確顯示各節點狀態與操作人
- [ ] 前端：退回合約頁點「重新送出」後，合約回到 pending 且出現在待簽清單

---

## 階段 6｜通知系統

### 6.1 後端通知邏輯
- [ ] 建立 `services/notification_service.py`，實作 `create_notification(user_id, contract_id, type, message)`
- [ ] 在 `approval_engine.py` 各節點觸發對應通知：
  - [ ] 合約送出 → 通知第一關簽核人
  - [ ] 節點通過 → 通知下一關簽核人
  - [ ] 全部通過 → 通知申請人
  - [ ] 退回 → 通知申請人（含退回意見）
- [ ] 建立 `routers/notifications.py`，實作：
  - [ ] `GET /api/notifications`（我的通知，支援未讀篩選）
  - [ ] `POST /api/notifications/{id}/read`（標為已讀）
  - [ ] `POST /api/notifications/read-all`（全部已讀）
- [ ] 實作 `POST /api/approvals/{contract_id}/remind`（催簽，對當前簽核人建立 reminder 通知）

### 6.2 前端通知元件
- [ ] 建立 `components/NotificationBell.tsx`：Header 鈴鐺圖示 + 未讀數 Badge
- [ ] 點擊展開 Popover，顯示最新 10 筆通知，點通知跳轉至對應合約
- [ ] 使用 `@tanstack/react-query` 每 30 秒輪詢未讀通知數

### 6.3 階段測試
- [ ] 後端：簽核流程跑完整輪，確認每個事件均建立對應 notification 紀錄
- [ ] 後端：催簽 API 對當前簽核人建立通知，不重複催簽（同一天限一次）
- [ ] 後端：標已讀後 `is_read=1`，全部已讀後未讀數歸零
- [ ] 前端：NotificationBell 顯示正確未讀數，點通知連結跳轉正確合約頁

---

## 階段 7｜儀表板與報表

### 7.1 後端統計 API
- [ ] 建立 `routers/dashboard.py`，實作 `GET /api/dashboard/stats`：
  - [ ] 待我簽核數、我的簽核中數、本月已完成數、退回數
- [ ] 實作 `GET /api/dashboard/recent-activity`（最近 10 筆操作紀錄）
- [ ] 實作 `GET /api/dashboard/admin/stats`（管理員：各部門合約數、平均簽核時長）
- [ ] 實作 `GET /api/dashboard/admin/export`（匯出 Excel，使用 openpyxl）

### 7.2 前端儀表板頁面
- [ ] 建立 `pages/Dashboard.tsx`：4 個數字卡片 + 到期提醒 + 最近活動清單
- [ ] 建立 `pages/AdminReports.tsx`：部門合約分布圖、平均簽核時長趨勢圖（使用 Ant Design Charts 或 recharts）
- [ ] 匯出 Excel 按鈕，觸發後端 export API 並自動下載

### 7.3 階段測試
- [ ] 後端：stats API 數字與資料庫實際筆數一致
- [ ] 後端：admin export 下載 xlsx 檔案，欄位與資料正確
- [ ] 前端：Dashboard 數字卡片顯示正確，最近活動依時間排序
- [ ] 前端：匯出按鈕觸發下載，瀏覽器收到 xlsx 檔案

---

## 階段 8｜權限管理

### 8.1 後端角色權限
- [ ] 建立 `services/permission_service.py`，實作角色檢查 decorator（`require_role`）
- [ ] 在各 API 套用角色限制：admin 才能存取 `/api/admin/*`，合約只能由建立者或有權者修改
- [ ] 實作合約可見範圍控制（查詢時依 `role` 過濾：user 只看自己、manager 看部門、admin 看全部）
- [ ] 建立 `routers/users.py`（管理員），實作使用者 CRUD：新增、停用、指定角色與部門
- [ ] 實作代理人設定（`deputy_id`、`deputy_start`、`deputy_end`），簽核時自動判斷是否轉派

### 8.2 前端權限控制
- [ ] `PrivateRoute` 加入 role 參數，角色不符顯示 403 頁面
- [ ] 建立 `pages/UserManagement.tsx`（管理員）：使用者列表、新增、停用、角色設定
- [ ] 操作按鈕依角色顯示／隱藏（如：作廢按鈕只有 admin 可見）

### 8.3 階段測試
- [ ] 後端：一般使用者呼叫 `/api/admin/*` 回傳 403
- [ ] 後端：使用者只能查到自己的合約，manager 可查部門合約
- [ ] 後端：代理人期間內，代理人出現在待簽清單，主要簽核人不出現
- [ ] 前端：一般使用者登入，管理選單不顯示，直接輸入 URL 顯示 403

---

## 階段 9｜進階功能

### 9.1 會簽（Countersign）支援
- [ ] `approval_engine.py` 擴充：同一節點多人會簽，全部同意才進下一節點
- [ ] 任一人退回則整個節點退回，`approval_records` 記錄每人操作
- [ ] 前端 `WorkflowBuilder.tsx`：節點可切換「循序」or「會簽」模式，會簽可加多位簽核人

### 9.2 逾期催簽排程
- [ ] 整合 APScheduler，每日 09:00 執行掃描任務
- [ ] 找出超過 N 天未處理的 pending 節點，自動建立 reminder 通知
- [ ] 若設定 Escalation，超過天數後自動加入上層主管為共同簽核人

### 9.3 合約 PDF 預覽
- [ ] 前端安裝 `react-pdf`，在 `ContractDetail.tsx` 嵌入 PDF 預覽元件
- [ ] 支援分頁翻頁、縮放操作
- [ ] 非 PDF 附件顯示檔案圖示與下載連結

### 9.4 階段測試
- [ ] 後端：會簽節點，部分人同意時合約仍為 pending，全部同意才推進
- [ ] 後端：APScheduler 排程可手動觸發，確認逾期合約產生 reminder 通知
- [ ] 前端：WorkflowBuilder 可設定會簽節點，送出後流程正確建立
- [ ] 前端：PDF 附件在詳情頁顯示預覽而非僅下載連結

---

## 各階段依賴關係

```
階段 1（環境）
  └── 階段 2（DB Schema）
        └── 階段 3（認證）
              └── 階段 4（合約 CRUD）
                    └── 階段 5（簽核引擎）
                          ├── 階段 6（通知）
                          ├── 階段 7（儀表板）
                          └── 階段 8（權限）
                                └── 階段 9（進階功能）
```
