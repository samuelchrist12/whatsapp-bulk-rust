/**
 * Bulk WA Sender - Frontend Controller
 * by schrist.
 */

// Global State
let contactsData = [];
let selectedContactIds = new Set();
let currentExcelMeta = null;
let currentMatchingSummary = null;
let activeDeliveryMode = 'text'; // 'text' | 'attachment'

let isTauriEnv = false;
let tauriCore = null;

let waPollTimer = null;
let broadcastPollTimer = null;
let isBroadcasting = false;
let broadcastStartTime = 0;
let notificationHistory = [];
let unreadNotifCount = 0;

const SIDECAR_API = 'http://localhost:3847';

// DOM References
const waStatusBadge = document.getElementById('waStatusBadge');
const waStatusText = document.getElementById('waStatusText');
const btnConnectWA = document.getElementById('btnConnectWA');
const btnResetWA = document.getElementById('btnResetWA');

// Gateway & Workspace View Elements
const appGateway = document.getElementById('appGateway');
const appWorkspace = document.getElementById('appWorkspace');
const gatewayLoadingBox = document.getElementById('gatewayLoadingBox');
const gatewayQRBox = document.getElementById('gatewayQRBox');
const gatewayStatusText = document.getElementById('gatewayStatusText');
const gatewaySubHint = document.getElementById('gatewaySubHint');
const gatewayQRImage = document.getElementById('gatewayQRImage');
const gatewayQRSpinner = document.getElementById('gatewayQRSpinner');
const btnGatewayRefreshQR = document.getElementById('btnGatewayRefreshQR');

const modeBtnText = document.getElementById('modeBtnText');
const modeBtnAttachment = document.getElementById('modeBtnAttachment');
const attachmentConfigCard = document.getElementById('attachmentConfigCard');
const matchPercentageBadge = document.getElementById('matchPercentageBadge');

const excelDropzone = document.getElementById('excelDropzone');
const excelFileInput = document.getElementById('excelFileInput');
const btnBrowseFile = document.getElementById('btnBrowseFile');
const btnUseDemoData = document.getElementById('btnUseDemoData');
const activeFileChip = document.getElementById('activeFileChip');
const activeFileName = document.getElementById('activeFileName');
const sheetSelect = document.getElementById('sheetSelect');
const btnChangeFile = document.getElementById('btnChangeFile');

const btnToggleMapping = document.getElementById('btnToggleMapping');
const mappingDrawer = document.getElementById('mappingDrawer');
const mappingStatusSummary = document.getElementById('mappingStatusSummary');
const mapNameCol = document.getElementById('mapNameCol');
const mapPhoneCol = document.getElementById('mapPhoneCol');
const mapCustomCol = document.getElementById('mapCustomCol');

const attachmentFolderInput = document.getElementById('attachmentFolderInput');
const btnScanFolder = document.getElementById('btnScanFolder');
const btnPresetDemoFolder = document.getElementById('btnPresetDemoFolder');

const messageTemplate = document.getElementById('messageTemplate');
const dynamicTagsContainer = document.getElementById('dynamicTagsContainer');
const minDelayInput = document.getElementById('minDelayInput');
const maxDelayInput = document.getElementById('maxDelayInput');
const chkCooldownBatch = document.getElementById('chkCooldownBatch');
const batchSizeInput = document.getElementById('batchSizeInput');
const batchDelayInput = document.getElementById('batchDelayInput');

const livePreviewText = document.getElementById('livePreviewText');
const previewRecipientName = document.getElementById('previewRecipientName');
const previewContactSelect = document.getElementById('previewContactSelect');
const btnShuffleSpintax = document.getElementById('btnShuffleSpintax');
const previewAttachmentCard = document.getElementById('previewAttachmentCard');
const previewAttachFilename = document.getElementById('previewAttachFilename');
const previewAttachSub = document.getElementById('previewAttachSub');

const testPhoneInput = document.getElementById('testPhoneInput');
const btnSendTest = document.getElementById('btnSendTest');

const btnStartBroadcast = document.getElementById('btnStartBroadcast');
const btnRetryFailed = document.getElementById('btnRetryFailed');
const retryFailedCount = document.getElementById('retryFailedCount');
const btnPauseBroadcast = document.getElementById('btnPauseBroadcast');
const btnResumeBroadcast = document.getElementById('btnResumeBroadcast');
const btnStopBroadcast = document.getElementById('btnStopBroadcast');
const btnTargetCount = document.getElementById('btnTargetCount');

const progressSection = document.getElementById('progressSection');
const progressBar = document.getElementById('progressBar');
const progressStatusText = document.getElementById('progressStatusText');
const statSuccessCount = document.getElementById('statSuccessCount');
const statFailedCount = document.getElementById('statFailedCount');
const statProgressCount = document.getElementById('statProgressCount');

const terminalLogBody = document.getElementById('terminalLogBody');
const btnClearLogs = document.getElementById('btnClearLogs');
const btnExportReport = document.getElementById('btnExportReport');

const tableSearchInput = document.getElementById('tableSearchInput');
const tableStatusFilter = document.getElementById('tableStatusFilter');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectionCountBadge = document.getElementById('selectionCountBadge');
const totalTableCount = document.getElementById('totalTableCount');
const contactsTableBody = document.getElementById('contactsTableBody');
const thAttachmentCol = document.getElementById('thAttachmentCol');

// Modal & Notification History Elements
const btnNotifBell = document.getElementById('btnNotifBell');
const notifBadgeCount = document.getElementById('notifBadgeCount');
const completionModalOverlay = document.getElementById('completionModalOverlay');
const completionModalDialog = document.getElementById('completionModalDialog');
const btnCloseCompletionModal = document.getElementById('btnCloseCompletionModal');
const modalHeroIcon = document.getElementById('modalHeroIcon');
const modalHeroEmoji = document.getElementById('modalHeroEmoji');
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalStatSuccess = document.getElementById('modalStatSuccess');
const modalStatFailed = document.getElementById('modalStatFailed');
const modalStatTotal = document.getElementById('modalStatTotal');
const modalStatDuration = document.getElementById('modalStatDuration');
const modalFailuresSection = document.getElementById('modalFailuresSection');
const modalFailuresCount = document.getElementById('modalFailuresCount');
const modalFailuresTableBody = document.getElementById('modalFailuresTableBody');
const btnModalRetryFailed = document.getElementById('btnModalRetryFailed');
const modalRetryBtnCount = document.getElementById('modalRetryBtnCount');
const btnModalDownloadCsv = document.getElementById('btnModalDownloadCsv');
const btnModalDismiss = document.getElementById('btnModalDismiss');

const notifDrawerOverlay = document.getElementById('notifDrawerOverlay');
const notifHistoryDrawer = document.getElementById('notifHistoryDrawer');
const btnClearHistory = document.getElementById('btnClearHistory');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');
const notifHistoryBody = document.getElementById('notifHistoryBody');

const btnDummySuccessModal = document.getElementById('btnDummySuccessModal');
const btnDummyFailedModal = document.getElementById('btnDummyFailedModal');
const btnDummyTestSend = document.getElementById('btnDummyTestSend');

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  centerWindowOnScreen();
  detectEnvironment();
  setupEventListeners();
  loadSavedPreferences();
  loadNotificationHistory();
  checkAppFlavor();

  // Show Gateway initially while checking connection
  showView('gateway');

  // Start polling WhatsApp status
  fetchWhatsAppStatus();
  waPollTimer = setInterval(fetchWhatsAppStatus, 2000);

  // Auto-load demo data on first start for instant experience
  setTimeout(() => {
    loadDemoContacts();
  }, 400);
});

function detectEnvironment() {
  if (window.__TAURI__ && window.__TAURI__.core) {
    isTauriEnv = true;
    tauriCore = window.__TAURI__.core;
    appendLog('system', 'Tauri v2 Rust Core aktif & terhubung.');
  } else {
    isTauriEnv = false;
    appendLog('system', 'Berjalan di mode Webview standalone.');
  }
}

