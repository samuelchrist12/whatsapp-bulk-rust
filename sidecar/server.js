/**
 * Bulk WA Sender - WhatsApp Engine Sidecar
 * by schrist.
 */

const path = require('path');
const fs = require('fs');

// Ensure module resolution falls back to 04_Scripts_dan_Generator/node_modules if not present locally
const fallbackModules = path.resolve(__dirname, '..', '..', '04_Scripts_dan_Generator', 'node_modules');
if (fs.existsSync(fallbackModules)) {
  module.paths.push(fallbackModules);
}

const express = require('express');
const qrcode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3847;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Allow CORS for local Tauri UI
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

function resolveUserDataDir() {
  const customDir = process.env.BULK_WA_DATA_DIR;
  const baseDir = customDir
    ? path.resolve(customDir)
    : path.join(process.env.LOCALAPPDATA || process.env.APPDATA || __dirname, 'BulkWASender');
  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch (e) {}
  return baseDir;
}

const DATA_DIR = resolveUserDataDir();
const AUTH_DIR = path.join(DATA_DIR, '.wa_session');
const PID_FILE = path.join(DATA_DIR, 'browser.pid');

function migrateLegacySessionIfNeeded() {
  try {
    if (fs.existsSync(path.join(AUTH_DIR, 'session'))) return;
    const legacyCandidates = [
      path.join(__dirname, '.wa_session'),
      path.resolve(__dirname, '..', 'sidecar', '.wa_session')
    ];
    const skipNames = new Set(['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'DevToolsActivePort', 'LOCK', 'lockfile']);
    for (const legacyDir of legacyCandidates) {
      if (legacyDir !== AUTH_DIR && fs.existsSync(path.join(legacyDir, 'session'))) {
        fs.cpSync(legacyDir, AUTH_DIR, {
          recursive: true,
          force: false,
          filter: (src) => !skipNames.has(path.basename(src))
        });
        console.log(`[Session Migration] Copied existing WhatsApp session from ${legacyDir} to ${AUTH_DIR}`);
        break;
      }
    }
  } catch (e) {
    console.warn('[Session Migration] Skipped:', e.message);
  }
}

migrateLegacySessionIfNeeded();

let waClient = null;
let waStatus = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, QR_READY, AUTHENTICATED, READY
let qrDataUrl = null;
let clientInfo = null;
let recoveryPromise = null;
let isDestroyingClient = false;

let broadcastState = {
  isRunning: false,
  isPaused: false,
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  currentName: '',
  logs: [],
  failedTargets: []
};

function addLog(type, message) {
  const time = new Date().toLocaleTimeString('id-ID');
  const entry = { id: Date.now() + Math.random(), time, type, message };
  broadcastState.logs.unshift(entry);
  if (broadcastState.logs.length > 250) broadcastState.logs.pop();
  console.log(`[${time}] [${type.toUpperCase()}] ${message}`);
}

function cleanupBrowserProcess() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
      if (pid && !isNaN(pid)) {
        try {
          const { execSync } = require('child_process');
          execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        } catch (e) {}
      }
      try { fs.unlinkSync(PID_FILE); } catch (e) {}
    }
  } catch (e) {}
}

function cleanStaleAuthLocks() {
  cleanupBrowserProcess();
  const sessionDir = path.join(AUTH_DIR, 'session');
  if (fs.existsSync(sessionDir)) {
    const lockFiles = [
      path.join(sessionDir, 'SingletonLock'),
      path.join(sessionDir, 'SingletonSocket'),
      path.join(sessionDir, 'SingletonCookie'),
      path.join(sessionDir, 'DevToolsActivePort'),
      path.join(sessionDir, 'Default', 'LOCK'),
      path.join(sessionDir, 'Default', 'lockfile')
    ];
    lockFiles.forEach(p => {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch (e) {}
    });
  }
}

