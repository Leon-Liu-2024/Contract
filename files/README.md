# MongoDB Contract MCP Server

連接 MongoDB `contracts` collection 的 MCP Server，支援完整 CRUD 操作。

## 安裝

```bash
cd mongodb-contract-mcp
npm install
```

## 環境變數

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `MONGO_URI` | `mongodb://localhost:27017` | MongoDB 連線字串 |
| `DB_NAME`   | `contracts_db` | 資料庫名稱 |
| `COL_NAME`  | `contracts` | Collection 名稱 |

## 設定 Claude Desktop

編輯 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "mongodb-contracts": {
      "command": "node",
      "args": ["/path/to/mongodb-contract-mcp/server.js"],
      "env": {
        "MONGO_URI": "mongodb://localhost:27017",
        "DB_NAME": "contracts_db",
        "COL_NAME": "contracts"
      }
    }
  }
}
```

> 請將 `/path/to/mongodb-contract-mcp/` 換成實際路徑。

## 提供的工具

| Tool | 說明 |
|------|------|
| `find_contracts` | 查詢合約列表，支援關鍵字搜尋、狀態過濾、分頁 |
| `get_contract` | 依 `_id` 取得單一合約 |
| `create_contract` | 新增合約 |
| `update_contract` | 部分更新合約欄位 |
| `delete_contract` | 刪除合約 |
| `count_contracts` | 統計合約數量 |

## 合約資料結構

```json
{
  "_id": "ObjectId",
  "title": "合約名稱",
  "party_a": "甲方",
  "party_b": "乙方",
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "value": 500000,
  "currency": "TWD",
  "status": "active",
  "description": "合約說明",
  "tags": ["IT", "服務"],
  "extra": {},
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

status 可選值：`draft` | `active` | `expired` | `terminated`

## 使用範例（對話）

- 「列出所有有效合約」
- 「搜尋甲方是台積電的合約」
- 「新增一筆合約，名稱是…」
- 「把合約 ID 6789… 的狀態改為 expired」
- 「刪除合約 ID 1234…」