// ----------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------
function setupEventListeners() {
  // Mode selection
  modeBtnText.addEventListener('click', () => setDeliveryMode('text'));
  modeBtnAttachment.addEventListener('click', () => setDeliveryMode('attachment'));

  // WhatsApp connection
  if (btnConnectWA) btnConnectWA.addEventListener('click', connectWhatsApp);
  if (btnResetWA) btnResetWA.addEventListener('click', resetWhatsAppSession);
  if (btnGatewayRefreshQR) {
    btnGatewayRefreshQR.addEventListener('click', async () => {
      if (gatewayQRSpinner) gatewayQRSpinner.style.display = 'flex';
      if (gatewayQRImage) gatewayQRImage.style.display = 'none';
      appendLog('info', 'Memuat ulang QR Code WhatsApp...');
      try {
        await fetch(`${SIDECAR_API}/api/wa/connect`, { method: 'POST' });
        fetchWhatsAppStatus();
      } catch (err) {
        appendLog('error', 'Gagal memuat ulang QR: ' + err.message);
      }
    });
  }

  // File Upload
  btnBrowseFile.addEventListener('click', () => excelFileInput.click());
  btnChangeFile.addEventListener('click', () => excelFileInput.click());
  btnUseDemoData.addEventListener('click', loadDemoContacts);

  excelFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  });

  // Drag & drop
  excelDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    excelDropzone.classList.add('dragover');
  });
  excelDropzone.addEventListener('dragleave', () => excelDropzone.classList.remove('dragover'));
  excelDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    excelDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  sheetSelect.addEventListener('change', () => {
    if (currentExcelMeta) {
      if (isTauriEnv && currentExcelMeta.file_path) {
        readExcelSheet(currentExcelMeta.file_path, sheetSelect.value);
      } else if (currentExcelMeta.workbookRef && typeof XLSX !== 'undefined') {
        const selectedSheet = sheetSelect.value;
        const worksheet = currentExcelMeta.workbookRef.Sheets[selectedSheet];
        if (worksheet) {
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          if (sheetData && sheetData.length > 0) {
            const headers = sheetData[0].map((h, i) => String(h || `Kolom_${i + 1}`).trim());
            const rawRows = sheetData.slice(1).filter(r => r.some(cell => cell !== '' && cell !== null && cell !== undefined));
            const rowsAsObjects = rawRows.map(r => {
              const obj = {};
              headers.forEach((h, idx) => {
                obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : '';
              });
              return obj;
            });
            currentExcelMeta.active_sheet = selectedSheet;
            currentExcelMeta.headers = headers;
            currentExcelMeta.total_rows = rowsAsObjects.length;
            applyExcelDataToUI(currentExcelMeta, rowsAsObjects);
            appendLog('info', `Beralih ke sheet '${selectedSheet}' (${rowsAsObjects.length} baris data).`);
          }
        }
      }
    }
  });

  // Mapping Drawer
  btnToggleMapping.addEventListener('click', () => {
    const isHidden = mappingDrawer.style.display === 'none';
    mappingDrawer.style.display = isHidden ? 'block' : 'none';
    btnToggleMapping.innerHTML = isHidden ? '⚙️ Tutup Pemetaan Kolom ▴' : '⚙️ Sesuaikan Pemetaan Kolom ▾';
  });

  [mapNameCol, mapPhoneCol, mapCustomCol].forEach(sel => {
    sel.addEventListener('change', () => {
      rebuildContactsFromMapping();
      triggerAttachmentScan();
    });
  });

  // Attachment controls
  btnScanFolder.addEventListener('click', triggerAttachmentScan);
  btnPresetDemoFolder.addEventListener('click', () => {
    // Relative to workspace
    attachmentFolderInput.value = 'data_contoh/lampiran';
    triggerAttachmentScan();
  });

  document.querySelectorAll('input[name="matchRule"]').forEach(radio => {
    radio.addEventListener('change', triggerAttachmentScan);
  });

  // Message template & preview
  messageTemplate.addEventListener('input', () => {
    updateLivePreview();
    savePreferencesDebounced();
  });

  previewContactSelect.addEventListener('change', updateLivePreview);
  if (btnShuffleSpintax) {
    btnShuffleSpintax.addEventListener('click', updateLivePreview);
  }

  // Test send & Broadcast
  btnSendTest.addEventListener('click', sendTestMessage);
  btnStartBroadcast.addEventListener('click', startBroadcast);
  if (btnRetryFailed) {
    btnRetryFailed.addEventListener('click', retryFailedBroadcast);
  }
  btnPauseBroadcast.addEventListener('click', () => controlBroadcast('pause'));
  btnResumeBroadcast.addEventListener('click', () => controlBroadcast('resume'));
  btnStopBroadcast.addEventListener('click', () => controlBroadcast('stop'));

  // Table & Logs
  btnClearLogs.addEventListener('click', () => { terminalLogBody.innerHTML = ''; });
  btnExportReport.addEventListener('click', exportReportCsv);

  tableSearchInput.addEventListener('input', renderTable);
  tableStatusFilter.addEventListener('change', renderTable);

  selectAllCheckbox.addEventListener('change', (e) => {
    const visible = getFilteredContacts();
    if (e.target.checked) {
      visible.forEach(c => selectedContactIds.add(c.id));
    } else {
      visible.forEach(c => selectedContactIds.delete(c.id));
    }
    renderTable();
    updateSelectionBadge();
  });

  // Custom M3 Window Controls
  const btnWinMin = document.getElementById('btnWinMinimize');
  const btnWinMax = document.getElementById('btnWinMaximize');
  const btnWinClose = document.getElementById('btnWinClose');

  if (btnWinMin) {
    btnWinMin.addEventListener('click', async () => {
      try {
        if (tauriCore) {
          await tauriCore.invoke('cmd_minimize_window');
        } else if (window.__TAURI__ && window.__TAURI__.core) {
          await window.__TAURI__.core.invoke('cmd_minimize_window');
        } else if (window.__TAURI__ && window.__TAURI__.window) {
          await window.__TAURI__.window.getCurrentWindow().minimize();
        }
      } catch (e) {
        console.warn('Minimize error:', e);
      }
    });
  }

  if (btnWinMax) {
    btnWinMax.addEventListener('click', async () => {
      try {
        if (tauriCore) {
          await tauriCore.invoke('cmd_maximize_window');
        } else if (window.__TAURI__ && window.__TAURI__.core) {
          await window.__TAURI__.core.invoke('cmd_maximize_window');
        } else if (window.__TAURI__ && window.__TAURI__.window) {
          await window.__TAURI__.window.getCurrentWindow().toggleMaximize();
        } else {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Maximize error:', e);
      }
    });
  }

  if (btnWinClose) {
    btnWinClose.addEventListener('click', async () => {
      try {
        if (tauriCore) {
          await tauriCore.invoke('cmd_close_window');
        } else if (window.__TAURI__ && window.__TAURI__.core) {
          await window.__TAURI__.core.invoke('cmd_close_window');
        } else if (window.__TAURI__ && window.__TAURI__.window) {
          await window.__TAURI__.window.getCurrentWindow().close();
        } else {
          window.close();
        }
      } catch (e) {
        window.close();
      }
    });
  }

  // Open external links (schrist.cyou, etc.) in user's default browser
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="http"]');
    if (link) {
      e.preventDefault();
      const url = link.href;
      if (isTauriEnv && tauriCore) {
        tauriCore.invoke('cmd_open_url', { url }).catch(err => {
          console.warn('Gagal buka browser via Tauri:', err);
          window.open(url, '_blank');
        });
      } else {
        window.open(url, '_blank');
      }
    }
  });

  // Notification Drawer & Completion Modal
  if (btnNotifBell) {
    btnNotifBell.addEventListener('click', () => toggleNotificationDrawer());
  }
  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => toggleNotificationDrawer(false));
  }
  if (notifDrawerOverlay) {
    notifDrawerOverlay.addEventListener('click', () => toggleNotificationDrawer(false));
  }
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', clearNotificationHistory);
  }

  if (btnCloseCompletionModal) {
    btnCloseCompletionModal.addEventListener('click', closeCompletionModal);
  }
  if (btnModalDismiss) {
    btnModalDismiss.addEventListener('click', closeCompletionModal);
  }
  if (completionModalOverlay) {
    completionModalOverlay.addEventListener('click', (e) => {
      if (e.target === completionModalOverlay) closeCompletionModal();
    });
  }
  if (btnModalDownloadCsv) {
    btnModalDownloadCsv.addEventListener('click', () => {
      closeCompletionModal();
      exportReportCsv();
    });
  }
  if (btnModalRetryFailed) {
    btnModalRetryFailed.addEventListener('click', () => {
      closeCompletionModal();
      retryFailedBroadcast();
    });
  }

  // Confirmation Modal Events
  const btnCloseConfirmModal = document.getElementById('btnCloseConfirmModal');
  const btnConfirmCancel = document.getElementById('btnConfirmCancel');
  const btnConfirmAction = document.getElementById('btnConfirmAction');
  const confirmModalOverlay = document.getElementById('confirmModalOverlay');

  if (btnCloseConfirmModal) btnCloseConfirmModal.addEventListener('click', closeCustomConfirm);
  if (btnConfirmCancel) btnConfirmCancel.addEventListener('click', closeCustomConfirm);
  if (confirmModalOverlay) {
    confirmModalOverlay.addEventListener('click', (e) => {
      if (e.target === confirmModalOverlay) closeCustomConfirm();
    });
  }
  if (btnConfirmAction) {
    btnConfirmAction.addEventListener('click', () => {
      const cb = activeConfirmCallback;
      closeCustomConfirm();
      if (cb) cb();
    });
  }

  // Interactive Simulation / Dummy Testing Buttons
  if (btnDummySuccessModal) {
    btnDummySuccessModal.addEventListener('click', triggerDummySuccess);
  }
  if (btnDummyFailedModal) {
    btnDummyFailedModal.addEventListener('click', triggerDummyFailed);
  }
  if (btnDummyTestSend) {
    btnDummyTestSend.addEventListener('click', triggerDummyTest);
  }

  // Keyboard shortcut Ctrl+Shift+T to toggle simulation testing bar in any mode
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
      const bar = document.getElementById('simulationTestingBar');
      if (bar) {
        const isHidden = bar.style.display === 'none';
        bar.style.display = isHidden ? 'flex' : 'none';
        appendLog('info', isHidden ? '[Mode] Uji Coba Simulasi diaktifkan (Ctrl+Shift+T)' : '[Mode] Uji Coba Simulasi disembunyikan');
      }
    }
  });
}

// ----------------------------------------------------
// APP FLAVOR CONTROLLER (Production vs Testing Mode)
// ----------------------------------------------------
async function checkAppFlavor() {
  const bar = document.getElementById('simulationTestingBar');
  if (!bar) return;

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'testing' || window.location.href.toLowerCase().includes('test')) {
    bar.style.display = 'flex';
    return;
  }

  if (isTauriEnv && tauriCore) {
    try {
      const flavor = await tauriCore.invoke('cmd_get_app_flavor');
      if (flavor === 'testing') {
        bar.style.display = 'flex';
        appendLog('info', '[Mode] Versi Testing aktif (simulasi dummy terbuka).');
      } else {
        bar.style.display = 'none';
      }
      return;
    } catch (e) {
      console.warn('cmd_get_app_flavor error:', e);
    }
  }

  // Default production mode: hide testing bar
  bar.style.display = 'none';
}

// ----------------------------------------------------
// DELIVERY MODE CONTROLLER
// ----------------------------------------------------
function setDeliveryMode(mode) {
  activeDeliveryMode = mode;
  if (mode === 'text') {
    modeBtnText.classList.add('active');
    modeBtnAttachment.classList.remove('active');
    attachmentConfigCard.classList.add('card-disabled');
    matchPercentageBadge.textContent = 'Mode Teks Aktif';
    matchPercentageBadge.className = 'match-badge badge-pending';
    previewAttachmentCard.style.display = 'none';
    thAttachmentCol.textContent = 'Info Tambahan';
  } else {
    modeBtnAttachment.classList.add('active');
    modeBtnText.classList.remove('active');
    attachmentConfigCard.classList.remove('card-disabled');
    previewAttachmentCard.style.display = 'flex';
    thAttachmentCol.textContent = 'Status Lampiran File';
    triggerAttachmentScan();
  }
  renderTable();
  updateLivePreview();
}

// ----------------------------------------------------
// WHATSAPP API & CONNECTION LIFECYCLE (2-VIEW GATEWAY / WORKSPACE)
// ----------------------------------------------------
let isStartingSidecar = false;
let currentActiveView = 'gateway'; // 'gateway' | 'workspace'

function showView(viewName) {
  currentActiveView = viewName;
  if (!appGateway || !appWorkspace) return;

  if (viewName === 'gateway') {
    appGateway.classList.remove('view-hidden');
    appWorkspace.classList.add('view-hidden');
    if (btnConnectWA) btnConnectWA.style.display = 'none';
    if (btnResetWA) btnResetWA.style.display = 'none';
  } else if (viewName === 'workspace') {
    appGateway.classList.add('view-hidden');
    appWorkspace.classList.remove('view-hidden');
    if (btnConnectWA) btnConnectWA.style.display = 'none';
    if (btnResetWA) btnResetWA.style.display = 'inline-flex';
  }
}