process.on('exit', () => cleanupBrowserProcess());
process.on('SIGINT', () => { cleanupBrowserProcess(); process.exit(0); });
process.on('SIGTERM', () => { cleanupBrowserProcess(); process.exit(0); });

function findBrowserExecutable() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  const browserCandidates = [
    path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
    path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
    localAppData ? path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe') : '',
    path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
    path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
    localAppData ? path.join(localAppData, 'Microsoft\\Edge\\Application\\msedge.exe') : '',
    path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
    path.join(programFilesX86, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
    localAppData ? path.join(localAppData, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe') : ''
  ];
  for (const p of browserCandidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return undefined;
}

function isDetachedFrameError(err) {
  const msg = String((err && err.message) || err || '').toLowerCase();
  return (
    msg.includes('detached frame') ||
    msg.includes('frame was detached') ||
    msg.includes('execution context was destroyed') ||
    msg.includes('cannot find context with specified id') ||
    msg.includes('target closed') ||
    msg.includes('session closed') ||
    msg.includes('most likely the page has been closed') ||
    msg.includes('protocol error')
  );
}

async function destroyCurrentClient() {
  if (!waClient) return;
  const clientToClose = waClient;
  waClient = null;
  isDestroyingClient = true;
  try {
    await Promise.race([
      clientToClose.destroy(),
      new Promise((resolve) => setTimeout(resolve, 5000))
    ]);
  } catch (e) {
    // Ignore errors when closing a crashed/detached browser
  } finally {
    isDestroyingClient = false;
  }
}

async function checkClientFrameHealth() {
  if (!waClient || waStatus !== 'READY') return false;
  try {
    const browser = waClient.pupBrowser;
    const page = waClient.pupPage;
    if (!browser || (typeof browser.isConnected === 'function' && !browser.isConnected())) {
      return false;
    }
    if (!page || (typeof page.isClosed === 'function' && page.isClosed())) {
      return false;
    }
    const mainFrame = typeof page.mainFrame === 'function' ? page.mainFrame() : null;
    if (!mainFrame || (typeof mainFrame.isDetached === 'function' && mainFrame.isDetached())) {
      return false;
    }

    const probeOk = await Promise.race([
      page.evaluate(() => Boolean(window.WWebJS && typeof window.require === 'function')),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Frame health probe timeout')), 4000))
    ]);
    return Boolean(probeOk);
  } catch (err) {
    return false;
  }
}

async function waitForReadyStatus(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (waStatus === 'READY') return true;
    if (waStatus === 'QR_READY') {
      throw new Error('Sesi WhatsApp memerlukan scan ulang QR Code.');
    }
    if (waStatus === 'DISCONNECTED') {
      throw new Error('Koneksi browser WhatsApp terputus saat pemulihan.');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Waktu tunggu pemulihan koneksi WhatsApp habis (timeout).');
}

async function recoverWhatsAppSession(reason = 'Frame browser tidak responsif') {
  if (recoveryPromise) {
    return recoveryPromise;
  }

  recoveryPromise = (async () => {
    addLog('warning', `[Auto-Recovery] Menyegarkan engine browser WhatsApp (${reason})...`);
    await destroyCurrentClient();
    cleanStaleAuthLocks();
    waStatus = 'DISCONNECTED';
    initWhatsApp();
    await waitForReadyStatus(45000);
    addLog('success', '[Auto-Recovery] Sesi WhatsApp berhasil dipulihkan dan siap mengirim pesan.');
    return true;
  })();

  try {
    return await recoveryPromise;
  } finally {
    recoveryPromise = null;
  }
}

function initWhatsApp() {
  if (waStatus === 'INITIALIZING') return;
  if (waClient) {
    try { waClient.destroy(); } catch (e) {}
    waClient = null;
  }

  cleanStaleAuthLocks();
  waStatus = 'INITIALIZING';
  qrDataUrl = null;

  const browserPath = findBrowserExecutable();
  if (browserPath) {
    addLog('info', `Membuka WhatsApp Engine via: ${path.basename(browserPath)}`);
  } else if (process.platform === 'win32') {
    waStatus = 'DISCONNECTED';
    addLog('error', 'Browser Microsoft Edge atau Google Chrome tidak ditemukan di PC ini. Pastikan Microsoft Edge atau Google Chrome terpasang.');
    return;
  }

  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-ipc-flooding-protection',
      '--disable-hang-monitor',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees,IsolateOrigins,site-per-process,BackForwardCache,OptimizationHints,MediaRouter,CalculateNativeWinOcclusion,IntensiveWakeUpThrottling'
    ]
  };

  if (browserPath) puppeteerConfig.executablePath = browserPath;

  const activeClient = new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
    webVersionCache: {
      type: 'local',
      path: path.join(AUTH_DIR, 'web_cache')
    },
    puppeteer: puppeteerConfig
  });
  waClient = activeClient;

  activeClient.on('qr', async (qr) => {
    if (waClient !== activeClient) return;
    waStatus = 'QR_READY';
    try {
      qrDataUrl = await qrcode.toDataURL(qr, { width: 320, margin: 2 });
      addLog('info', 'QR Code WhatsApp siap untuk di-scan.');
    } catch (err) {
      addLog('error', 'Gagal generate QR Code: ' + err.message);
    }
  });

  activeClient.on('authenticated', () => {
    if (waClient !== activeClient) return;
    waStatus = 'AUTHENTICATED';
    qrDataUrl = null;
    addLog('info', 'Autentikasi akun berhasil! Menyelaraskan sesi...');
  });

  activeClient.on('ready', () => {
    if (waClient !== activeClient) return;
    waStatus = 'READY';
    qrDataUrl = null;
    clientInfo = activeClient.info ? {
      name: activeClient.info.pushname || 'User',
      phone: activeClient.info.wid ? activeClient.info.wid.user : ''
    } : { name: 'Pengguna WhatsApp', phone: '' };
    addLog('success', `WhatsApp Terhubung: ${clientInfo.name} (${clientInfo.phone})`);
  });

  activeClient.on('auth_failure', (msg) => {
    if (waClient !== activeClient) return;
    waStatus = 'DISCONNECTED';
    qrDataUrl = null;
    addLog('error', 'Autentikasi gagal: ' + msg);
  });

  activeClient.on('disconnected', async (reason) => {
    if (waClient !== activeClient || isDestroyingClient) return;
    waStatus = 'DISCONNECTED';
    qrDataUrl = null;
    clientInfo = null;
    addLog('warning', 'Koneksi WhatsApp terputus: ' + reason);
  });

  let browserDisconnectBound = false;
  const pidCheck = setInterval(() => {
    try {
      if (activeClient && activeClient.pupBrowser) {
        if (!browserDisconnectBound) {
          browserDisconnectBound = true;
          activeClient.pupBrowser.once('disconnected', () => {
            if (waClient === activeClient && !isDestroyingClient && waStatus === 'READY') {
              waStatus = 'DISCONNECTED';
              addLog('warning', 'Proses browser headless tertutup tak terduga. Menjadwalkan pemulihan sesi...');
              recoverWhatsAppSession('Browser headless terputus').catch(() => {});
            }
          });
        }
        const proc = activeClient.pupBrowser.process();
        if (proc && proc.pid) {
          fs.writeFileSync(PID_FILE, String(proc.pid), 'utf-8');
          clearInterval(pidCheck);
        }
      }
    } catch (e) {}
  }, 500);
  setTimeout(() => clearInterval(pidCheck), 25000);

  activeClient.initialize().catch(err => {
    if (waClient !== activeClient || isDestroyingClient) return;
    waStatus = 'DISCONNECTED';
    addLog('error', 'Inisialisasi browser gagal: ' + err.message);
  });
}

