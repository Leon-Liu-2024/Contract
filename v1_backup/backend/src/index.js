const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const contractRoutes = require('./routes/contracts');
const templateRoutes = require('./routes/templates');
const approvalRoutes = require('./routes/approvals');
const userRoutes = require('./routes/users');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const reminderService = require('./services/reminderService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API 路由
app.use('/api/contracts', contractRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// 根路由 - API 首頁
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="utf-8">
      <title>合約簽核管理系統 API</title>
      <style>
        body { font-family: -apple-system, 'Microsoft JhengHei', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; line-height: 1.6; }
        h1 { color: #1a73e8; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
        .status { display: inline-flex; align-items: center; gap: 6px; background: #f0fdf4; color: #16a34a; padding: 4px 12px; border-radius: 20px; font-size: 14px; }
        .status::before { content: ''; width: 8px; height: 8px; background: #16a34a; border-radius: 50%; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        th { background: #f9fafb; color: #6b7280; font-weight: 600; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
        .hint { background: #eff6ff; border-left: 4px solid #1a73e8; padding: 12px 16px; border-radius: 0 6px 6px 0; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>合約簽核管理系統 API Server</h1>
      <p><span class="status">運作中</span></p>

      <div class="hint">
        前端介面請訪問: <a href="http://localhost:3000">http://localhost:3000</a><br>
        請先在 <code>frontend/</code> 目錄執行 <code>npm start</code> 啟動前端
      </div>

      <h3>API 端點一覽</h3>
      <table>
        <thead><tr><th>方法</th><th>路徑</th><th>說明</th></tr></thead>
        <tbody>
          <tr><td>GET</td><td><code>/api/health</code></td><td>健康檢查</td></tr>
          <tr><td>GET/POST</td><td><code>/api/contracts</code></td><td>合約列表 / 建立合約</td></tr>
          <tr><td>GET/PUT</td><td><code>/api/contracts/:id</code></td><td>合約詳情 / 更新</td></tr>
          <tr><td>GET/POST</td><td><code>/api/templates</code></td><td>範本管理</td></tr>
          <tr><td>POST</td><td><code>/api/approvals/submit</code></td><td>送簽</td></tr>
          <tr><td>POST</td><td><code>/api/approvals/action</code></td><td>核准 / 駁回 / 退回</td></tr>
          <tr><td>GET</td><td><code>/api/approvals/pending/:userId</code></td><td>待審核項目</td></tr>
          <tr><td>GET</td><td><code>/api/reports/dashboard</code></td><td>儀表板統計</td></tr>
          <tr><td>GET</td><td><code>/api/notifications/:userId</code></td><td>通知列表</td></tr>
        </tbody>
      </table>
    </body>
    </html>
  `);
});

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`合約簽核系統 API 已啟動: http://localhost:${PORT}`);
  reminderService.startScheduler();
});