async function ensureSidecar() {
  if (isStartingSidecar) return false;
  try {
    const res = await fetch(`${SIDECAR_API}/api/wa/status`, { signal: AbortSignal.timeout(1200) });
    if (res.ok) return true;
  } catch (e) {
    if (isTauriEnv && tauriCore) {
      isStartingSidecar = true;
      appendLog('info', 'Memulai WhatsApp Engine Sidecar di latar belakang...');
      try {
        await tauriCore.invoke('cmd_start_sidecar');
        for (let i = 0; i < 8; i++) {
          await new Promise(r => setTimeout(r, 600));
          try {
            const check = await fetch(`${SIDECAR_API}/api/wa/status`, { signal: AbortSignal.timeout(1000) });
            if (check.ok) {
              appendLog('success', 'WhatsApp Engine Sidecar aktif.');
              isStartingSidecar = false;
              return true;
            }
          } catch (_) {}
        }
      } catch (err) {
        console.warn('Gagal memicu sidecar via Tauri:', err);
      }
      isStartingSidecar = false;
    }
  }
  return false;
}

async function fetchWhatsAppStatus() {
  try {
    const res = await fetch(`${SIDECAR_API}/api/wa/status`, { signal: AbortSignal.timeout(2500) });
    const data = await res.json();

    if (data.status === 'READY') {
      waStatusBadge.className = 'status-pill status-ready';
      const dot = waStatusBadge.querySelector('.pulse-dot');
      if (dot) dot.style.display = 'inline-block';
      const name = data.clientInfo ? data.clientInfo.name : 'WhatsApp';
      waStatusText.textContent = `Terhubung: ${name}`;

      if (currentActiveView === 'gateway') {
        if (gatewayStatusText) gatewayStatusText.textContent = 'Autentikasi Berhasil! Mengalihkan ke Workspace...';
        if (gatewaySubHint) gatewaySubHint.textContent = `Terhubung sebagai ${name}`;
        setTimeout(() => {
          showView('workspace');
        }, 500);
      } else {
        showView('workspace');
      }
    } else if (data.status === 'QR_READY' && data.qrCode) {
      waStatusBadge.className = 'status-pill status-connecting';
      waStatusText.textContent = 'Scan QR Code';

      showView('gateway');
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'none';
      if (gatewayQRBox) gatewayQRBox.style.display = 'flex';
      if (gatewayQRSpinner) gatewayQRSpinner.style.display = 'none';
      if (gatewayQRImage) {
        gatewayQRImage.src = data.qrCode;
        gatewayQRImage.style.display = 'block';
      }
    } else if (data.status === 'INITIALIZING') {
      waStatusBadge.className = 'status-pill status-connecting';
      waStatusText.textContent = 'Menyiapkan WA...';

      showView('gateway');
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
      if (gatewayQRBox) gatewayQRBox.style.display = 'none';
      if (gatewayStatusText) gatewayStatusText.textContent = 'Menyiapkan WhatsApp Engine (memuat browser)...';
      if (gatewaySubHint) gatewaySubHint.textContent = 'QR Code akan muncul otomatis dalam beberapa detik';
    } else {
      waStatusBadge.className = 'status-pill status-disconnected';
      waStatusText.textContent = 'Terputus';

      showView('gateway');
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
      if (gatewayQRBox) gatewayQRBox.style.display = 'none';
      if (gatewayStatusText) gatewayStatusText.textContent = 'Menghubungkan ke WhatsApp Engine...';
      if (gatewaySubHint) gatewaySubHint.textContent = 'Menyiapkan koneksi baru...';
    }
  } catch (err) {
    waStatusBadge.className = 'status-pill status-disconnected';
    waStatusText.textContent = 'Sidecar Offline';

    if (currentActiveView === 'gateway') {
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
      if (gatewayQRBox) gatewayQRBox.style.display = 'none';
      if (gatewayStatusText) gatewayStatusText.textContent = 'Memulai WhatsApp Engine lokal di latar belakang...';
      if (gatewaySubHint) gatewaySubHint.textContent = 'Mohon tunggu beberapa detik, sistem sedang menyiapkan engine';
    }

    if (isTauriEnv && tauriCore && !isStartingSidecar) {
      ensureSidecar();
    }
  }
}

async function connectWhatsApp() {
  try {
    showView('gateway');
    if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
    if (gatewayQRBox) gatewayQRBox.style.display = 'none';
    if (gatewayStatusText) gatewayStatusText.textContent = 'Menghubungkan ke WhatsApp Engine...';
    if (gatewaySubHint) gatewaySubHint.textContent = 'Memeriksa sesi atau membuat QR Code baru';

    appendLog('info', 'Menghubungkan ke WhatsApp Engine...');
    await ensureSidecar();
    const res = await fetch(`${SIDECAR_API}/api/wa/connect`, { method: 'POST' });
    const data = await res.json();
    if (data && data.message) appendLog('info', data.message);
    await fetchWhatsAppStatus();
  } catch (err) {
    appendLog('error', 'Gagal memicu koneksi WhatsApp: ' + err.message);
  }
}

function resetWhatsAppSession() {
  showCustomConfirm({
    title: 'Reset Sesi WhatsApp?',
    subtitle: 'Anda akan keluar dari akun WhatsApp saat ini dan sesi akun di komputer akan dibersihkan. Anda harus memindai ulang QR Code untuk menghubungkan akun baru.',
    emoji: '🔄',
    iconClass: 'hero-warning',
    confirmText: 'Ya, Reset Sesi',
    confirmBtnClass: 'btn-amber',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        showView('gateway');
        if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
        if (gatewayQRBox) gatewayQRBox.style.display = 'none';
        if (gatewayStatusText) gatewayStatusText.textContent = 'Mereset sesi & menyiapkan QR Code baru...';
        if (gatewaySubHint) gatewaySubHint.textContent = 'Membersihkan sesi akun di komputer';

        appendLog('warning', 'Mereset sesi WhatsApp & menyiapkan QR Code baru...');
        await ensureSidecar();
        await fetch(`${SIDECAR_API}/api/wa/reset-session`, { method: 'POST' });
        fetchWhatsAppStatus();
      } catch (err) {
        appendLog('error', 'Gagal mereset sesi: ' + err.message);
      }
    }
  });
}

// ----------------------------------------------------
// EXCEL & DEMO DATA INGESTION
// ----------------------------------------------------
async function loadDemoContacts() {
  appendLog('info', 'Memuat data contoh generik (15 kontak dummy)...');

  let loadedSuccessfully = false;
  // Load from pre-generated demo data
  if (isTauriEnv) {
    try {
      const demoPath = 'data_contoh/Daftar_Kontak_Penerima.xlsx';
      const res = await tauriCore.invoke('cmd_read_excel', {
        filePath: demoPath,
        sheetName: null
      });
      if (res && res.rows && res.rows.length > 0) {
        currentExcelMeta = res;
        applyExcelDataToUI(res, res.rows);
        attachmentFolderInput.value = 'data_contoh/lampiran';
        loadedSuccessfully = true;
        appendLog('success', `Berhasil membaca '${res.file_name}' (${res.total_rows} baris data).`);
      }
    } catch (e) {
      console.warn('Tauri load demo error, fallbacking to client mockup:', e);
    }
  }

  // If not loaded via Rust or contacts are empty (e.g. running from dist/), use built-in 15 contacts mockup
  if (!loadedSuccessfully || contactsData.length === 0) {
    currentExcelMeta = {
      file_name: 'Daftar_Kontak_Penerima.xlsx',
      file_path: 'data_contoh/Daftar_Kontak_Penerima.xlsx',
      sheets: ['Daftar Kontak'],
      active_sheet: 'Daftar Kontak',
      headers: ['No', 'Nama Lengkap', 'Nomor WhatsApp', 'Kota Cabang', 'Nomor Invoice', 'Nominal Tagihan', 'File Lampiran', 'Status']
    };

    const sampleRows = [
      { 'No': '1', 'Nama Lengkap': 'Budi Santoso', 'Nomor WhatsApp': '081299990001', 'Kota Cabang': 'Jakarta Pusat', 'Nomor Invoice': 'INV-2026-001', 'Nominal Tagihan': '2750000', 'File Lampiran': 'INV-2026-001.pdf', 'Status': 'Aktif' },
      { 'No': '2', 'Nama Lengkap': 'Siti Rahmawati', 'Nomor WhatsApp': '081299990002', 'Kota Cabang': 'Surabaya', 'Nomor Invoice': 'INV-2026-002', 'Nominal Tagihan': '3400000', 'File Lampiran': 'INV-2026-002.pdf', 'Status': 'Aktif' },
      { 'No': '3', 'Nama Lengkap': 'Ahmad Fauzi', 'Nomor WhatsApp': '081299990003', 'Kota Cabang': 'Bandung', 'Nomor Invoice': 'INV-2026-003', 'Nominal Tagihan': '1850000', 'File Lampiran': 'Ahmad Fauzi.jpg', 'Status': 'Aktif' },
      { 'No': '4', 'Nama Lengkap': 'Dewi Lestari', 'Nomor WhatsApp': '081299990004', 'Kota Cabang': 'Semarang', 'Nomor Invoice': 'INV-2026-004', 'Nominal Tagihan': '4200000', 'File Lampiran': 'Dewi Lestari.pdf', 'Status': 'Aktif' },
      { 'No': '5', 'Nama Lengkap': 'Eko Prasetyo', 'Nomor WhatsApp': '081299990005', 'Kota Cabang': 'Medan', 'Nomor Invoice': 'INV-2026-005', 'Nominal Tagihan': '2150000', 'File Lampiran': 'INV-2026-005.pdf', 'Status': 'Aktif' },
      { 'No': '6', 'Nama Lengkap': 'Rina Handayani', 'Nomor WhatsApp': '081299990006', 'Kota Cabang': 'Yogyakarta', 'Nomor Invoice': 'INV-2026-006', 'Nominal Tagihan': '3100000', 'File Lampiran': 'Rina Handayani.pdf', 'Status': 'Aktif' },
      { 'No': '7', 'Nama Lengkap': 'Fajar Nugraha', 'Nomor WhatsApp': '081299990007', 'Kota Cabang': 'Makassar', 'Nomor Invoice': 'INV-2026-007', 'Nominal Tagihan': '5000000', 'File Lampiran': 'Fajar Nugraha.png', 'Status': 'Aktif' },
      { 'No': '8', 'Nama Lengkap': 'Putri Ayu Wulandari', 'Nomor WhatsApp': '081299990008', 'Kota Cabang': 'Denpasar', 'Nomor Invoice': 'INV-2026-008', 'Nominal Tagihan': '2900000', 'File Lampiran': 'INV-2026-008.docx', 'Status': 'Aktif' },
      { 'No': '9', 'Nama Lengkap': 'Hendra Gunawan', 'Nomor WhatsApp': '081299990009', 'Kota Cabang': 'Palembang', 'Nomor Invoice': 'INV-2026-009', 'Nominal Tagihan': '3800000', 'File Lampiran': 'Hendra Gunawan.pdf', 'Status': 'Aktif' },
      { 'No': '10', 'Nama Lengkap': 'Nurul Hidayah', 'Nomor WhatsApp': '081299990010', 'Kota Cabang': 'Malang', 'Nomor Invoice': 'INV-2026-010', 'Nominal Tagihan': '1600000', 'File Lampiran': 'INV-2026-010.pdf', 'Status': 'Aktif' },
      { 'No': '11', 'Nama Lengkap': 'Rizky Pratama', 'Nomor WhatsApp': '081299990011', 'Kota Cabang': 'Bekasi', 'Nomor Invoice': 'INV-2026-011', 'Nominal Tagihan': '4500000', 'File Lampiran': 'Rizky Pratama.pdf', 'Status': 'Aktif' },
      { 'No': '12', 'Nama Lengkap': 'Mega Puspita', 'Nomor WhatsApp': '081299990012', 'Kota Cabang': 'Tangerang', 'Nomor Invoice': 'INV-2026-012', 'Nominal Tagihan': '2300000', 'File Lampiran': 'Mega Puspita.jpg', 'Status': 'Aktif' },
      { 'No': '13', 'Nama Lengkap': 'Bayu Saputra', 'Nomor WhatsApp': '081299990013', 'Kota Cabang': 'Solo', 'Nomor Invoice': 'INV-2026-013', 'Nominal Tagihan': '3750000', 'File Lampiran': 'INV-2026-013.pdf', 'Status': 'Aktif' },
      { 'No': '14', 'Nama Lengkap': 'Indah Permatasari', 'Nomor WhatsApp': '081299990014', 'Kota Cabang': 'Bogor', 'Nomor Invoice': 'INV-2026-014', 'Nominal Tagihan': '4100000', 'File Lampiran': 'Indah Permatasari.pdf', 'Status': 'Aktif' },
      { 'No': '15', 'Nama Lengkap': 'Dimas Kurniawan', 'Nomor WhatsApp': '081299990015', 'Kota Cabang': 'Balikpapan', 'Nomor Invoice': 'INV-2026-015', 'Nominal Tagihan': '3200000', 'File Lampiran': 'INV-2026-015.pdf', 'Status': 'Aktif' }
    ];

    applyExcelDataToUI(currentExcelMeta, sampleRows);
    attachmentFolderInput.value = 'data_contoh/lampiran';
    triggerAttachmentScan();
  }
}

