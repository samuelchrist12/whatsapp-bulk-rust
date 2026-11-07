const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('C:\\Users\\Mueee\\Documents\\Mueee\\AI\\Swapro\\01_Aplikasi_Siap_Pakai\\Aplikasi_1_Auto_Print_Slip_Gaji\\node_modules\\puppeteer');

const PORT = 5057;
const UI_DIR = path.resolve(__dirname, '..', 'ui');

function findBrowserExecutable() {
  const chromePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  for (const p of chromePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return undefined;
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(UI_DIR, reqPath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not Found: ' + filePath);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, async () => {
  console.log(`[Test] Local server running on http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: findBrowserExecutable(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1480,920']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1480, height: 920 });

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

  // 1. Force Workspace view, Light theme, and English language
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('bulk_wa_theme', 'light');
    showView('workspace');
    applyLanguage('en');
    loadDemoContacts();
  });

  await new Promise(r => setTimeout(r, 600));

  const brainDir = 'C:/Users/Mueee/.gemini/antigravity/brain/e5e507e8-17db-47ea-a79e-411452b8944d';
  await page.screenshot({ path: `${brainDir}/preview_v1_workspace_en_light.png` });
  console.log('[Test] Captured: preview_v1_workspace_en_light.png');

  // 2. Trigger Dummy Success Modal in Light Mode
  await page.evaluate(() => {
    triggerDummySuccess();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${brainDir}/preview_v1_modal_success_light.png` });
  console.log('[Test] Captured: preview_v1_modal_success_light.png');

  // Close modal
  await page.evaluate(() => {
    closeCompletionModal();
  });
  await new Promise(r => setTimeout(r, 300));

  // 3. Trigger Dummy Failed Modal in Light Mode
  await page.evaluate(() => {
    triggerDummyFailed();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${brainDir}/preview_v1_modal_failed_light.png` });
  console.log('[Test] Captured: preview_v1_modal_failed_light.png');

  // Close modal
  await page.evaluate(() => {
    closeCompletionModal();
  });
  await new Promise(r => setTimeout(r, 300));

  // 4. Trigger Reset Confirm Modal in Light Mode
  await page.evaluate(() => {
    resetWhatsAppSession();
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${brainDir}/preview_v1_confirm_reset_light.png` });
  console.log('[Test] Captured: preview_v1_confirm_reset_light.png');

  // Close confirm modal
  await page.evaluate(() => {
    closeCustomConfirm();
  });
  await new Promise(r => setTimeout(r, 300));

  // 5. Open Notification History Drawer in Light Mode
  await page.evaluate(() => {
    toggleNotificationDrawer(true);
  });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: `${brainDir}/preview_v1_drawer_light.png` });
  console.log('[Test] Captured: preview_v1_drawer_light.png');

  await browser.close();
  server.close();
  console.log('[Test] All verification screenshots captured successfully!');
  process.exit(0);
});
