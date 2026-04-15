# 合約簽核管理系統

企業合約完整生命週期管理系統，涵蓋合約建立、多層簽核、到期提醒、續約管理與歸檔查詢。

## 系統架構

```
前端: React 18 + React Router + Recharts
後端: Node.js + Express + REST API
資料庫: PostgreSQL
```

## 核心功能

- **合約管理** - 建立/編輯/查詢/歸檔，支援範本快速建立
- **多層簽核流程** - 送簽 → 逐級審核 → 核准/駁回/退回，完整流程追蹤
- **到期自動提醒** - 每日排程檢查即將到期合約，自動發送通知
- **自動續約** - 可設定自動續約週期，到期自動延展
- **統計報表** - 儀表板概覽、金額統計、簽核效率分析

## 快速開始

### 1. 資料庫設定

```bash
# 建立 PostgreSQL 資料庫
createdb contract_system

# 執行 migration
cd backend
npm run migrate

# 匯入種子資料
npm run seed
```

### 2. 設定環境變數

```bash
# 編輯 backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=contract_system
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001
```

### 3. 啟動服務

```bash
# 後端 (port 3001)
cd backend
npm run dev

# 前端 (port 3000)
cd frontend
npm start
```

## API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/contracts | 合約列表（支援分頁、篩選、搜尋）|
| POST | /api/contracts | 建立合約 |
| GET | /api/contracts/:id | 合約詳情 |
| PUT | /api/contracts/:id | 更新合約 |
| POST | /api/contracts/:id/archive | 歸檔合約 |
| POST | /api/contracts/:id/terminate | 終止合約 |
| GET | /api/templates | 範本列表 |
| POST | /api/templates | 建立範本 |
| GET | /api/approvals/flows | 簽核流程列表 |
| POST | /api/approvals/submit | 送簽 |
| POST | /api/approvals/action | 審核操作（核准/駁回/退回）|
| GET | /api/approvals/pending/:userId | 待審核項目 |
| GET | /api/reports/dashboard | 儀表板統計 |
| GET | /api/reports/amount-summary | 金額統計 |
| GET | /api/reports/approval-efficiency | 簽核效率 |
| GET | /api/notifications/:userId | 使用者通知 |

## 簽核流程說明

```
草稿 → 送簽 → 逐級審核 → 全部核准 → 合約生效
                  ↓
             退回修改 / 駁回
```

- **核准**: 推進至下一層審核，全部核准後合約自動生效
- **退回**: 回到草稿狀態，可修改後重新送簽
- **駁回**: 合約終止審核流程

## 資料庫 Schema

主要資料表: `users`, `contracts`, `contract_templates`, `approval_flows`, `approval_records`, `approval_steps`, `reminders`, `notifications`, `audit_logs`