async function handleFileUpload(file) {
  if (!file) return;
  appendLog('info', `Membaca file Excel: ${file.name}...`);

  // If in Tauri and path is available
  if (isTauriEnv && file.path) {
    try {
      await readExcelSheet(file.path, null);
      return;
    } catch (e) {
      console.warn('Fallback ke client-side XLSX parser:', e);
    }
  }

  // Parse in browser via SheetJS (XLSX)
  if (typeof XLSX !== 'undefined') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetNames = workbook.SheetNames;
      if (!sheetNames || sheetNames.length === 0) {
        throw new Error('Tidak ada sheet yang ditemukan di file Excel ini.');
      }

      const firstSheetName = sheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!sheetData || sheetData.length === 0) {
        throw new Error('Sheet kosong atau tidak memiliki data.');
      }

      const headers = sheetData[0].map((h, i) => String(h || `Kolom_${i + 1}`).trim());
      const rawRows = sheetData.slice(1).filter(r => r.some(cell => cell !== '' && cell !== null && cell !== undefined));

      const rowsAsObjects = rawRows.map(r => {
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : '';
        });
        return obj;
      });

      currentExcelMeta = {
        file_name: file.name,
        file_path: file.path || file.name,
        sheets: sheetNames,
        active_sheet: firstSheetName,
        headers: headers,
        total_rows: rowsAsObjects.length,
        workbookRef: workbook
      };

      applyExcelDataToUI(currentExcelMeta, rowsAsObjects);
      appendLog('success', `Berhasil membaca '${file.name}' (${rowsAsObjects.length} baris data).`);
      return;
    } catch (err) {
      appendLog('error', `Gagal membaca Excel: ${err.message}`);
      console.error(err);
    }
  }

  // Fallback demo if XLSX unavailable
  activeFileName.textContent = file.name;
  activeFileChip.style.display = 'flex';
  excelDropzone.querySelector('.dropzone-inner').style.display = 'none';
  appendLog('warning', 'Menggunakan struktur demo sebagai fallback.');
  loadDemoContacts();
}

async function readExcelSheet(filePath, sheetName) {
  if (!isTauriEnv) return;
  try {
    const res = await tauriCore.invoke('cmd_read_excel', {
      filePath: filePath,
      sheetName: sheetName
    });

    currentExcelMeta = res;
    applyExcelDataToUI(res, res.rows);
    appendLog('success', `Berhasil membaca '${res.file_name}' (${res.total_rows} baris data).`);
  } catch (err) {
    appendLog('error', 'Gagal membaca file Excel: ' + err);
  }
}

function applyExcelDataToUI(meta, rows) {
  activeFileName.textContent = meta.file_name;
  activeFileChip.style.display = 'flex';
  excelDropzone.querySelector('.dropzone-inner').style.display = 'none';

  // Populate sheet dropdown
  sheetSelect.innerHTML = '';
  meta.sheets.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === meta.active_sheet) opt.selected = true;
    sheetSelect.appendChild(opt);
  });

  // Populate mapping dropdowns
  populateMappingOptions(meta.headers);

  // Parse contacts
  rawRowsToContacts(rows, meta.headers);
  rebuildDynamicTagPills(meta.headers);
  populatePreviewContactSelect();
  renderTable();
  updateSelectionBadge();
  updateLivePreview();
}

function populateMappingOptions(headers) {
  [mapNameCol, mapPhoneCol, mapCustomCol].forEach(sel => {
    sel.innerHTML = '';
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = '-- Pilih Kolom --';
    sel.appendChild(defOpt);

    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      sel.appendChild(opt);
    });
  });

  // Auto detect
  const nameMatch = headers.find(h => /nama/i.test(h)) || headers[1] || '';
  const phoneMatch = headers.find(h => /wa|telp|hp|phone|kontak/i.test(h)) || headers[2] || '';
  const customMatch = headers.find(h => /file|lampiran|invoice|id/i.test(h)) || '';

  if (nameMatch) mapNameCol.value = nameMatch;
  if (phoneMatch) mapPhoneCol.value = phoneMatch;
  if (customMatch) mapCustomCol.value = customMatch;

  mappingStatusSummary.textContent = `Kolom Nama: '${mapNameCol.value}', Nomor: '${mapPhoneCol.value}'`;
}

function rawRowsToContacts(rows, headers) {
  const nameCol = mapNameCol.value || headers[1] || 'Nama Lengkap';
  const phoneCol = mapPhoneCol.value || headers[2] || 'Nomor WhatsApp';
  const customCol = mapCustomCol.value || 'File Lampiran';

  contactsData = rows.map((r, idx) => {
    const id = String(idx + 1);
    const nama = r[nameCol] || `Kontak ${idx + 1}`;
    const rawPhone = r[phoneCol] || '';
    const customVal = r[customCol] || '';

    return {
      id,
      no: idx + 1,
      nama,
      phone: rawPhone,
      customVal,
      rawData: r,
      fileInfo: null
    };
  });

  selectedContactIds.clear();
  contactsData.forEach(c => selectedContactIds.add(c.id));
}

function rebuildContactsFromMapping() {
  if (!currentExcelMeta) return;
  mappingStatusSummary.textContent = `Kolom Nama: '${mapNameCol.value}', Nomor: '${mapPhoneCol.value}'`;
  rawRowsToContacts(contactsData.map(c => c.rawData), currentExcelMeta.headers);
  renderTable();
  updateLivePreview();
}

function rebuildDynamicTagPills(headers) {
  dynamicTagsContainer.innerHTML = '';

  // Special Utility Tags (Always Available)
  const specialTags = [
    { tag: '{Salam}', label: '+ {Salam} (Waktu)', title: 'Ucapan waktu otomatis (Pagi/Siang/Sore/Malam)' },
    { tag: '{Halo|Hai|Selamat Pagi|Salam}', label: '+ Spintax {Halo|Hai|...}', title: 'Variasi acak kata Spintax anti-spam' }
  ];
  specialTags.forEach(s => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-tag-pill tag-pill-special';
    btn.dataset.tag = s.tag;
    btn.title = s.title;
    btn.textContent = s.label;
    btn.addEventListener('click', () => insertTagAtCursor(s.tag));
    dynamicTagsContainer.appendChild(btn);
  });

  // Excel / CSV Column Tags
  headers.forEach(h => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-tag-pill';
    btn.dataset.tag = `{${h}}`;
    btn.textContent = `+ {${h}}`;
    btn.addEventListener('click', () => insertTagAtCursor(`{${h}}`));
    dynamicTagsContainer.appendChild(btn);
  });
}

function insertTagAtCursor(tag) {
  const start = messageTemplate.selectionStart;
  const end = messageTemplate.selectionEnd;
  const text = messageTemplate.value;
  messageTemplate.value = text.substring(0, start) + tag + text.substring(end);
  messageTemplate.focus();
  messageTemplate.selectionStart = messageTemplate.selectionEnd = start + tag.length;
  updateLivePreview();
}

