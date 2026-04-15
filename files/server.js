#!/usr/bin/env node

const { MongoClient, ObjectId } = require("mongodb");
const readline = require("readline");

// ── Config ──────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME   = process.env.DB_NAME   || "contracts_db";
const COL_NAME  = process.env.COL_NAME  || "contracts";

// ── MongoDB client ───────────────────────────────────────────────────────────
let client;
let collection;

async function getCollection() {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    collection = client.db(DB_NAME).collection(COL_NAME);
  }
  return collection;
}

// ── MCP Tool definitions ─────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "find_contracts",
    description: "查詢合約列表。可依關鍵字、狀態、日期範圍過濾，支援分頁。",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "object",
          description: "MongoDB 查詢條件，例如 { status: 'active' }",
        },
        keyword: {
          type: "string",
          description: "對 title、party_a、party_b 欄位做模糊搜尋",
        },
        status: {
          type: "string",
          enum: ["draft", "active", "expired", "terminated"],
          description: "合約狀態",
        },
        limit: {
          type: "number",
          description: "回傳筆數上限，預設 20",
        },
        skip: {
          type: "number",
          description: "跳過筆數（分頁用），預設 0",
        },
      },
    },
  },
  {
    name: "get_contract",
    description: "依 _id 取得單一合約完整資料",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "合約 MongoDB ObjectId 字串" },
      },
    },
  },
  {
    name: "create_contract",
    description: "新增一筆合約",
    inputSchema: {
      type: "object",
      required: ["title", "party_a", "party_b", "start_date", "end_date"],
      properties: {
        title:      { type: "string",  description: "合約名稱" },
        party_a:    { type: "string",  description: "甲方名稱" },
        party_b:    { type: "string",  description: "乙方名稱" },
        start_date: { type: "string",  description: "開始日期 YYYY-MM-DD" },
        end_date:   { type: "string",  description: "結束日期 YYYY-MM-DD" },
        value:      { type: "number",  description: "合約金額" },
        currency:   { type: "string",  description: "幣別，預設 TWD" },
        status:     { type: "string",  enum: ["draft","active","expired","terminated"], description: "狀態，預設 draft" },
        description:{ type: "string",  description: "合約說明" },
        tags:       { type: "array",   items: { type: "string" }, description: "標籤" },
        extra:      { type: "object",  description: "其他自定義欄位" },
      },
    },
  },
  {
    name: "update_contract",
    description: "更新合約欄位（部分更新）",
    inputSchema: {
      type: "object",
      required: ["id", "fields"],
      properties: {
        id:     { type: "string", description: "合約 ObjectId 字串" },
        fields: { type: "object", description: "要更新的欄位與新值" },
      },
    },
  },
  {
    name: "delete_contract",
    description: "刪除一筆合約",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "合約 ObjectId 字串" },
      },
    },
  },
  {
    name: "count_contracts",
    description: "統計符合條件的合約數量",
    inputSchema: {
      type: "object",
      properties: {
        filter: { type: "object", description: "MongoDB 查詢條件" },
        status: { type: "string", enum: ["draft","active","expired","terminated"] },
      },
    },
  },
];

// ── Tool handlers ─────────────────────────────────────────────────────────────
async function handleTool(name, args) {
  const col = await getCollection();

  if (name === "find_contracts") {
    const query = args.filter || {};
    if (args.status)  query.status = args.status;
    if (args.keyword) {
      const re = { $regex: args.keyword, $options: "i" };
      query.$or = [{ title: re }, { party_a: re }, { party_b: re }];
    }
    const docs = await col
      .find(query)
      .skip(args.skip || 0)
      .limit(args.limit || 20)
      .toArray();
    return { count: docs.length, contracts: docs };
  }

  if (name === "get_contract") {
    const doc = await col.findOne({ _id: new ObjectId(args.id) });
    if (!doc) throw new Error(`Contract not found: ${args.id}`);
    return doc;
  }

  if (name === "create_contract") {
    const now = new Date();
    const doc = {
      ...args,
      currency: args.currency || "TWD",
      status:   args.status   || "draft",
      created_at: now,
      updated_at: now,
    };
    const result = await col.insertOne(doc);
    return { inserted_id: result.insertedId, ...doc };
  }

  if (name === "update_contract") {
    args.fields.updated_at = new Date();
    const result = await col.updateOne(
      { _id: new ObjectId(args.id) },
      { $set: args.fields }
    );
    if (result.matchedCount === 0) throw new Error(`Contract not found: ${args.id}`);
    return { modified: result.modifiedCount, id: args.id };
  }

  if (name === "delete_contract") {
    const result = await col.deleteOne({ _id: new ObjectId(args.id) });
    if (result.deletedCount === 0) throw new Error(`Contract not found: ${args.id}`);
    return { deleted: true, id: args.id };
  }

  if (name === "count_contracts") {
    const query = args.filter || {};
    if (args.status) query.status = args.status;
    const total = await col.countDocuments(query);
    return { count: total };
  }

  throw new Error(`Unknown tool: ${name}`);
}

// ── MCP JSON-RPC over stdio ───────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, terminal: false });

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

rl.on("line", async (line) => {
  let msg;
  try { msg = JSON.parse(line); } catch { return; }

  const { id, method, params } = msg;

  try {
    if (method === "initialize") {
      return send({
        jsonrpc: "2.0", id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "mongodb-contract-mcp", version: "1.0.0" },
        },
      });
    }

    if (method === "notifications/initialized") return; // no response needed

    if (method === "tools/list") {
      return send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    }

    if (method === "tools/call") {
      const { name, arguments: args } = params;
      const data = await handleTool(name, args || {});
      return send({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] },
      });
    }

    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    send({ jsonrpc: "2.0", id, error: { code: -32000, message: err.message } });
  }
});

process.on("SIGINT", async () => { if (client) await client.close(); process.exit(0); });
