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

let Client, LocalAuth, MessageMedia;
try {
  ({ Client, LocalAuth, MessageMedia } = require('whatsapp-web.js'));
} catch (e) {
  ({ Client, LocalAuth, MessageMedia } = require(path.join(fallbackModules, 'whatsapp-web.js')));
}

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

const AUTH_DIR = path.join(__dirname, '.wa_session');
const PID_FILE = path.join(__dirname, 'browser.pid');

let waClient = null;
let waStatus = 'DISCONNECTED'; // DISCONNECTED, INITIALIZING, QR_READY, AUTHENTICATED, READY
let qrDataUrl = null;
let clientInfo = null;

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
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe')
  ];
  for (const p of chromePaths) {
    if (p && fs.existsSync(p)) return p;
  }
  return undefined;
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
  }

  const puppeteerConfig = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  };

  if (browserPath) puppeteerConfig.executablePath = browserPath;

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
    puppeteer: puppeteerConfig
  });

  waClient.on('qr', async (qr) => {
    waStatus = 'QR_READY';
    try {
      qrDataUrl = await qrcode.toDataURL(qr, { width: 320, margin: 2 });
      addLog('info', 'QR Code WhatsApp siap untuk di-scan.');
    } catch (err) {
      addLog('error', 'Gagal generate QR Code: ' + err.message);
    }
  });

  waClient.on('authenticated', () => {
    waStatus = 'AUTHENTICATED';
    qrDataUrl = null;
    addLog('info', 'Autentikasi akun berhasil! Menyelaraskan sesi...');
  });

  waClient.on('ready', () => {
    waStatus = 'READY';
    qrDataUrl = null;
    clientInfo = waClient.info ? {
      name: waClient.info.pushname || 'User',
      phone: waClient.info.wid ? waClient.info.wid.user : ''
    } : { name: 'Pengguna WhatsApp', phone: '' };
    addLog('success', `WhatsApp Terhubung: ${clientInfo.name} (${clientInfo.phone})`);
  });

  waClient.on('auth_failure', (msg) => {
    waStatus = 'DISCONNECTED';
    qrDataUrl = null;
    addLog('error', 'Autentikasi gagal: ' + msg);
  });

  waClient.on('disconnected', async (reason) => {
    waStatus = 'DISCONNECTED';
    qrDataUrl = null;
    clientInfo = null;
    addLog('warning', 'Koneksi WhatsApp terputus: ' + reason);
  });

  const pidCheck = setInterval(() => {
    try {
      if (waClient && waClient.pupBrowser) {
        const proc = waClient.pupBrowser.process();
        if (proc && proc.pid) {
          fs.writeFileSync(PID_FILE, String(proc.pid), 'utf-8');
          clearInterval(pidCheck);
        }
      }
    } catch (e) {}
  }, 500);
  setTimeout(() => clearInterval(pidCheck), 25000);

  waClient.initialize().catch(err => {
    waStatus = 'DISCONNECTED';
    addLog('error', 'Inisialisasi browser gagal: ' + err.message);
  });
}

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

app.post('/api/wa/connect', (req, res) => {
  if (waStatus === 'READY') {
    return res.json({ success: true, message: 'WhatsApp sudah terhubung.' });
  }
  initWhatsApp();
  res.json({ success: true, message: 'Memulai inisialisasi WhatsApp...' });
});

app.post('/api/wa/reset-session', async (req, res) => {
  try {
    if (waClient) {
      try { await waClient.destroy(); } catch (e) {}
      waClient = null;
    }
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
    if (!folderPath || !fs.existsSync(folderPath)) {
      return res.status(400).json({ error: `Direktori lampiran tidak ditemukan: ${folderPath}` });
    }

    const stat = fs.statSync(folderPath);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: `Path bukan direktori folder: ${folderPath}` });
    }

    const files = fs.readdirSync(folderPath);
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx', 'csv', 'zip', 'txt'];

    const indexed = [];
    for (const file of files) {
      const fullPath = path.join(folderPath, file);
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

// Single Test Message
app.post('/api/wa/send-test', async (req, res) => {
  try {
    if (waStatus !== 'READY') {
      return res.status(400).json({ success: false, error: 'WhatsApp belum terhubung. Silakan scan QR code terlebih dahulu.' });
    }

    const { targetPhone, messageText, filePath } = req.body;
    if (!targetPhone) {
      return res.status(400).json({ success: false, error: 'Nomor telepon tujuan belum diisi.' });
    }

    const clean = formatPhone(targetPhone);
    const chatId = clean + '@c.us';

    let media = null;
    if (filePath && fs.existsSync(filePath)) {
      media = MessageMedia.fromFilePath(filePath);
      media.filename = path.basename(filePath);
    }

    addLog('info', `Mengirim pesan uji coba ke ${clean}...`);

    if (media) {
      await waClient.sendMessage(chatId, media, { caption: messageText || '', sendMediaAsDocument: true });
      addLog('success', `Uji coba BERHASIL terkirim ke ${clean} dengan lampiran: ${media.filename}`);
    } else {
      await waClient.sendMessage(chatId, messageText || 'Uji coba pesan dari Bulk WA Sender by schrist.design');
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
    if (waStatus !== 'READY') {
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
            reason: 'Nomor tidak valid'
          });
          addLog('error', `[${i + 1}/${targets.length}] Lewati ${item.recipientName}: Nomor tidak valid ('${item.phone}')`);
          continue;
        }

        const chatId = clean + '@c.us';

        let media = null;
        if (item.filePath && fs.existsSync(item.filePath)) {
          try {
            media = MessageMedia.fromFilePath(item.filePath);
            media.filename = path.basename(item.filePath);
          } catch (e) {
            console.warn('Gagal membaca media lampiran:', e.message);
          }
        }

        try {
          if (media) {
            await waClient.sendMessage(chatId, media, { caption: item.messageText || '', sendMediaAsDocument: true });
            broadcastState.success++;
            addLog('success', `[${i + 1}/${targets.length}] TERKIRIM ke ${item.recipientName} (${clean}) + File: ${media.filename}`);
          } else {
            await waClient.sendMessage(chatId, item.messageText || '');
            broadcastState.success++;
            addLog('success', `[${i + 1}/${targets.length}] TERKIRIM ke ${item.recipientName} (${clean}) [Teks Saja]`);
          }
        } catch (err) {
          broadcastState.failed++;
          broadcastState.failedTargets.push({
            id: item.id,
            recipientName: item.recipientName,
            phone: clean,
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

app.listen(PORT, () => {
  console.log(`=== WhatsApp Engine Sidecar (by schrist.) berjalan di port ${PORT} ===`);
  initWhatsApp();
});