// ----------------------------------------------------
// DYNAMIC ATTACHMENT SCANNER
// ----------------------------------------------------
async function triggerAttachmentScan() {
  if (activeDeliveryMode !== 'attachment') return;

  const folder = (attachmentFolderInput.value || '').trim();
  if (!folder) {
    matchPercentageBadge.textContent = 'Pilih Folder Dulu';
    matchPercentageBadge.className = 'match-badge badge-warning';
    return;
  }

  const matchRule = document.querySelector('input[name="matchRule"]:checked')?.value || 'by_name';
  appendLog('info', `Memindai folder '${folder}' dengan aturan: ${matchRule === 'by_name' ? 'Nama Penerima' : 'Kolom Excel'}...`);

  // If in Tauri, call Rust core
  if (isTauriEnv) {
    try {
      const recordsInput = contactsData.map(c => ({
        id: c.id,
        recipient_name: c.nama,
        custom_column_val: c.customVal
      }));

      const res = await tauriCore.invoke('cmd_scan_attachments', {
        folderPath: folder,
        matchingMode: matchRule,
        records: recordsInput
      });

      applyScanResult(res);
      return;
    } catch (err) {
      appendLog('error', 'Gagal memindai di Rust: ' + err);
    }
  }

  // Try Sidecar API scanner (works natively on Windows in browser / desktop app mode)
  try {
    const recordsInput = contactsData.map(c => ({
      id: c.id,
      recipient_name: c.nama,
      custom_column_val: c.customVal
    }));

    const response = await fetch(`${SIDECAR_API}/api/scan-attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderPath: folder,
        matchingMode: matchRule,
        records: recordsInput
      })
    });

    if (response.ok) {
      const res = await response.json();
      applyScanResult(res);
      return;
    }
  } catch (err) {
    console.warn('Sidecar scan API unavailable, fallback ke simulasi:', err);
  }

  // Simulated fallback for demo files
  const simulatedMatches = contactsData.map(c => {
    let exists = true;
    let fileName = '';
    let category = 'pdf';

    if (matchRule === 'by_name') {
      if (c.nama.includes('Ahmad Fauzi') || c.nama.includes('Mega Puspita')) {
        fileName = `${c.nama}.jpg`;
        category = 'image';
      } else if (c.nama.includes('Fajar Nugraha')) {
        fileName = `${c.nama}.png`;
        category = 'image';
      } else {
        fileName = `${c.nama}.pdf`;
      }
    } else {
      fileName = c.customVal || `${c.nama}.pdf`;
      if (fileName.endsWith('.jpg') || fileName.endsWith('.png')) category = 'image';
      else if (fileName.endsWith('.docx')) category = 'document';
    }

    return {
      record_id: c.id,
      expected_query: c.nama,
      file_name: fileName,
      full_path: `${folder}/${fileName}`,
      exists,
      size_kb: 1250,
      file_category: category
    };
  });

  const summary = {
    folder_path: folder,
    total_records: contactsData.length,
    found_count: contactsData.length,
    missing_count: 0,
    match_percentage: 100.0,
    matches: simulatedMatches
  };

  applyScanResult(summary);
}

function applyScanResult(summary) {
  currentMatchingSummary = summary;
  const matchMap = new Map();
  summary.matches.forEach(m => matchMap.set(m.record_id, m));

  contactsData.forEach(c => {
    c.fileInfo = matchMap.get(c.id) || null;
  });

  matchPercentageBadge.textContent = `${summary.found_count} / ${summary.total_records} File Siap (${summary.match_percentage}%)`;
  matchPercentageBadge.className = summary.missing_count === 0 ? 'match-badge badge-success' : 'match-badge badge-warning';

  appendLog('success', `Pemindaian selesai: ${summary.found_count} file cocok dari ${summary.total_records} kontak.`);
  renderTable();
  updateLivePreview();
}

// ----------------------------------------------------
// LIVE WHATSAPP PHONE PREVIEW
// ----------------------------------------------------
function populatePreviewContactSelect() {
  previewContactSelect.innerHTML = '';
  contactsData.forEach((c, idx) => {
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = `${c.no}. ${c.nama}`;
    previewContactSelect.appendChild(opt);
  });
}

// ----------------------------------------------------
// SPINTAX & TIME GREETING HELPERS
// ----------------------------------------------------
function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 11) return 'Selamat Pagi';
  if (hour >= 11 && hour < 15) return 'Selamat Siang';
  if (hour >= 15 && hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function parseSpintax(text) {
  if (!text) return '';
  let parsed = text;
  const spintaxRegex = /\{([^{}]+)\}/g;
  let iterations = 0;
  
  while (spintaxRegex.test(parsed) && iterations < 15) {
    iterations++;
    parsed = parsed.replace(spintaxRegex, (match, content) => {
      if (content.includes('|')) {
        const choices = content.split('|');
        const picked = choices[Math.floor(Math.random() * choices.length)];
        return picked.trim();
      }
      return match;
    });
  }
  return parsed;
}

function compileMessageForContact(template, contact) {
  if (!template) return '';
  let msg = template;

  // 1. Time-aware Greeting {Salam}
  msg = msg.replace(/\{salam\}/gi, getTimeGreeting());

  // 2. Dynamic column interpolation from contact.rawData
  if (contact && contact.rawData) {
    Object.keys(contact.rawData).forEach(key => {
      const val = contact.rawData[key];
      const reg = new RegExp(`{${escapeRegex(key)}}`, 'gi');
      
      // Monetary formatting
      if (/tagihan|total|nominal|honor|gaji|thp/i.test(key) && !isNaN(Number(val)) && Number(val) > 1000) {
        const formatted = new Intl.NumberFormat('id-ID', { 
          style: 'currency', 
          currency: 'IDR', 
          maximumFractionDigits: 0 
        }).format(Number(val));
        msg = msg.replace(reg, formatted);
      } else {
        msg = msg.replace(reg, val !== undefined && val !== null ? val : '');
      }
    });
  }

  // 3. Spintax variations parsing
  msg = parseSpintax(msg);

  return msg;
}

function updateLivePreview() {
  const defaultContact = {
    nama: 'Budi Santoso',
    phone: '081299990001',
    rawData: {
      'Nama Lengkap': 'Budi Santoso',
      'Kota Cabang': 'Jakarta Pusat',
      'Nomor Invoice': 'INV-2026-001',
      'Nominal Tagihan': '2750000',
      'File Lampiran': 'INV-2026-001.pdf',
      'Status': 'Aktif'
    }
  };

  const contactIdx = parseInt(previewContactSelect.value || '0', 10);
  const contact = (contactsData && contactsData.length > 0)
    ? (contactsData[contactIdx] || contactsData[0])
    : defaultContact;

  previewRecipientName.textContent = contact.nama;

  // Render text with dynamic interpolation + Spintax
  const rendered = compileMessageForContact(messageTemplate.value || '', contact);
  livePreviewText.textContent = rendered;

  // Attachment Card Preview
  if (activeDeliveryMode === 'attachment') {
    previewAttachmentCard.style.display = 'flex';
    const fileInfo = contact.fileInfo;
    const fName = fileInfo ? fileInfo.file_name : `${contact.nama}.pdf`;
    previewAttachFilename.textContent = fName;

    if (fName.endsWith('.pdf')) {
      document.getElementById('previewAttachIcon').textContent = '📄';
      previewAttachSub.textContent = 'Dokumen PDF &bull; 1 Halaman';
    } else if (fName.endsWith('.jpg') || fName.endsWith('.png') || fName.endsWith('.webp')) {
      document.getElementById('previewAttachIcon').textContent = '🖼️';
      previewAttachSub.textContent = 'File Gambar &bull; HD Media';
    } else {
      document.getElementById('previewAttachIcon').textContent = '📎';
      previewAttachSub.textContent = 'Lampiran File Dokumen';
    }
  } else {
    previewAttachmentCard.style.display = 'none';
  }
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ----------------------------------------------------
// TABLE RENDERING
// ----------------------------------------------------
function getFilteredContacts() {
  const search = (tableSearchInput.value || '').toLowerCase().trim();
  const filter = tableStatusFilter.value;

  return contactsData.filter(c => {
    const matchesSearch = !search || 
      c.nama.toLowerCase().includes(search) || 
      c.phone.toLowerCase().includes(search) ||
      (c.rawData['Kota Cabang'] && c.rawData['Kota Cabang'].toLowerCase().includes(search));

    if (!matchesSearch) return false;

    if (filter === 'VALID_ONLY') {
      return c.phone && c.phone.length >= 9;
    }
    if (filter === 'HAS_FILE_ONLY') {
      return c.fileInfo && c.fileInfo.exists;
    }
    if (filter === 'FAILED_ONLY') {
      return c.lastStatus === 'failed';
    }
    return true;
  });
}

function renderTable() {
  const list = getFilteredContacts();
  totalTableCount.textContent = contactsData.length;
  contactsTableBody.innerHTML = '';

  if (list.length === 0) {
    contactsTableBody.innerHTML = `<tr><td colspan="8" class="text-center empty-cell">Tidak ada kontak yang cocok dengan filter.</td></tr>`;
    return;
  }

  list.forEach(c => {
    const isChecked = selectedContactIds.has(c.id);
    const tr = document.createElement('tr');

    const phoneClean = c.phone.replace(/[^0-9]/g, '');
    const isPhoneValid = phoneClean.length >= 9;

    let attachStatusHtml = '<span class="status-badge-inline" style="color: var(--text-dim);">-</span>';
    if (activeDeliveryMode === 'attachment') {
      if (c.fileInfo && c.fileInfo.exists) {
        attachStatusHtml = `<span class="status-badge-inline badge-ready">🟢 ${c.fileInfo.file_name}</span>`;
      } else {
        attachStatusHtml = `<span class="status-badge-inline badge-missing">🔴 Tidak Ditemukan</span>`;
      }
    } else {
      attachStatusHtml = `<span class="table-badge-mode-text">Mode Teks</span>`;
    }

    const tagihanVal = c.rawData['Nominal Tagihan'] || '0';
    const tagihanFmt = !isNaN(Number(tagihanVal)) && Number(tagihanVal) > 0 
      ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(tagihanVal))
      : '-';

    let lastStatusPill = '';
    if (c.lastStatus === 'success') {
      lastStatusPill = '<span class="status-badge-inline badge-ready" style="font-size: 0.68rem; margin-left: 6px;">✓ Terkirim</span>';
    } else if (c.lastStatus === 'failed') {
      lastStatusPill = '<span class="status-badge-inline badge-missing" style="font-size: 0.68rem; margin-left: 6px;">✗ Gagal</span>';
    }

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="contact-checkbox" data-id="${c.id}" ${isChecked ? 'checked' : ''}>
      </td>
      <td style="text-align: center; color: var(--text-dim);">${c.no}</td>
      <td>
        <strong>${c.nama}</strong>
        ${lastStatusPill}
      </td>
      <td>
        <span class="font-mono">${c.phone}</span>
        ${isPhoneValid ? '' : '<span style="color: var(--rose-500); font-size: 0.7rem; margin-left: 4px; font-weight: 600;">(Tidak Valid)</span>'}
      </td>
      <td>${attachStatusHtml}</td>
      <td>${c.rawData['Kota Cabang'] || '-'}</td>
      <td><code>${c.rawData['Nomor Invoice'] || '-'}</code></td>
      <td style="text-align: right; font-weight: 600;">${tagihanFmt}</td>
    `;

    tr.querySelector('.contact-checkbox').addEventListener('change', (e) => {
      if (e.target.checked) selectedContactIds.add(c.id);
      else selectedContactIds.delete(c.id);
      updateSelectionBadge();
    });

    contactsTableBody.appendChild(tr);
  });
}

