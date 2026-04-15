const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, 'screenshots');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Use installed Edge
const EDGE_PATHS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const edgePath = EDGE_PATHS.find((p) => fs.existsSync(p));
if (!edgePath) {
  console.error('Edge not found');
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: edgePath,
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  async function snap(name) {
    const file = path.join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log('Saved', file);
  }

  const BASE = 'http://localhost:5173';

  // 1. Login page
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await snap('01-login');

  // Login
  await page.fill('input[type=email], input[placeholder*="company"]', 'admin@company.com');
  await page.fill('input[type=password]', 'pass1234');
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/, { timeout: 10000 });
  await page.waitForTimeout(1000);

  // 2. Dashboard
  await snap('02-dashboard');

  // 3. Contracts list
  await page.goto(BASE + '/contracts', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await snap('03-contract-list');

  // 4. Contract detail (click first row if exists)
  try {
    const link = await page.$('a[href*="/contracts/"][href$=""]:not([href*="new"])');
    if (link) {
      await link.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(800);
      await snap('04-contract-detail');
    } else {
      // fallback: navigate to detail by id 1
      await page.goto(BASE + '/contracts/1', { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await snap('04-contract-detail');
    }
  } catch (e) {
    await page.goto(BASE + '/contracts/1', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await snap('04-contract-detail');
  }

  // 5. Pending approvals
  await page.goto(BASE + '/approvals/pending', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await snap('05-pending-approvals');

  // 6. Pending approvals with row selected (batch approve ready)
  try {
    const checkbox = await page.$('.ant-table-tbody .ant-checkbox-input');
    if (checkbox) {
      await checkbox.click();
      await page.waitForTimeout(400);
      await snap('06-batch-approve-ready');
    } else {
      await snap('06-batch-approve-ready');
    }
  } catch (e) {
    await snap('06-batch-approve-ready');
  }

  // 7. Workflow settings
  await page.goto(BASE + '/settings/workflows', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await snap('07-workflow-settings');

  // 8. Admin reports
  await page.goto(BASE + '/admin/reports', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await snap('08-admin-reports');

  await browser.close();
  console.log('Done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