// Background watchdog to heal idle detached frames before user initiates dispatch
setInterval(async () => {
  if (waStatus !== 'READY' || broadcastState.isRunning || recoveryPromise || isDestroyingClient) {
    return;
  }
  const healthy = await checkClientFrameHealth();
  if (!healthy && waStatus === 'READY' && !recoveryPromise) {
    recoverWhatsAppSession('Frame browser idle terdeteksi stale/detached').catch((err) => {
      addLog('error', '[Auto-Recovery] Gagal memulihkan sesi idle: ' + err.message);
    });
  }
}, 45000);

function formatPhone(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) clean = '62' + clean.slice(1);
  if (clean.startsWith('8')) clean = '62' + clean;
  if (!clean.startsWith('62')) clean = '62' + clean;
  return clean;
}

// ----------------------------------------------------
// API ENDPOINTS
// ----------------------------------------------------
app.get('/api/wa/status', (req, res) => {
  res.json({
    status: waStatus,
    qrCode: qrDataUrl,
    clientInfo: clientInfo
  });
});

app.post('/api/wa/connect', async (req, res) => {
  if (waStatus === 'READY') {
    const healthy = await checkClientFrameHealth();
    if (healthy) {
      return res.json({ success: true, message: 'WhatsApp sudah terhubung.' });
    }
    recoverWhatsAppSession('Permintaan koneksi ulang pada frame tidak responsif').catch(() => {});
    return res.json({ success: true, message: 'Menyegarkan sesi koneksi WhatsApp...' });
  }
  initWhatsApp();
  res.json({ success: true, message: 'Memulai inisialisasi WhatsApp...' });
});