function updateSelectionBadge() {
  const count = selectedContactIds.size;
  selectionCountBadge.textContent = `${count} Terpilih`;
  btnTargetCount.textContent = count;
}

// ----------------------------------------------------
// SENDING & CONTROLS
// ----------------------------------------------------
async function sendTestMessage() {
  const targetPhone = (testPhoneInput.value || '').trim();
  if (!targetPhone) {
    alert('Masukkan nomor WhatsApp tujuan uji coba terlebih dahulu.');
    testPhoneInput.focus();
    return;
  }

  const contactIdx = parseInt(previewContactSelect.value || '0', 10);
  const contact = contactsData[contactIdx] || contactsData[0];
  const renderedText = livePreviewText.textContent;
  const filePath = (activeDeliveryMode === 'attachment' && contact && contact.fileInfo && contact.fileInfo.exists)
    ? contact.fileInfo.full_path
    : null;

  try {
    appendLog('info', `Mengirim pesan uji coba ke ${targetPhone}...`);
    const res = await fetch(`${SIDECAR_API}/api/wa/send-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetPhone,
        messageText: renderedText,
        filePath
      })
    });
    const result = await res.json();
    if (result.success) {
      appendLog('success', `Uji coba sukses: ${result.message}`);
      const session = {
        id: 'test-' + Date.now(),
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'test',
        success: 1,
        failed: 0,
        total: 1,
        durationSec: 1,
        mode: activeDeliveryMode,
        failures: []
      };
      addNotificationSession(session);
      showCompletionModal(session);
    } else {
      appendLog('error', `Gagal uji coba: ${result.error}`);
      const diag = categorizeError(result.error);
      const session = {
        id: 'test-' + Date.now(),
        timestamp: Date.now(),
        formattedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: 'test',
        success: 0,
        failed: 1,
        total: 1,
        durationSec: 1,
        mode: activeDeliveryMode,
        failures: [{
          name: contact ? contact.nama : 'Penerima Uji Coba',
          phone: targetPhone,
          error: result.error || 'Gagal mengirim pesan uji coba',
          diag
        }]
      };
      addNotificationSession(session);
      showCompletionModal(session);
    }
  } catch (err) {
    appendLog('error', 'Gagal menghubungi engine WhatsApp: ' + err.message);
    const diag = categorizeError('connection error: ' + err.message);
    const session = {
      id: 'test-' + Date.now(),
      timestamp: Date.now(),
      formattedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type: 'test',
      success: 0,
      failed: 1,
      total: 1,
      durationSec: 1,
      mode: activeDeliveryMode,
      failures: [{
        name: contact ? contact.nama : 'Penerima Uji Coba',
        phone: targetPhone,
        error: 'Koneksi ke engine terputus (' + err.message + ')',
        diag
      }]
    };
    addNotificationSession(session);
    showCompletionModal(session);
  }
}

async function startBroadcast() {
  if (selectedContactIds.size === 0) {
    alert('Pilih minimal 1 kontak di tabel untuk dikirimi pesan.');
    return;
  }

  const targets = contactsData
    .filter(c => selectedContactIds.has(c.id))
    .map(c => {
      // Re-compile individual message text per contact so every recipient gets fresh Spintax & greeting
      const individualText = compileMessageForContact(messageTemplate.value || '', c);

      return {
        id: c.id,
        recipientName: c.nama,
        phone: c.phone,
        messageText: individualText,
        filePath: (activeDeliveryMode === 'attachment' && c.fileInfo && c.fileInfo.exists) ? c.fileInfo.full_path : null
      };
    });

  const confirmMsg = `Mulai broadcast ke ${targets.length} kontak dengan mode: ${activeDeliveryMode === 'text' ? 'Pesan Teks Saja' : 'Pesan + Lampiran File'}?`;
  if (!confirm(confirmMsg)) return;

  try {
    const minD = minDelayInput.value || 3;
    const maxD = maxDelayInput.value || 7;
    const isCooldown = chkCooldownBatch && chkCooldownBatch.checked;
    const bSize = isCooldown ? (parseInt(batchSizeInput.value, 10) || 20) : 0;
    const bDelay = isCooldown ? (parseInt(batchDelayInput.value, 10) || 60) : 0;

    const res = await fetch(`${SIDECAR_API}/api/wa/send-broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targets,
        minDelaySec: minD,
        maxDelaySec: maxD,
        batchSize: bSize,
        batchDelaySec: bDelay
      })
    });
    const result = await res.json();

    if (result.success) {
      appendLog('info', 'Broadcast telah diluncurkan di latar belakang.');
      isBroadcasting = true;
      broadcastStartTime = Date.now();
      btnStartBroadcast.style.display = 'none';
      if (btnRetryFailed) btnRetryFailed.style.display = 'none';
      btnPauseBroadcast.style.display = 'inline-flex';
      btnStopBroadcast.style.display = 'inline-flex';
      progressSection.style.display = 'block';

      if (broadcastPollTimer) clearInterval(broadcastPollTimer);
      broadcastPollTimer = setInterval(pollBroadcastProgress, 1200);
    } else {
      alert(`Gagal memulai: ${result.error}`);
    }
  } catch (err) {
    appendLog('error', 'Gagal memicu broadcast: ' + err.message);
  }
}

