const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require(path.resolve(__dirname, '..', '04_Scripts_dan_Generator', 'node_modules', 'puppeteer'));

const PORT = 5055;
const UI_DIR = path.join(__dirname, 'ui');

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
    return res.end('Not Found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, async () => {
  console.log(`Preview server running at http://localhost:${PORT}`);

  try {
    const browserPath = findBrowserExecutable();
    console.log('Using browser:', browserPath);

    const launchOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    if (browserPath) launchOptions.executablePath = browserPath;

    const browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    await page.setViewport({ width: 1500, height: 920, deviceScaleFactor: 1 });
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 15000 });

    await new Promise(r => setTimeout(r, 800));

    // 1. Capture Dark Mode
    const darkPath = path.join(__dirname, 'preview_dark.png');
    await page.screenshot({ path: darkPath, fullPage: true });
    console.log(`Dark mode screenshot saved to: ${darkPath}`);

    // 2. Switch to Light Mode by clicking the toggle switch
    await page.click('#themeSwitchBtn');
    await new Promise(r => setTimeout(r, 600));

    // 3. Capture Light Mode
    const lightPath = path.join(__dirname, 'preview_light.png');
    await page.screenshot({ path: lightPath, fullPage: true });
    console.log(`Light mode screenshot saved to: ${lightPath}`);

    await browser.close();
  } catch (err) {
    console.error('Error capturing screenshot:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});