app.post('/api/wa/reset-session', async (req, res) => {
  try {
    await destroyCurrentClient();
    cleanStaleAuthLocks();
    if (fs.existsSync(AUTH_DIR)) {
      try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch (e) {}
    }
    waStatus = 'DISCONNECTED';
    qrDataUrl = null;
    clientInfo = null;
    addLog('warning', 'Sesi WhatsApp direset bersih.');
    initWhatsApp();
    res.json({ success: true, message: 'Sesi WhatsApp berhasil direset.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scan Attachments Folder (Direct filesystem access for browser/webview mode)
app.post('/api/scan-attachments', (req, res) => {
  try {
    const { folderPath, matchingMode, records } = req.body;
    if (!folderPath || !String(folderPath).trim()) {
      return res.status(400).json({ error: 'Attachment directory path is empty.' });
    }

    const rawFolder = String(folderPath).trim();
    const candidates = path.isAbsolute(rawFolder)
      ? [rawFolder]
      : [
          rawFolder,
          path.resolve(__dirname, '..', rawFolder),
          rawFolder.includes('data_contoh') ? path.resolve(__dirname, '..', rawFolder.replace('data_contoh', 'sample_data').replace('lampiran', 'attachments')) : ''
        ].filter(Boolean);

    let resolvedFolder = null;
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          if (fs.statSync(cand).isDirectory()) {
            resolvedFolder = cand;
            break;
          }
        } catch (e) {}
      }
    }

    if (!resolvedFolder) {
      return res.status(400).json({ error: `Attachment directory not found: ${rawFolder}` });
    }

    const files = fs.readdirSync(resolvedFolder);
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx', 'csv', 'zip', 'txt'];

    const indexed = [];
    for (const file of files) {
      const fullPath = path.join(resolvedFolder, file);
      try {
        const fileStat = fs.statSync(fullPath);
        if (fileStat.isFile()) {
          const ext = path.extname(file).replace('.', '').toLowerCase();
          if (allowedExts.includes(ext)) {
            const stem = path.basename(file, path.extname(file)).toLowerCase().trim();
            indexed.push({
              name: file,
              fullPath,
              ext,
              stem,
              sizeKb: Math.round(fileStat.size / 1024)
            });
          }
        }
      } catch (e) {}
    }

    const matches = [];
    let foundCount = 0;

    for (const rec of (records || [])) {
      const query = (matchingMode === 'by_column' ? (rec.custom_column_val || '') : (rec.recipient_name || '')).trim();
      const normQuery = query.toLowerCase();

      let matchFile = null;
      if (normQuery) {
        matchFile = indexed.find(f => f.name.toLowerCase() === normQuery || f.stem === normQuery)
                 || indexed.find(f => f.stem.includes(normQuery) || normQuery.includes(f.stem));
      }

      const exists = !!matchFile;
      if (exists) foundCount++;

      let category = 'none';
      if (matchFile) {
        if (matchFile.ext === 'pdf') category = 'pdf';
        else if (['jpg', 'jpeg', 'png', 'webp'].includes(matchFile.ext)) category = 'image';
        else if (['zip', 'rar', '7z'].includes(matchFile.ext)) category = 'archive';
        else category = 'document';
      }

      matches.push({
        record_id: String(rec.id),
        expected_query: query,
        file_name: matchFile ? matchFile.name : (query ? `${query}.pdf` : '-'),
        full_path: matchFile ? matchFile.fullPath : '',
        exists,
        size_kb: matchFile ? matchFile.sizeKb : 0,
        file_category: category
      });
    }

    const totalRecords = records ? records.length : 0;
    const matchPercentage = totalRecords > 0 ? (foundCount / totalRecords) * 100 : 0;

    return res.json({
      folder_path: folderPath,
      total_records: totalRecords,
      found_count: foundCount,
      missing_count: totalRecords - foundCount,
      match_percentage: parseFloat(matchPercentage.toFixed(1)),
      matches
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function ensureClientReadyForDispatch() {
  if (recoveryPromise) {
    await recoveryPromise;
  }
  if (waStatus === 'INITIALIZING' || waStatus === 'AUTHENTICATED') {
    await waitForReadyStatus(35000);
  }
  if (waStatus !== 'READY') {
    throw new Error('WhatsApp belum terhubung. Silakan scan QR code terlebih dahulu.');
  }
  const healthy = await checkClientFrameHealth();
  if (!healthy) {
    await recoverWhatsAppSession('Frame browser terdeteksi terputus sebelum pengiriman');
  }
}

async function dispatchWhatsAppMessage({ cleanPhone, messageText, filePath, fallbackText = '' }) {
  let media = null;
  if (filePath && fs.existsSync(filePath)) {
    media = MessageMedia.fromFilePath(filePath);
    media.filename = path.basename(filePath);
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await ensureClientReadyForDispatch();

      let chatId = `${cleanPhone}@c.us`;
      const isSelfChat = Boolean(clientInfo && clientInfo.phone && cleanPhone === clientInfo.phone);

      const resolvedWid = await waClient.getNumberId(cleanPhone);
      if (resolvedWid && resolvedWid._serialized) {
        chatId = resolvedWid._serialized;
      } else if (!isSelfChat) {
        throw new Error(`Nomor WhatsApp tidak terdaftar (${cleanPhone})`);
      }

      if (media) {
        await waClient.sendMessage(chatId, media, {
          caption: messageText || '',
          sendMediaAsDocument: true,
          sendSeen: false
        });
      } else {
        await waClient.sendMessage(chatId, messageText || fallbackText, {
          sendSeen: false
        });
      }

      return { chatId, media };
    } catch (err) {
      if (attempt === 1 && isDetachedFrameError(err)) {
        addLog('warning', `[Auto-Retry] Mendeteksi detached frame saat mengirim ke ${cleanPhone}. Memulihkan sesi & mencoba ulang otomatis...`);
        await recoverWhatsAppSession(err.message);
        continue;
      }
      throw err;
    }
  }
}

// Single Test Message
app.post('/api/wa/send-test', async (req, res) => {
  try {
    if (waStatus !== 'READY' && waStatus !== 'INITIALIZING' && waStatus !== 'AUTHENTICATED' && !recoveryPromise) {
      return res.status(400).json({ success: false, error: 'WhatsApp belum terhubung. Silakan scan QR code terlebih dahulu.' });
    }

    const { targetPhone, messageText, filePath } = req.body;
    if (!targetPhone) {
      return res.status(400).json({ success: false, error: 'Nomor telepon tujuan belum diisi.' });
    }

    const clean = formatPhone(targetPhone);
    if (!clean || clean.length < 9) {
      return res.status(400).json({ success: false, error: `Nomor telepon tidak valid (${targetPhone}).` });
    }

    addLog('info', `Mengirim pesan uji coba ke ${clean}...`);

    const { media } = await dispatchWhatsAppMessage({
      cleanPhone: clean,
      messageText,
      filePath,
      fallbackText: 'Uji coba pesan dari Bulk WA Sender by schrist.'
    });

    if (media) {
      addLog('success', `Uji coba BERHASIL terkirim ke ${clean} dengan lampiran: ${media.filename}`);
    } else {
      addLog('success', `Uji coba BERHASIL terkirim ke ${clean} (Pesan Teks)`);
    }

    res.json({ success: true, message: `Pesan uji coba berhasil terkirim ke ${clean}` });
  } catch (err) {
    addLog('error', 'Gagal mengirim pesan uji coba: ' + err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk Broadcast Execution
app.post('/api/wa/send-broadcast', async (req, res) => {
  try {
    if (waStatus !== 'READY' && waStatus !== 'INITIALIZING' && waStatus !== 'AUTHENTICATED' && !recoveryPromise) {
      return res.status(400).json({ success: false, error: 'WhatsApp belum terhubung.' });
    }
    if (broadcastState.isRunning) {
      return res.status(400).json({ success: false, error: 'Proses pengiriman sedang berjalan.' });
    }

    const { targets, minDelaySec, maxDelaySec, batchSize, batchDelaySec } = req.body;
    if (!Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({ success: false, error: 'Daftar penerima kosong.' });
    }

    broadcastState = {
      isRunning: true,
      isPaused: false,
      total: targets.length,
      processed: 0,
      success: 0,
      failed: 0,
      currentName: '',
      logs: broadcastState.logs,
      failedTargets: []
    };

    const minDelay = Math.max(2, Number(minDelaySec) || 3);
    const maxDelay = Math.max(minDelay, Number(maxDelaySec) || 7);
    const bSize = Number(batchSize) > 0 ? Number(batchSize) : 0;
    const bDelay = Math.max(5, Number(batchDelaySec) || 60);

    let infoMsg = `Memulai broadcast ke ${targets.length} penerima. Jeda acak: ${minDelay}-${maxDelay} detik.`;
    if (bSize > 0) {
      infoMsg += ` Anti-Ban Cooldown: Jeda ${bDelay} detik setiap ${bSize} pesan.`;
    }
    addLog('info', infoMsg);

    (async () => {
      let sentInBatch = 0;

      for (let i = 0; i < targets.length; i++) {
        if (!broadcastState.isRunning) {
          addLog('warning', 'Broadcast dihentikan oleh pengguna.');
          break;
        }

        while (broadcastState.isPaused && broadcastState.isRunning) {
          await new Promise(r => setTimeout(r, 1000));
        }
        if (!broadcastState.isRunning) break;

        const item = targets[i];
        broadcastState.currentName = item.recipientName || 'Kontak';
        broadcastState.processed = i + 1;

        const clean = formatPhone(item.phone);
        if (!clean || clean.length < 9) {
          broadcastState.failed++;
          broadcastState.failedTargets.push({
            id: item.id,
            recipientName: item.recipientName,
            phone: item.phone,
            error: 'Nomor tidak valid',
            reason: 'Nomor tidak valid'
          });
          addLog('error', `[${i + 1}/${targets.length}] Lewati ${item.recipientName}: Nomor tidak valid ('${item.phone}')`);
          continue;
        }

        try {
          const { media } = await dispatchWhatsAppMessage({
            cleanPhone: clean,
            messageText: item.messageText || '',
            filePath: item.filePath,
            fallbackText: ''
          });

          broadcastState.success++;
          if (media) {
            addLog('success', `[${i + 1}/${targets.length}] TERKIRIM ke ${item.recipientName} (${clean}) + File: ${media.filename}`);
          } else {
            addLog('success', `[${i + 1}/${targets.length}] TERKIRIM ke ${item.recipientName} (${clean}) [Teks Saja]`);
          }
        } catch (err) {
          broadcastState.failed++;
          broadcastState.failedTargets.push({
            id: item.id,
            recipientName: item.recipientName,
            phone: clean,
            error: err.message,
            reason: err.message
          });
          addLog('error', `[${i + 1}/${targets.length}] Gagal ke ${item.recipientName} (${clean}): ${err.message}`);
        }

        sentInBatch++;

        // Batch Cooldown Delay
        if (bSize > 0 && sentInBatch >= bSize && i < targets.length - 1 && broadcastState.isRunning) {
          sentInBatch = 0;
          addLog('warning', `[Cooldown Anti-Ban] Telah mengirim batch ${bSize} pesan. Istirahat sejenak selama ${bDelay} detik...`);
          for (let s = 0; s < bDelay; s++) {
            if (!broadcastState.isRunning) break;
            while (broadcastState.isPaused && broadcastState.isRunning) {
              await new Promise(r => setTimeout(r, 1000));
            }
            await new Promise(r => setTimeout(r, 1000));
          }
        } else if (i < targets.length - 1 && broadcastState.isRunning) {
          // Standard Per-Message Jitter Delay
          const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
          addLog('info', `Jeda aman ${delay} detik sebelum pengiriman berikutnya...`);
          for (let s = 0; s < delay; s++) {
            if (!broadcastState.isRunning) break;
            while (broadcastState.isPaused && broadcastState.isRunning) {
              await new Promise(r => setTimeout(r, 1000));
            }
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }

      broadcastState.isRunning = false;
      broadcastState.isPaused = false;
      broadcastState.currentName = '';
      addLog('success', `Broadcast Selesai! Sukses: ${broadcastState.success}, Gagal: ${broadcastState.failed} dari total ${targets.length}.`);
    })();

    res.json({ success: true, message: 'Broadcast dimulai.' });
  } catch (err) {
    broadcastState.isRunning = false;
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/wa/control', (req, res) => {
  const { action } = req.body;
  if (action === 'pause') {
    broadcastState.isPaused = true;
    addLog('warning', 'Broadcast dijeda (PAUSED).');
  } else if (action === 'resume') {
    broadcastState.isPaused = false;
    addLog('info', 'Broadcast dilanjutkan (RESUMED).');
  } else if (action === 'stop') {
    broadcastState.isRunning = false;
    broadcastState.isPaused = false;
    addLog('warning', 'Broadcast dihentikan (STOPPED).');
  }
  res.json({ success: true, state: broadcastState });
});

app.get('/api/wa/progress', (req, res) => {
  res.json({ success: true, state: broadcastState });
});

app.post('/api/wa/shutdown', (req, res) => {
  isDestroyingClient = true;
  broadcastState.isRunning = false;
  broadcastState.isPaused = false;
  res.json({ success: true, message: 'Shutting down WhatsApp Engine cleanly.' });

  setImmediate(async () => {
    try {
      await destroyCurrentClient();
    } catch (e) {}
    cleanStaleAuthLocks();
    process.exit(0);
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`=== WhatsApp Engine Sidecar (by schrist.) berjalan di http://127.0.0.1:${PORT} [Data: ${DATA_DIR}] ===`);
  initWhatsApp();
});