async function controlBroadcast(action) {
  try {
    const res = await fetch(`${SIDECAR_API}/api/wa/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const result = await res.json();

    if (action === 'pause') {
      btnPauseBroadcast.style.display = 'none';
      btnResumeBroadcast.style.display = 'inline-flex';
      appendLog('warning', 'Broadcast dijeda.');
    } else if (action === 'resume') {
      btnResumeBroadcast.style.display = 'none';
      btnPauseBroadcast.style.display = 'inline-flex';
      appendLog('info', 'Broadcast dilanjutkan.');
    } else if (action === 'stop') {
      resetBroadcastButtons();
      appendLog('warning', 'Broadcast dihentikan.');
    }
  } catch (e) {}
}

async function pollBroadcastProgress() {
  try {
    const res = await fetch(`${SIDECAR_API}/api/wa/progress`);
    const data = await res.json();
    if (!data.success || !data.state) return;

    const st = data.state;
    statSuccessCount.textContent = st.success;
    statFailedCount.textContent = st.failed;
    statProgressCount.textContent = `${st.processed} / ${st.total}`;

    const pct = st.total > 0 ? Math.round((st.processed / st.total) * 100) : 0;
    progressBar.style.width = `${pct}%`;

    if (st.isRunning) {
      progressStatusText.textContent = st.isPaused 
        ? `[DIJEDA] Mengirim ke ${st.currentName}...`
        : `Mengirim ke: ${st.currentName} (${pct}%)...`;
    } else {
      progressStatusText.textContent = `Selesai (${st.success} sukses, ${st.failed} gagal).`;
      if (isBroadcasting) {
        isBroadcasting = false;
        clearInterval(broadcastPollTimer);
        resetBroadcastButtons();

        // Mark contacts status
        if (st.failedTargets && Array.isArray(st.failedTargets)) {
          const failedIds = new Set(st.failedTargets.map(f => f.id));
          contactsData.forEach(c => {
            if (selectedContactIds.has(c.id)) {
              c.lastStatus = failedIds.has(c.id) ? 'failed' : 'success';
            }
          });
        } else {
          contactsData.forEach(c => {
            if (selectedContactIds.has(c.id)) {
              c.lastStatus = 'success';
            }
          });
        }
        renderTable();

        // Show/hide Retry Failed button
        if (btnRetryFailed) {
          if (st.failed > 0) {
            btnRetryFailed.style.display = 'inline-flex';
            if (retryFailedCount) retryFailedCount.textContent = st.failed;
          } else {
            btnRetryFailed.style.display = 'none';
          }
        }

        // Record history & show completion modal
        const durationSec = Math.max(1, Math.round((Date.now() - (broadcastStartTime || Date.now())) / 1000));
        const failures = (st.failedTargets || []).map(f => {
          const errMsg = f.error || 'Gagal mengirim pesan';
          return {
            name: f.recipientName || f.name || 'Kontak',
            phone: f.phone || '-',
            error: errMsg,
            diag: categorizeError(errMsg)
          };
        });

        const session = {
          id: 'broadcast-' + Date.now(),
          timestamp: Date.now(),
          formattedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'broadcast',
          success: st.success,
          failed: st.failed,
          total: st.total,
          durationSec,
          mode: activeDeliveryMode,
          failures
        };
        addNotificationSession(session);
        showCompletionModal(session);
      }
    }
  } catch (e) {}
}

function retryFailedBroadcast() {
  const failedList = contactsData.filter(c => c.lastStatus === 'failed');
  if (failedList.length === 0) {
    alert('Tidak ada kontak dengan status pengiriman gagal.');
    return;
  }

  // Select only failed contacts
  selectedContactIds.clear();
  failedList.forEach(c => selectedContactIds.add(c.id));

  // Change filter to FAILED_ONLY
  tableStatusFilter.value = 'FAILED_ONLY';
  renderTable();
  updateSelectionBadge();

  // Scroll smoothly to start button
  btnStartBroadcast.scrollIntoView({ behavior: 'smooth', block: 'center' });
  appendLog('warning', `[Kirim Ulang] ${failedList.length} kontak gagal telah dipilih kembali. Klik tombol "Mulai Kirim Broadcast" untuk eksekusi.`);
}

function resetBroadcastButtons() {
  btnStartBroadcast.style.display = 'inline-flex';
  btnPauseBroadcast.style.display = 'none';
  btnResumeBroadcast.style.display = 'none';
  btnStopBroadcast.style.display = 'none';
}

function appendLog(type, text) {
  const row = document.createElement('div');
  row.className = `log-row log-${type}`;
  const time = new Date().toLocaleTimeString('id-ID');
  row.textContent = `[${time}] [${type.toUpperCase()}] ${text}`;
  terminalLogBody.insertBefore(row, terminalLogBody.firstChild);
}

// ----------------------------------------------------
// EXPORT REPORT CSV
// ----------------------------------------------------
function exportReportCsv() {
  if (contactsData.length === 0) {
    alert('Tidak ada data kontak untuk diekspor.');
    return;
  }

  const rows = [
    ['No', 'Nama Penerima', 'Nomor WhatsApp', 'Status Lampiran', 'File Path', 'Kota Cabang', 'Nomor Invoice', 'Nominal Tagihan']
  ];

  contactsData.forEach(c => {
    rows.push([
      c.no,
      `"${c.nama}"`,
      `"'${c.phone}"`,
      c.fileInfo ? (c.fileInfo.exists ? 'Tersedia' : 'Tidak Ditemukan') : 'Mode Teks',
      c.fileInfo ? `"${c.fileInfo.full_path}"` : '-',
      `"${c.rawData['Kota Cabang'] || ''}"`,
      `"${c.rawData['Nomor Invoice'] || ''}"`,
      `"${c.rawData['Nominal Tagihan'] || ''}"`
    ]);
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Laporan_Broadcast_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  appendLog('success', 'Laporan rekap berhasil di-download.');
}

// ----------------------------------------------------
// PREFERENCES PERSISTENCE
// ----------------------------------------------------
let saveTimer = null;
function savePreferencesDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const prefs = {
      template: messageTemplate.value,
      minDelay: minDelayInput.value,
      maxDelay: maxDelayInput.value,
      folderPath: attachmentFolderInput.value,
      cooldownEnabled: chkCooldownBatch ? chkCooldownBatch.checked : true,
      batchSize: batchSizeInput ? batchSizeInput.value : 20,
      batchDelay: batchDelayInput ? batchDelayInput.value : 60
    };
    try {
      localStorage.setItem('bulk_wa_sender_prefs', JSON.stringify(prefs));
      if (isTauriEnv) {
        await tauriCore.invoke('cmd_save_preferences', { prefs });
      }
    } catch (e) {}
  }, 600);
}

async function loadSavedPreferences() {
  try {
    const local = localStorage.getItem('bulk_wa_sender_prefs');
    if (local) {
      const p = JSON.parse(local);
      if (p.template) messageTemplate.value = p.template;
      if (p.minDelay) minDelayInput.value = p.minDelay;
      if (p.maxDelay) maxDelayInput.value = p.maxDelay;
      if (chkCooldownBatch && p.cooldownEnabled !== undefined) chkCooldownBatch.checked = p.cooldownEnabled;
      if (batchSizeInput && p.batchSize) batchSizeInput.value = p.batchSize;
      if (batchDelayInput && p.batchDelay) batchDelayInput.value = p.batchDelay;
    }
  } catch (e) {}
}

// ----------------------------------------------------
// THEME CONTROLLER (Obsidian Emerald Light & Dark Toggle Slider)
// ----------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('bulk_wa_sender_theme') || 'dark';
  applyTheme(savedTheme);

  const themeSwitchBtn = document.getElementById('themeSwitchBtn');
  if (themeSwitchBtn) {
    themeSwitchBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });

    // Keyboard support: ArrowLeft = light, ArrowRight = dark
    themeSwitchBtn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        applyTheme('light');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        applyTheme('dark');
      }
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('bulk_wa_sender_theme', theme);

  const themeSwitchBtn = document.getElementById('themeSwitchBtn');
  if (themeSwitchBtn) {
    const isDark = theme === 'dark';
    themeSwitchBtn.setAttribute('aria-checked', isDark ? 'true' : 'false');
    themeSwitchBtn.title = isDark 
      ? 'Mode Gelap Aktif (Klik/Geser ke Kiri untuk Mode Terang)' 
      : 'Mode Terang Aktif (Klik/Geser ke Kanan untuk Mode Gelap)';
  }
}

// ----------------------------------------------------
// WINDOW CENTERING & OPTIMAL SIZE (78% Width, 88% Height)
// ----------------------------------------------------
function centerWindowOnScreen() {
  try {
    if (window.screen && window.screen.availWidth && window.screen.availHeight) {
      const screenW = window.screen.availWidth;
      const screenH = window.screen.availHeight;

      // 78% screen width (e.g. 1500px on 1920x1080) and 88% screen height (~920px)
      const targetW = Math.min(1560, Math.max(1100, Math.round(screenW * 0.78)));
      const targetH = Math.min(940, Math.max(720, Math.round(screenH * 0.88)));

      const targetX = Math.max(0, Math.round((screenW - targetW) / 2));
      const targetY = Math.max(0, Math.round((screenH - targetH) / 2));

      window.resizeTo(targetW, targetH);
      window.moveTo(targetX, targetY);
    }
  } catch (e) {
    // Some host security configurations disallow resizeTo on main windows
  }
}

// ----------------------------------------------------
// COMPLETION MODAL & NOTIFICATION HISTORY CONTROLLER
// ----------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function categorizeError(errMsg) {
  if (!errMsg) return { label: 'Kendala Sistem', desc: 'Tidak ada informasi detail kendala.', class: 'diag-unknown' };
  const str = String(errMsg).toLowerCase();

  if (str.includes('not registered') || str.includes('invalid number') || str.includes('wid') || str.includes('nomor') || str.includes('tidak terdaftar')) {
    return {
      label: 'Nomor Tidak Terdaftar',
      desc: 'Nomor WhatsApp belum terdaftar atau salah format.',
      class: 'diag-unregistered'
    };
  }
  if (str.includes('enoent') || str.includes('not found') || str.includes('lampiran') || str.includes('missing file') || str.includes('berkas')) {
    return {
      label: 'Lampiran Tidak Ada',
      desc: 'File lampiran tidak ditemukan di folder sumber.',
      class: 'diag-file-missing'
    };
  }
  if (str.includes('large') || str.includes('size') || str.includes('payload') || str.includes('besar') || str.includes('terlalu besar') || str.includes('limit')) {
    return {
      label: 'Ukuran Terlalu Besar',
      desc: 'Ukuran file melampaui batas media WhatsApp.',
      class: 'diag-file-large'
    };
  }
  if (str.includes('session') || str.includes('disconnect') || str.includes('connection') || str.includes('timeout') || str.includes('terputus') || str.includes('server')) {
    return {
      label: 'Koneksi Terputus',
      desc: 'Koneksi ke WhatsApp Web / Engine timeout atau terputus.',
      class: 'diag-connection'
    };
  }
  if (str.includes('abort') || str.includes('batal') || str.includes('stop')) {
    return {
      label: 'Dibatalkan Pengguna',
      desc: 'Proses broadcast dihentikan manual oleh pengguna.',
      class: 'diag-unknown'
    };
  }
  return {
    label: 'Gagal Kirim',
    desc: errMsg.length > 60 ? errMsg.substring(0, 57) + '...' : errMsg,
    class: 'diag-unknown'
  };
}

function loadNotificationHistory() {
  try {
    const raw = localStorage.getItem('bulk_wa_history_v1');
    if (raw) {
      notificationHistory = JSON.parse(raw);
    }
    const unread = localStorage.getItem('bulk_wa_unread_v1');
    unreadNotifCount = unread ? parseInt(unread, 10) : 0;
  } catch (e) {
    notificationHistory = [];
    unreadNotifCount = 0;
  }
  updateNotifBadge();
}

function saveNotificationHistory() {
  try {
    localStorage.setItem('bulk_wa_history_v1', JSON.stringify(notificationHistory.slice(0, 30)));
    localStorage.setItem('bulk_wa_unread_v1', String(unreadNotifCount));
  } catch (e) {}
}

function updateNotifBadge() {
  if (!notifBadgeCount) return;
  if (unreadNotifCount > 0) {
    notifBadgeCount.textContent = unreadNotifCount > 9 ? '9+' : unreadNotifCount;
    notifBadgeCount.style.display = 'inline-flex';
  } else {
    notifBadgeCount.style.display = 'none';
  }
}

function addNotificationSession(session) {
  notificationHistory.unshift(session);
  if (notificationHistory.length > 30) {
    notificationHistory.pop();
  }
  unreadNotifCount++;
  updateNotifBadge();
  saveNotificationHistory();
  if (notifHistoryDrawer && notifHistoryDrawer.style.display !== 'none') {
    renderNotificationDrawer();
  }
}

function clearNotificationHistory() {
  if (notificationHistory.length === 0) return;
  showCustomConfirm({
    title: 'Bersihkan Seluruh Riwayat?',
    subtitle: 'Seluruh rekapitulasi dan data audit kegagalan pengiriman broadcast akan dihapus dari penyimpanan komputer.',
    emoji: '🗑️',
    iconClass: 'hero-failed',
    confirmText: 'Ya, Bersihkan',
    confirmBtnClass: 'btn-rose',
    cancelText: 'Batal',
    onConfirm: () => {
      notificationHistory = [];
      unreadNotifCount = 0;
      updateNotifBadge();
      saveNotificationHistory();
      renderNotificationDrawer();
      appendLog('info', 'Riwayat notifikasi & audit telah dibersihkan.');
    }
  });
}

function showCompletionModal(session) {
  if (!completionModalOverlay) return;

  // Header styling & emoji
  modalHeroIcon.className = 'modal-hero-icon';
  if (session.type === 'test') {
    if (session.success > 0) {
      modalHeroIcon.classList.add('hero-success');
      modalHeroEmoji.textContent = '🧪';
      modalTitle.textContent = 'Uji Coba Pengiriman Berhasil!';
      modalSubtitle.textContent = 'Pesan uji coba berhasil terkirim ke nomor tujuan Anda.';
    } else {
      modalHeroIcon.classList.add('hero-failed');
      modalHeroEmoji.textContent = '⚠️';
      modalTitle.textContent = 'Uji Coba Pengiriman Gagal';
      modalSubtitle.textContent = 'Pesan uji coba tidak dapat dikirim ke nomor tujuan.';
    }
  } else {
    if (session.failed === 0) {
      modalHeroIcon.classList.add('hero-success');
      modalHeroEmoji.textContent = '🎉';
      modalTitle.textContent = 'Broadcast Selesai Sempurna!';
      modalSubtitle.textContent = `Seluruh ${session.total} pesan berhasil dikirimkan ke penerima tanpa kendala.`;
    } else if (session.success > 0) {
      modalHeroIcon.classList.add('hero-warning');
      modalHeroEmoji.textContent = '⚠️';
      modalTitle.textContent = 'Broadcast Selesai (Ada Kendala)';
      modalSubtitle.textContent = `${session.success} pesan terkirim, namun terdapat ${session.failed} kontak gagal.`;
    } else {
      modalHeroIcon.classList.add('hero-failed');
      modalHeroEmoji.textContent = '❌';
      modalTitle.textContent = 'Broadcast Gagal Terkirim';
      modalSubtitle.textContent = `Seluruh ${session.total} kontak mengalami kegagalan saat pengiriman.`;
    }
  }

  // Metrics
  modalStatSuccess.textContent = session.success;
  modalStatFailed.textContent = session.failed;
  modalStatTotal.textContent = session.total;
  modalStatDuration.textContent = `${session.durationSec || 0} dtk`;

  // Failures breakdown table
  if (session.failed > 0 && session.failures && session.failures.length > 0) {
    modalFailuresSection.style.display = 'block';
    modalFailuresCount.textContent = session.failures.length;
    modalFailuresTableBody.innerHTML = '';

    session.failures.forEach(f => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color: var(--text-heading);">${escapeHtml(f.name)}</strong></td>
        <td><code>${escapeHtml(f.phone)}</code></td>
        <td>
          <span class="diag-badge ${f.diag.class}">${escapeHtml(f.diag.label)}</span>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">${escapeHtml(f.diag.desc)}</div>
        </td>
      `;
      modalFailuresTableBody.appendChild(tr);
    });

    if (session.type === 'broadcast') {
      btnModalRetryFailed.style.display = 'inline-flex';
      modalRetryBtnCount.textContent = session.failures.length;
    } else {
      btnModalRetryFailed.style.display = 'none';
    }
  } else {
    modalFailuresSection.style.display = 'none';
    btnModalRetryFailed.style.display = 'none';
  }

  completionModalOverlay.style.display = 'flex';
}

function closeCompletionModal() {
  if (completionModalOverlay) {
    completionModalOverlay.style.display = 'none';
  }
}

function toggleNotificationDrawer(forceOpen) {
  if (!notifHistoryDrawer || !notifDrawerOverlay) return;

  const isCurrentlyOpen = notifHistoryDrawer.style.display !== 'none';
  const shouldOpen = forceOpen !== undefined ? forceOpen : !isCurrentlyOpen;

  if (shouldOpen) {
    notifHistoryDrawer.style.display = 'flex';
    notifDrawerOverlay.style.display = 'block';

    // Clear unread badge
    unreadNotifCount = 0;
    updateNotifBadge();
    saveNotificationHistory();

    renderNotificationDrawer();
  } else {
    notifHistoryDrawer.style.display = 'none';
    notifDrawerOverlay.style.display = 'none';
  }
}

function renderNotificationDrawer() {
  if (!notifHistoryBody) return;
  notifHistoryBody.innerHTML = '';

  if (notificationHistory.length === 0) {
    notifHistoryBody.innerHTML = `
      <div class="history-empty-state">
        <svg class="history-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <p style="font-weight: 600; color: var(--text-heading); margin-bottom: 2px;">Belum Ada Riwayat</p>
        <p style="font-size: 0.78rem;">Setiap sesi broadcast atau uji coba yang selesai akan tercatat otomatis di sini.</p>
      </div>
    `;
    return;
  }

  notificationHistory.forEach((session, idx) => {
    const card = document.createElement('div');
    card.className = 'history-session-card';

    const isTest = session.type === 'test';
    const hasFailures = session.failed > 0;
    const isSuccessOnly = session.failed === 0;

    let badgeTypeClass = isTest ? 'badge-duration' : (isSuccessOnly ? 'badge-success' : 'badge-failed');
    let typeLabel = isTest ? '🧪 Uji Coba' : (isSuccessOnly ? '✓ Selesai Sempurna' : '⚠️ Selesai (Ada Gagal)');

    let failuresHtml = '';
    if (hasFailures && session.failures && session.failures.length > 0) {
      failuresHtml = `
        <div style="margin-top: 4px;">
          <button type="button" class="history-toggle-details-btn" data-idx="${idx}">
            Lihat ${session.failures.length} Kontak Gagal & Diagnosa ▾
          </button>
          <div class="history-failures-drawer-list" id="drawerFailures_${idx}" style="display: none; margin-top: 8px;">
            ${session.failures.map(f => `
              <div class="history-fail-item">
                <div>
                  <div class="history-fail-user">${escapeHtml(f.name)}</div>
                  <div class="history-fail-phone">${escapeHtml(f.phone)}</div>
                </div>
                <div style="text-align: right;">
                  <span class="diag-badge ${f.diag.class}">${escapeHtml(f.diag.label)}</span>
                  <div style="font-size: 0.68rem; color: var(--text-dim); max-width: 170px;">${escapeHtml(f.diag.desc)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="history-card-top">
        <div>
          <span class="history-card-title">${isTest ? 'Uji Coba Pengiriman' : 'Sesi Broadcast'}</span>
          <div class="history-card-time">${escapeHtml(session.formattedTime || '')}</div>
        </div>
        <span class="history-badge ${badgeTypeClass}">${typeLabel}</span>
      </div>
      <div class="history-badges-row">
        <span class="history-badge badge-success">✓ ${session.success} Sukses</span>
        ${session.failed > 0 ? `<span class="history-badge badge-failed">✗ ${session.failed} Gagal</span>` : ''}
        <span class="history-badge badge-duration">⏱ ${session.durationSec || 0} dtk</span>
        <span class="history-badge" style="background: rgba(148, 163, 184, 0.15); color: var(--text-dim);">
          Mode: ${session.mode === 'attachment' ? 'Lampiran' : 'Teks'}
        </span>
      </div>
      ${failuresHtml}
    `;

    // Attach expand toggle listener
    const toggleBtn = card.querySelector('.history-toggle-details-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const targetList = document.getElementById(`drawerFailures_${idx}`);
        if (targetList) {
          const isHidden = targetList.style.display === 'none';
          targetList.style.display = isHidden ? 'flex' : 'none';
          toggleBtn.textContent = isHidden 
            ? `Tutup ${session.failures.length} Kontak Gagal ▴` 
            : `Lihat ${session.failures.length} Kontak Gagal & Diagnosa ▾`;
        }
      });
    }

    notifHistoryBody.appendChild(card);
  });
}

// ----------------------------------------------------
// SIMULATION / DUMMY BUTTON TRIGGERS FOR TESTING
// ----------------------------------------------------
function triggerDummySuccess() {
  const dummySuccess = {
    id: 'sim-success-' + Date.now(),
    timestamp: Date.now(),
    formattedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'broadcast',
    success: 15,
    failed: 0,
    total: 15,
    durationSec: 38,
    mode: activeDeliveryMode,
    failures: []
  };
  addNotificationSession(dummySuccess);
  showCompletionModal(dummySuccess);
  appendLog('info', '[Simulasi] Memunculkan modal hasil 100% sukses.');
}

function triggerDummyFailed() {
  const dummyFailed = {
    id: 'sim-fail-' + Date.now(),
    timestamp: Date.now(),
    formattedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'broadcast',
    success: 12,
    failed: 3,
    total: 15,
    durationSec: 52,
    mode: activeDeliveryMode,
    failures: [
      {
        name: 'Dewi Lestari',
        phone: '081299990004',
        error: 'Nomor tidak terdaftar di WhatsApp (Wid lookup error 404)',
        diag: categorizeError('Nomor tidak terdaftar di WhatsApp (Wid lookup error 404)')
      },
      {
        name: 'Hendra Gunawan',
        phone: '081299990009',
        error: 'Berkas lampiran tidak ditemukan di folder (ENOENT Hendra Gunawan.pdf)',
        diag: categorizeError('Berkas lampiran tidak ditemukan di folder (ENOENT Hendra Gunawan.pdf)')
      },
      {
        name: 'Dimas Kurniawan',
        phone: '081299990015',
        error: 'Ukuran file 35MB melampaui limit transmisi WA (File size payload too large)',
        diag: categorizeError('Ukuran file 35MB melampaui limit transmisi WA (File size payload too large)')
      }
    ]
  };
  addNotificationSession(dummyFailed);
  showCompletionModal(dummyFailed);
  appendLog('warning', '[Simulasi] Memunculkan modal hasil ada kontak gagal & audit kendala.');
}

function triggerDummyTest() {
  const dummyTest = {
    id: 'sim-test-' + Date.now(),
    timestamp: Date.now(),
    formattedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    type: 'test',
    success: 1,
    failed: 0,
    total: 1,
    durationSec: 2,
    mode: activeDeliveryMode,
    failures: []
  };
  addNotificationSession(dummyTest);
  showCompletionModal(dummyTest);
  appendLog('info', '[Simulasi] Memunculkan modal hasil uji coba 1 pesan.');
}

// ----------------------------------------------------
// CUSTOM CONFIRMATION & ACTION MODAL CONTROLLER
// ----------------------------------------------------
let activeConfirmCallback = null;

function showCustomConfirm({ title, subtitle, emoji, iconClass, confirmText, cancelText, confirmBtnClass, onConfirm }) {
  const overlay = document.getElementById('confirmModalOverlay');
  if (!overlay) {
    if (confirm(subtitle || title)) {
      if (onConfirm) onConfirm();
    }
    return;
  }

  const titleEl = document.getElementById('confirmModalTitle');
  const subEl = document.getElementById('confirmModalSubtitle');
  const emojiEl = document.getElementById('confirmHeroEmoji');
  const iconEl = document.getElementById('confirmHeroIcon');
  const actionBtn = document.getElementById('btnConfirmAction');
  const cancelBtn = document.getElementById('btnConfirmCancel');

  if (titleEl) titleEl.textContent = title || 'Konfirmasi';
  if (subEl) subEl.textContent = subtitle || 'Apakah Anda yakin ingin melanjutkan tindakan ini?';
  if (emojiEl) emojiEl.textContent = emoji || '⚠️';
  if (iconEl) {
    iconEl.className = 'modal-hero-icon ' + (iconClass || 'hero-warning');
  }
  if (actionBtn) {
    actionBtn.textContent = confirmText || 'Ya, Lanjutkan';
    actionBtn.className = 'btn btn-md ' + (confirmBtnClass || 'btn-amber');
  }
  if (cancelBtn) {
    cancelBtn.textContent = cancelText || 'Batal';
  }

  activeConfirmCallback = onConfirm || null;
  overlay.style.display = 'flex';
}

function closeCustomConfirm() {
  const overlay = document.getElementById('confirmModalOverlay');
  if (overlay) overlay.style.display = 'none';
  activeConfirmCallback = null;
}
