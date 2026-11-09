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
let currentLang = localStorage.getItem('bulk_wa_lang') || 'id';

const SIDECAR_API = 'http://localhost:3847';

// ----------------------------------------------------
// BILINGUAL LOCALIZATION (ID / EN)
// ----------------------------------------------------
const I18N = {
  id: {
    themeTooltip: 'Ubah Tema: Geser Kiri (Terang) / Kanan (Gelap)',
    notifHistoryTooltip: 'Riwayat Notifikasi & Hasil Broadcast',
    waChecking: 'Memeriksa WhatsApp...',
    waConnected: 'Terhubung',
    waScanQR: 'Perlu Scan QR',
    waDisconnected: 'Terputus',
    btnConnectWA: 'Hubungkan WA',
    btnResetWA: 'Reset Sesi',
    resetSessionTooltip: 'Reset sesi jika ingin mengganti akun WhatsApp atau scan ulang',
    winMinTooltip: 'Kecilkan Jendela (Minimize)',
    winMaxTooltip: 'Perbesar Jendela (Maximize / Restore)',
    winCloseTooltip: 'Tutup Aplikasi (Close)',

    gatewayLoadingText: 'Mengecek koneksi WhatsApp...',
    gatewayLoadingSub: 'Memastikan engine lokal di localhost siap digunakan',
    btnRefreshQR: 'Muat Ulang QR',

    modeKicker: 'Fokus Broadcast:',
    modeHeader: 'Pilih Mode Pengiriman Pesan',
    modeTextTitle: 'Pesan Teks Saja',
    modeTextDesc: 'Cepat & efisien, notifikasi atau promosi',
    modeAttachmentTitle: 'Pesan + Lampiran File',
    modeAttachmentDesc: 'Kirim dokumen PDF atau gambar dinamis',

    cardSourceTitle: 'File Kontak Excel / CSV',
    cardSourceDesc: 'Membaca data penerima & seluruh kolom otomatis.',
    btnDownloadTemplate: 'Download Template (.xlsx)',
    btnDownloadTemplateTooltip: 'Download template Excel siap pakai (.xlsx) agar langsung terbaca sistem',
    btnUseDemoData: '⚡ Data Contoh (15)',
    btnUseDemoDataTooltip: 'Muat 15 kontak contoh yang sudah disiapkan',
    dropzoneTitle: 'Tarik & Lepas File Spreadsheet Disini',
    btnBrowseFile: 'Pilih File dari Komputer',
    dropzoneHint: 'Format didukung: .xlsx, .xls, .xlsm, .csv',
    btnChangeFile: 'Ganti File',
    sheetSelectLabel: 'Pilih Sheet:',
    mappingDrawerBtn: '⚙️ Sesuaikan Pemetaan Kolom ▾',
    mapNameLabel: '👤 Kolom Nama',
    mapPhoneLabel: '📱 Kolom Nomor Telepon',
    mapCustomLabel: '📎 Kolom Nama Lampiran File (Opsional)',

    cardAttachTitle: 'Pengaturan Lampiran File',
    cardAttachDesc: 'Tentukan folder & metode pencocokan nama file.',
    attachFolderLabel: 'Lokasi Folder File Lampiran:',
    attachFolderPlaceholder: 'Contoh: sample_data/attachments...',
    btnBrowseFolder: 'Pilih Folder',
    btnBrowseFolderTooltip: 'Pilih lokasi folder lampiran dari komputer',
    btnScanFolder: 'Pindai',
    presetLabel: 'Pilihan Cepat:',
    btnPresetDemoFolder: '📂 Folder Lampiran Contoh',
    matchingRuleTitle: 'Aturan Pencocokan Nama File:',
    ruleByNameTitle: 'Sesuai Nama Penerima',
    ruleByNameDesc: 'Contoh: <code>Budi Santoso.pdf</code> atau <code>Dewi Lestari.jpg</code>',
    ruleByColTitle: 'Ambil dari Kolom Excel',
    ruleByColDesc: 'Contoh: Kolom <code>Nama Lampiran File</code> atau <code>Custom Kolom 1</code>',
    formatSupportedLabel: 'Format Didukung:',

    cardComposerTitle: 'Penyusun Pesan',
    cardComposerDesc: 'Ketik pesan dinamis dengan variabel personal & Spintax.',
    jitterLabel: '⏱️ Jeda:',
    tagsLabel: 'Sisipkan Tag Kolom & Variasi:',
    messagePlaceholder: 'Ketik format pesan disini...',
    defaultTemplate: `{Salam} Rekan {Nama},

{Berikut ini kami sampaikan|Bersama ini kami kirimkan|Melalui pesan ini kami informasikan} informasi penting untuk Anda:
• Lokasi / Cabang: {Kota/Cabang}
• Keterangan 1: {Custom Kolom 1}
• Keterangan 2: {Custom Kolom 2}

Mohon dapat diperiksa kembali. Apabila ada pertanyaan, silakan membalas pesan ini.

{Terima kasih atas kerja samanya!|Salam hangat dan sukses selalu!|Hormat kami,}
Bulk WA Sender • by schrist.`,

    cardExecTitle: 'Uji Coba & Eksekusi Broadcast Massal',
    cardExecDesc: 'Kirim pesan uji coba ke nomor pribadi, kemudian luncurkan broadcast massal.',
    testSendTitle: '🧪 Uji Coba Kirim 1 Pesan:',
    testSendDesc: 'Kirimkan contoh pesan saat ini ke nomor pribadi Anda.',
    testPhonePlaceholder: 'Nomor WA (contoh: 08123456789)',
    btnSendTest: 'Kirim Uji Coba',
    btnStartBroadcast: 'Mulai Kirim Broadcast',
    btnRetryFailed: 'Kirim Ulang Kontak Gagal',
    btnPauseBroadcast: 'Jeda',
    btnResumeBroadcast: 'Lanjutkan',
    btnStopBroadcast: 'Hentikan',

    simLabel: '🧪 Uji Coba Modal & Riwayat (Dummy):',
    btnDummySuccess: '✓ Simulasi Sukses',
    btnDummyFailed: '⚠️ Simulasi Ada Gagal (Audit)',
    btnDummyTest: '🧪 Simulasi Uji Coba 1 Pesan',

    terminalTitle: 'Log Aktivitas Realtime',
    btnExportReport: 'Download Laporan Rekap (.csv)',
    btnClearLogs: 'Bersihkan',

    tableTitle: 'Daftar Penerima & Verifikasi Pra-Kirim (Pre-Flight)',
    tableDesc: 'Pilih kontak yang akan dikirimi pesan dan pastikan file lampiran siap.',
    tableSearchPlaceholder: 'Cari nama, nomor, kota, atau kolom custom...',
    filterAll: 'Semua Kontak',
    filterValid: 'Hanya Nomor Valid',
    filterHasFile: 'Hanya Yang Punya Lampiran',
    filterFailed: 'Hanya Kontak Gagal',
    selectAllLabel: 'Pilih Semua Kontak yang Tampil',
    selectedBadge: 'Terpilih',
    fromTotalWord: 'dari total',
    contactsWord: 'Kontak',
    thSelect: 'Pilih',
    thNo: 'No',
    thName: 'Nama',
    thPhone: 'Nomor Telepon',
    thAttachment: 'Nama Lampiran File',
    thDeliveryMode: 'Mode Kirim',
    thBranch: 'Kota/Cabang',
    thCustom1: 'Custom Kolom 1',
    thCustom2: 'Custom Kolom 2',
    thCustom3: 'Custom Kolom 3',

    previewLabel: 'Preview Pesan :',
    btnShuffleSpintax: 'Acak',
    onlineText: 'online',

    metricSent: 'Terkirim',
    metricFailed: 'Gagal',
    metricTotal: 'Total Kontak',
    metricDuration: 'Durasi',
    btnModalDownloadCsv: 'Download Laporan (.csv)',
    btnModalClose: 'Tutup',

    drawerTitle: 'Riwayat Notifikasi & Audit',
    btnClearDrawer: 'Bersihkan'
  },

  en: {
    themeTooltip: 'Toggle Theme: Left (Light) / Right (Dark)',
    notifHistoryTooltip: 'Notification History & Dispatch Audit',
    waChecking: 'Checking WhatsApp...',
    waConnected: 'Connected',
    waScanQR: 'Scan QR Required',
    waDisconnected: 'Disconnected',
    btnConnectWA: 'Connect WA',
    btnResetWA: 'Reset Session',
    resetSessionTooltip: 'Reset session to switch WhatsApp account or re-scan QR',
    winMinTooltip: 'Minimize Window',
    winMaxTooltip: 'Maximize / Restore Window',
    winCloseTooltip: 'Close Application',

    gatewayLoadingText: 'Checking WhatsApp connection...',
    gatewayLoadingSub: 'Ensuring local sidecar engine on localhost is ready',
    btnRefreshQR: 'Reload QR',

    modeKicker: 'Broadcast Focus:',
    modeHeader: 'Select Message Delivery Mode',
    modeTextTitle: 'Text Mode Only',
    modeTextDesc: 'Fast & efficient, notifications or promotions',
    modeAttachmentTitle: 'Message + File Attachment',
    modeAttachmentDesc: 'Send personalized PDF documents or images',

    cardSourceTitle: 'Excel / CSV Contact File',
    cardSourceDesc: 'Automatically reads recipient data & all spreadsheet columns.',
    btnDownloadTemplate: 'Download Template (.xlsx)',
    btnDownloadTemplateTooltip: 'Download ready-to-fill Excel template (.xlsx) for guaranteed compatibility',
    btnUseDemoData: '⚡ Load Demo Data (15)',
    btnUseDemoDataTooltip: 'Load 15 pre-configured sample contacts for instant testing',
    dropzoneTitle: 'Drag & Drop Spreadsheet File Here',
    btnBrowseFile: 'Browse File from Computer',
    dropzoneHint: 'Supported formats: .xlsx, .xls, .xlsm, .csv',
    btnChangeFile: 'Change File',
    sheetSelectLabel: 'Select Sheet:',
    mappingDrawerBtn: '⚙️ Customize Column Mapping ▾',
    mapNameLabel: '👤 Name Column',
    mapPhoneLabel: '📱 Phone Number Column',
    mapCustomLabel: '📎 Attachment File Name Column (Optional)',

    cardAttachTitle: 'File Attachment Settings',
    cardAttachDesc: 'Configure folder path & filename matching strategy.',
    attachFolderLabel: 'Attachment Folder Location:',
    attachFolderPlaceholder: 'e.g. sample_data/attachments...',
    btnBrowseFolder: 'Browse Folder',
    btnBrowseFolderTooltip: 'Select attachment folder from your computer',
    btnScanFolder: 'Scan',
    presetLabel: 'Quick Preset:',
    btnPresetDemoFolder: '📂 Sample Attachments Folder',
    matchingRuleTitle: 'Filename Matching Strategy:',
    ruleByNameTitle: 'By Recipient Name',
    ruleByNameDesc: 'e.g.: <code>Budi Santoso.pdf</code> or <code>Dewi Lestari.jpg</code>',
    ruleByColTitle: 'From Excel / CSV Column',
    ruleByColDesc: 'e.g.: Column <code>Attachment File Name</code> or <code>Custom Column 1</code>',
    formatSupportedLabel: 'Supported Formats:',

    cardComposerTitle: 'Message Composer',
    cardComposerDesc: 'Type dynamic template with personal variables & Spintax.',
    jitterLabel: '⏱️ Jitter Delay:',
    tagsLabel: 'Insert Column Tags & Variations:',
    messagePlaceholder: 'Type message template here...',
    defaultTemplate: `{Salam} Dear {Nama},

{We hereby share|Please find below|Here is} important information prepared for you:
• City / Branch: {Kota/Cabang}
• Detail 1: {Custom Kolom 1}
• Detail 2: {Custom Kolom 2}

Please review the details at your convenience. Feel free to reply if you have any questions.

{Thank you for your cooperation!|Warm regards and best wishes!|Sincerely,}
Bulk WA Sender • by schrist.`,

    cardExecTitle: 'Test Dispatch & Mass Broadcast',
    cardExecDesc: 'Send test message to personal number, then launch mass broadcast.',
    testSendTitle: '🧪 Send 1 Test Message:',
    testSendDesc: 'Dispatch current template sample to your personal phone number.',
    testPhonePlaceholder: 'WhatsApp No (e.g. 08123456789 / +62...)',
    btnSendTest: 'Send Test',
    btnStartBroadcast: 'Start Broadcast',
    btnRetryFailed: 'Retry Failed Contacts',
    btnPauseBroadcast: 'Pause',
    btnResumeBroadcast: 'Resume',
    btnStopBroadcast: 'Stop',

    simLabel: '🧪 Modal & History Simulator (QA):',
    btnDummySuccess: '✓ Simulate Success',
    btnDummyFailed: '⚠️ Simulate Failures (Audit)',
    btnDummyTest: '🧪 Simulate 1 Test Message',

    terminalTitle: 'Real-time Activity Log',
    btnExportReport: 'Export Audit Report (.csv)',
    btnClearLogs: 'Clear',

    tableTitle: 'Recipient List & Pre-Flight Verification',
    tableDesc: 'Select recipients to message and ensure attachment files are ready.',
    tableSearchPlaceholder: 'Search name, phone, city, or custom columns...',
    filterAll: 'All Contacts',
    filterValid: 'Valid Numbers Only',
    filterHasFile: 'With Attachments Only',
    filterFailed: 'Failed Contacts Only',
    selectAllLabel: 'Select All Displayed Contacts',
    selectedBadge: 'Selected',
    fromTotalWord: 'from total',
    contactsWord: 'Contacts',
    thSelect: 'Select',
    thNo: 'No',
    thName: 'Name',
    thPhone: 'Phone Number',
    thAttachment: 'Attachment File Name',
    thDeliveryMode: 'Delivery Mode',
    thBranch: 'City/Branch',
    thCustom1: 'Custom Column 1',
    thCustom2: 'Custom Column 2',
    thCustom3: 'Custom Column 3',

    previewLabel: 'Message Preview :',
    btnShuffleSpintax: 'Shuffle',
    onlineText: 'online',

    metricSent: 'Sent',
    metricFailed: 'Failed',
    metricTotal: 'Total Contacts',
    metricDuration: 'Duration',
    btnModalDownloadCsv: 'Download Report (.csv)',
    btnModalClose: 'Close',

    drawerTitle: 'Notification & Audit History',
    btnClearDrawer: 'Clear'
  }
};

const LEGACY_DEFAULT_SIGNATURES = [
  '{Salam} Rekan {Nama Lengkap},',
  '{Salam} Dear {Nama Lengkap},'
];

function isBuiltInDefaultTemplate(text) {
  if (!text) return true;
  const trimmed = String(text).trim();
  if (!trimmed) return true;
  if (trimmed === I18N.id.defaultTemplate.trim() || trimmed === I18N.en.defaultTemplate.trim()) {
    return true;
  }
  return LEGACY_DEFAULT_SIGNATURES.some(sig => trimmed.startsWith(sig) && trimmed.includes('{Nominal Tagihan}'));
}

function applyLanguage(lang) {
  currentLang = lang === 'en' ? 'en' : 'id';
  localStorage.setItem('bulk_wa_lang', currentLang);
  const isEn = currentLang === 'en';
  const t = I18N[currentLang];

  // Update Toggle Button States
  const langBtnId = document.getElementById('langBtnId');
  const langBtnEn = document.getElementById('langBtnEn');
  if (langBtnId) langBtnId.classList.toggle('active', !isEn);
  if (langBtnEn) langBtnEn.classList.toggle('active', isEn);

  // Update Titlebar & Window Tooltips
  const themeSwitchBtn = document.getElementById('themeSwitchBtn');
  if (themeSwitchBtn) themeSwitchBtn.title = t.themeTooltip;
  const btnNotifBell = document.getElementById('btnNotifBell');
  if (btnNotifBell) btnNotifBell.title = t.notifHistoryTooltip;
  const btnConnectWA = document.getElementById('btnConnectWA');
  if (btnConnectWA) btnConnectWA.innerHTML = `<svg class="icon"><use href="#icon-wa"/></svg> ${t.btnConnectWA}`;
  const btnResetWA = document.getElementById('btnResetWA');
  if (btnResetWA) {
    btnResetWA.title = t.resetSessionTooltip;
    btnResetWA.innerHTML = `<svg class="icon"><use href="#icon-refresh"/></svg> ${t.btnResetWA}`;
  }
  const btnWinMin = document.getElementById('btnWinMinimize');
  if (btnWinMin) btnWinMin.title = t.winMinTooltip;
  const btnWinMax = document.getElementById('btnWinMaximize');
  if (btnWinMax) btnWinMax.title = t.winMaxTooltip;
  const btnWinClose = document.getElementById('btnWinClose');
  if (btnWinClose) btnWinClose.title = t.winCloseTooltip;

  // Update Gateway
  const gwRefreshBtn = document.getElementById('btnGatewayRefreshQR');
  if (gwRefreshBtn) {
    gwRefreshBtn.innerHTML = `<svg class="icon"><use href="#icon-refresh"/></svg> ${t.btnRefreshQR}`;
    gwRefreshBtn.title = isEn ? 'Reload QR Code' : 'Muat ulang QR Code';
  }
  const gwInstTitle = document.querySelector('.instructions-title');
  if (gwInstTitle) gwInstTitle.textContent = isEn ? 'Link Your WhatsApp' : 'Tautkan WhatsApp Anda';
  const gwInstSub = document.querySelector('.instructions-subtitle');
  if (gwInstSub) gwInstSub.textContent = isEn ? 'Open WhatsApp on your phone to link this device:' : 'Buka WhatsApp di ponsel untuk menautkan perangkat:';
  const gwSteps = document.querySelectorAll('.qr-steps-list li .step-content');
  if (gwSteps && gwSteps.length >= 3) {
    const st0s = gwSteps[0].querySelector('strong');
    const st0p = gwSteps[0].querySelector('span');
    if (st0s) st0s.textContent = isEn ? 'Open WhatsApp on your phone' : 'Buka WhatsApp di ponsel Anda';
    if (st0p) st0p.textContent = isEn ? 'Make sure your phone has an active internet connection' : 'Pastikan ponsel terhubung ke internet';
    const st1s = gwSteps[1].querySelector('strong');
    const st1p = gwSteps[1].querySelector('span');
    if (st1s) st1s.textContent = isEn ? 'Select Linked Devices' : 'Pilih Perangkat Tertaut';
    if (st1p) {
      st1p.innerHTML = isEn
        ? 'Tap <b>Menu (⋮)</b> on Android or <b>Settings</b> on iOS, then tap <b>Linked Devices &bull; Link a Device</b>'
        : 'Ketuk <b>Menu (⋮)</b> di Android atau <b>Pengaturan</b> di iOS, lalu pilih <b>Perangkat Tertaut &bull; Tautkan Perangkat</b>';
    }
    const st2s = gwSteps[2].querySelector('strong');
    const st2p = gwSteps[2].querySelector('span');
    if (st2s) st2s.textContent = isEn ? 'Point your camera at the QR Code' : 'Arahkan kamera ke QR Code di samping';
    if (st2p) st2p.textContent = isEn ? 'Your session stays encrypted locally on this computer' : 'Sesi login tersimpan aman secara offline di komputer Anda';
  }
  const gwSecureNote = document.querySelector('.qr-secure-note span');
  if (gwSecureNote) {
    gwSecureNote.textContent = isEn
      ? 'Privacy Protected: Multi-Device session encrypted locally on your PC.'
      : 'Privasi Terjaga: Multi-Device terenkripsi langsung di komputer lokal.';
  }
  const gwSpinnerTxt = document.querySelector('#gatewayQRSpinner span');
  if (gwSpinnerTxt) gwSpinnerTxt.textContent = isEn ? 'Generating QR Code...' : 'Menyiapkan QR Code...';

  // Mode Selection Bar
  const modeKicker = document.querySelector('.mode-kicker');
  if (modeKicker) modeKicker.textContent = t.modeKicker;
  const modeHeader = document.querySelector('.mode-title-col h3');
  if (modeHeader) modeHeader.textContent = t.modeHeader;
  const modeBtnTextEl = document.getElementById('modeBtnText');
  if (modeBtnTextEl) {
    const s = modeBtnTextEl.querySelector('strong');
    const sp = modeBtnTextEl.querySelector('span');
    if (s) s.textContent = t.modeTextTitle;
    if (sp) sp.textContent = t.modeTextDesc;
  }
  const modeBtnAttEl = document.getElementById('modeBtnAttachment');
  if (modeBtnAttEl) {
    const s = modeBtnAttEl.querySelector('strong');
    const sp = modeBtnAttEl.querySelector('span');
    if (s) s.textContent = t.modeAttachmentTitle;
    if (sp) sp.textContent = t.modeAttachmentDesc;
  }

  // Card A: Excel/CSV
  const cardSourceH2 = document.querySelector('.source-card h2');
  if (cardSourceH2) cardSourceH2.textContent = t.cardSourceTitle;
  const cardSourceDesc = document.querySelector('.source-card .section-desc');
  if (cardSourceDesc) cardSourceDesc.textContent = t.cardSourceDesc;
  const btnDlTpl = document.getElementById('btnDownloadTemplate');
  const btnDlTplTxt = document.getElementById('btnDownloadTemplateText');
  if (btnDlTplTxt) btnDlTplTxt.textContent = t.btnDownloadTemplate;
  if (btnDlTpl) btnDlTpl.title = t.btnDownloadTemplateTooltip;
  const btnUseDemo = document.getElementById('btnUseDemoData');
  if (btnUseDemo) {
    btnUseDemo.textContent = t.btnUseDemoData;
    btnUseDemo.title = t.btnUseDemoDataTooltip;
  }
  const dropStrong = document.querySelector('#dropzoneContent strong');
  if (dropStrong) dropStrong.textContent = t.dropzoneTitle;
  const btnBrowse = document.getElementById('btnBrowseFile');
  if (btnBrowse) btnBrowse.textContent = t.btnBrowseFile;
  const dropHint = document.querySelector('.dropzone-hint');
  if (dropHint) dropHint.textContent = t.dropzoneHint;
  const btnChange = document.getElementById('btnChangeFile');
  if (btnChange) btnChange.textContent = t.btnChangeFile;
  const sheetLbl = document.querySelector('.sheet-selector-group label');
  if (sheetLbl) sheetLbl.textContent = t.sheetSelectLabel;
  const btnToggleMap = document.getElementById('btnToggleMapping');
  const mapDrawerEl = document.getElementById('mappingDrawer');
  if (btnToggleMap) {
    const isOpen = mapDrawerEl && mapDrawerEl.style.display !== 'none';
    btnToggleMap.textContent = isOpen
      ? (isEn ? '⚙️ Hide Column Mapping ▴' : '⚙️ Tutup Pemetaan Kolom ▴')
      : t.mappingDrawerBtn;
  }
  const mapSumEl = document.getElementById('mappingStatusSummary');
  const mNameEl = document.getElementById('mapNameCol');
  const mPhoneEl = document.getElementById('mapPhoneCol');
  const mCustomEl = document.getElementById('mapCustomCol');
  [mNameEl, mPhoneEl, mCustomEl].forEach(sel => {
    if (sel && sel.options && sel.options.length > 0 && sel.options[0].value === '') {
      sel.options[0].textContent = isEn ? '-- Select Column --' : '-- Pilih Kolom --';
    }
  });
  if (mapSumEl && mNameEl && mPhoneEl && mNameEl.value) {
    mapSumEl.textContent = isEn
      ? `Name: '${mNameEl.value}', Phone: '${mPhoneEl.value}'`
      : `Kolom Nama: '${mNameEl.value}', Nomor: '${mPhoneEl.value}'`;
  }
  const lblName = document.querySelector('label[for="mapNameCol"]');
  if (lblName) lblName.innerHTML = `${t.mapNameLabel} <span class="req">*</span>`;
  const lblPhone = document.querySelector('label[for="mapPhoneCol"]');
  if (lblPhone) lblPhone.innerHTML = `${t.mapPhoneLabel} <span class="req">*</span>`;
  const lblCustom = document.querySelector('label[for="mapCustomCol"]');
  if (lblCustom) lblCustom.textContent = t.mapCustomLabel;

  // Card B: Attachment Config
  const cardAttH2 = document.querySelector('.attachment-card h2');
  if (cardAttH2) cardAttH2.textContent = t.cardAttachTitle;
  const cardAttDesc = document.querySelector('.attachment-card .section-desc');
  if (cardAttDesc) cardAttDesc.textContent = t.cardAttachDesc;
  const lblAttFolder = document.querySelector('label[for="attachmentFolderInput"]');
  if (lblAttFolder) lblAttFolder.textContent = t.attachFolderLabel;
  const attFolderInput = document.getElementById('attachmentFolderInput');
  if (attFolderInput) attFolderInput.placeholder = t.attachFolderPlaceholder;
  const btnBrowseFld = document.getElementById('btnBrowseAttachmentFolder');
  const btnBrowseFldTxt = document.getElementById('btnBrowseFolderText');
  if (btnBrowseFldTxt) btnBrowseFldTxt.textContent = t.btnBrowseFolder;
  if (btnBrowseFld) btnBrowseFld.title = t.btnBrowseFolderTooltip;
  const btnScan = document.getElementById('btnScanFolder');
  if (btnScan) btnScan.textContent = t.btnScanFolder;
  const presetLbl = document.querySelector('.preset-label');
  if (presetLbl) presetLbl.textContent = t.presetLabel;
  const btnPresetDemo = document.getElementById('btnPresetDemoFolder');
  if (btnPresetDemo) btnPresetDemo.textContent = t.btnPresetDemoFolder;
  const ruleBoxTitle = document.querySelector('.rule-box-title');
  if (ruleBoxTitle) ruleBoxTitle.textContent = t.matchingRuleTitle;
  const radioLabels = document.querySelectorAll('.rule-radio-group .radio-label');
  if (radioLabels && radioLabels.length >= 2) {
    const s0 = radioLabels[0].querySelector('strong');
    const sp0 = radioLabels[0].querySelector('span');
    if (s0) s0.textContent = t.ruleByNameTitle;
    if (sp0) sp0.innerHTML = t.ruleByNameDesc;
    const s1 = radioLabels[1].querySelector('strong');
    const sp1 = radioLabels[1].querySelector('span');
    if (s1) s1.textContent = t.ruleByColTitle;
    if (sp1) sp1.innerHTML = t.ruleByColDesc;
  }
  const formatLbl = document.querySelector('.format-label');
  if (formatLbl) formatLbl.textContent = t.formatSupportedLabel;

  // Card C: Composer
  const cardCompH2 = document.querySelector('.composer-card h2');
  if (cardCompH2) cardCompH2.textContent = t.cardComposerTitle;
  const cardCompDesc = document.querySelector('.composer-card .section-desc');
  if (cardCompDesc) cardCompDesc.textContent = t.cardComposerDesc;
  const jitterLbl = document.querySelector('.anti-banned-widget .widget-label');
  if (jitterLbl) jitterLbl.textContent = t.jitterLabel;
  const jitterSpans = document.querySelectorAll('.jitter-inputs span');
  if (jitterSpans && jitterSpans.length >= 2) {
    jitterSpans[0].textContent = isEn ? 'to' : 's/d';
    jitterSpans[1].textContent = isEn ? 'sec' : 'dtk';
  }
  const cooldownSpans = document.querySelectorAll('.cooldown-inputs span');
  if (cooldownSpans && cooldownSpans.length >= 3) {
    cooldownSpans[0].textContent = isEn ? 'Every' : 'Tiap';
    cooldownSpans[1].textContent = isEn ? 'msgs, pause' : 'pesan, jeda';
    cooldownSpans[2].textContent = isEn ? 'sec' : 'dtk';
  }
  const badgeEl = document.getElementById('matchPercentageBadge');
  if (badgeEl) {
    if (activeDeliveryMode === 'text') {
      badgeEl.textContent = isEn ? 'Text Mode Active' : 'Mode Teks Aktif';
    } else if (!(attFolderInput && attFolderInput.value.trim())) {
      badgeEl.textContent = isEn ? 'Select Folder First' : 'Pilih Folder Dulu';
    } else if (currentMatchingSummary && currentMatchingSummary.error) {
      badgeEl.textContent = isEn
        ? `0 / ${contactsData.length} Files (Folder Not Found)`
        : `0 / ${contactsData.length} File (Folder Tidak Ditemukan)`;
    } else if (currentMatchingSummary) {
      badgeEl.textContent = `${currentMatchingSummary.found_count} / ${currentMatchingSummary.total_records} ${isEn ? 'Files Ready' : 'File Siap'} (${currentMatchingSummary.match_percentage}%)`;
    }
  }
  const tagsLbl = document.querySelector('.tags-label');
  if (tagsLbl) tagsLbl.textContent = t.tagsLabel;
  const msgTpl = document.getElementById('messageTemplate');
  if (msgTpl) {
    msgTpl.placeholder = t.messagePlaceholder;
    if (isBuiltInDefaultTemplate(msgTpl.value)) {
      msgTpl.value = t.defaultTemplate;
    }
  }

  // Execution Section
  const cardExecH2 = document.querySelector('.execution-section h2');
  if (cardExecH2) cardExecH2.textContent = t.cardExecTitle;
  const cardExecDesc = document.querySelector('.execution-section .section-desc');
  if (cardExecDesc) cardExecDesc.textContent = t.cardExecDesc;
  const testSendStrong = document.querySelector('.test-send-labels strong');
  if (testSendStrong) testSendStrong.textContent = t.testSendTitle;
  const testSendSpan = document.querySelector('.test-send-labels span');
  if (testSendSpan) testSendSpan.textContent = t.testSendDesc;
  const testPhoneInp = document.getElementById('testPhoneInput');
  if (testPhoneInp) testPhoneInp.placeholder = t.testPhonePlaceholder;
  const btnTest = document.getElementById('btnSendTest');
  if (btnTest) btnTest.innerHTML = `<svg class="icon"><use href="#icon-test"/></svg> ${t.btnSendTest}`;
  const btnStart = document.getElementById('btnStartBroadcast');
  if (btnStart) {
    btnStart.innerHTML = `<svg class="icon"><use href="#icon-send"/></svg> ${t.btnStartBroadcast} (<span id="btnTargetCount">${selectedContactIds.size}</span> ${t.contactsWord})`;
  }
  const btnRetry = document.getElementById('btnRetryFailed');
  if (btnRetry) {
    const curCount = document.getElementById('retryFailedCount') ? document.getElementById('retryFailedCount').textContent : '0';
    btnRetry.innerHTML = `<svg class="icon"><use href="#icon-refresh"/></svg> ${t.btnRetryFailed} (<span id="retryFailedCount">${curCount}</span>)`;
  }
  const btnPause = document.getElementById('btnPauseBroadcast');
  if (btnPause) btnPause.innerHTML = `<svg class="icon"><use href="#icon-pause"/></svg> ${t.btnPauseBroadcast}`;
  const btnResume = document.getElementById('btnResumeBroadcast');
  if (btnResume) btnResume.innerHTML = `<svg class="icon"><use href="#icon-play"/></svg> ${t.btnResumeBroadcast}`;
  const btnStop = document.getElementById('btnStopBroadcast');
  if (btnStop) btnStop.innerHTML = `<svg class="icon"><use href="#icon-stop"/></svg> ${t.btnStopBroadcast}`;

  // Simulation Bar
  const simLbl = document.querySelector('.simulation-label');
  if (simLbl) simLbl.textContent = t.simLabel;
  const btnDummySucc = document.getElementById('btnDummySuccessModal');
  if (btnDummySucc) btnDummySucc.textContent = t.btnDummySuccess;
  const btnDummyFail = document.getElementById('btnDummyFailedModal');
  if (btnDummyFail) btnDummyFail.textContent = t.btnDummyFailed;
  const btnDummyTst = document.getElementById('btnDummyTestSend');
  if (btnDummyTst) btnDummyTst.textContent = t.btnDummyTest;

  // Terminal Log
  const termTitle = document.querySelector('.terminal-title');
  if (termTitle) termTitle.textContent = t.terminalTitle;
  const btnExport = document.getElementById('btnExportReport');
  if (btnExport) btnExport.innerHTML = `<svg class="icon"><use href="#icon-export"/></svg> ${t.btnExportReport}`;
  const btnClearL = document.getElementById('btnClearLogs');
  if (btnClearL) btnClearL.textContent = t.btnClearLogs;

  // Table
  const tableH2 = document.querySelector('.table-card h2');
  if (tableH2) tableH2.textContent = t.tableTitle;
  const tableDesc = document.querySelector('.table-card .section-desc');
  if (tableDesc) tableDesc.textContent = t.tableDesc;
  const tableSearch = document.getElementById('tableSearchInput');
  if (tableSearch) tableSearch.placeholder = t.tableSearchPlaceholder;
  const selectAllLbl = document.querySelector('label[for="selectAllCheckbox"] b');
  if (selectAllLbl) selectAllLbl.textContent = t.selectAllLabel;
  const selSummary = document.querySelector('.selection-summary');
  if (selSummary) {
    selSummary.innerHTML = `<span class="badge-selection" id="selectionCountBadge">${selectedContactIds.size} ${t.selectedBadge}</span> <span>${t.fromTotalWord} <strong id="totalTableCount">${contactsData.length}</strong> ${t.contactsWord}</span>`;
  }

  const filterSelect = document.getElementById('tableStatusFilter');
  if (filterSelect && filterSelect.options && filterSelect.options.length >= 4) {
    filterSelect.options[0].textContent = t.filterAll;
    filterSelect.options[1].textContent = t.filterValid;
    filterSelect.options[2].textContent = t.filterHasFile;
    filterSelect.options[3].textContent = t.filterFailed;
  }

  // Modal Metrics Labels
  const mSuccessLbl = document.querySelector('.metric-success .metric-label');
  if (mSuccessLbl) mSuccessLbl.textContent = t.metricSent;
  const mFailedLbl = document.querySelector('.metric-failed .metric-label');
  if (mFailedLbl) mFailedLbl.textContent = t.metricFailed;
  const mTotalLbl = document.querySelector('.metric-total .metric-label');
  if (mTotalLbl) mTotalLbl.textContent = t.metricTotal;
  const mTimeLbl = document.querySelector('.metric-time .metric-label');
  if (mTimeLbl) mTimeLbl.textContent = t.metricDuration;
  const btnModCsv = document.getElementById('btnModalDownloadCsv');
  if (btnModCsv) btnModCsv.innerHTML = `<svg class="icon"><use href="#icon-export"/></svg> ${t.btnModalDownloadCsv}`;
  const btnModDismiss = document.getElementById('btnModalDismiss');
  if (btnModDismiss) btnModDismiss.textContent = t.btnModalClose;

  // Drawer
  const drawerH3 = document.querySelector('.drawer-title-group h3');
  if (drawerH3) drawerH3.textContent = t.drawerTitle;
  const btnClearHist = document.getElementById('btnClearHistory');
  if (btnClearHist) btnClearHist.textContent = t.btnClearDrawer;

  // Mockup preview
  const prevHdrLbl = document.querySelector('.preview-header-label');
  if (prevHdrLbl) prevHdrLbl.textContent = t.previewLabel;
  const btnShuf = document.getElementById('btnShuffleSpintax');
  if (btnShuf) btnShuf.innerHTML = `<svg class="icon"><use href="#icon-shuffle"/></svg> ${t.btnShuffleSpintax}`;
  const chatStatus = document.querySelector('.chat-user-status');
  if (chatStatus) chatStatus.textContent = t.onlineText;

  // Rebuild Dynamic Tag Buttons
  if (currentExcelMeta && currentExcelMeta.headers) {
    rebuildDynamicTagPills(currentExcelMeta.headers);
  }

  // Refresh Table (rebuilds dynamic <thead> and <tbody>), Notification Drawer List & Live Preview
  if (typeof contactsTableBody !== 'undefined' && contactsTableBody) {
    renderTable();
  }
  renderNotificationDrawer();

  // Refresh Live Preview & WA status text
  updateLivePreview();
  if (waStatusBadge && waStatusText) {
    if (waStatusBadge.classList.contains('status-disconnected')) {
      waStatusText.textContent = t.waChecking;
    }
  }
}

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
const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
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
const attachmentFolderPicker = document.getElementById('attachmentFolderPicker');
const btnBrowseAttachmentFolder = document.getElementById('btnBrowseAttachmentFolder');
const btnScanFolder = document.getElementById('btnScanFolder');
const btnPresetDemoFolder = document.getElementById('btnPresetDemoFolder');
let browserPickedFiles = null;

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
  applyLanguage(currentLang);

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
    appendLog('system', 'Tauri Rust Core (v1.0) aktif & terhubung.');
  } else {
    isTauriEnv = false;
    appendLog('system', 'Berjalan di mode Webview standalone.');
  }
}

// ----------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------
function setupEventListeners() {
  // Language switcher
  const langBtnId = document.getElementById('langBtnId');
  const langBtnEn = document.getElementById('langBtnEn');
  if (langBtnId) langBtnId.addEventListener('click', () => applyLanguage('id'));
  if (langBtnEn) langBtnEn.addEventListener('click', () => applyLanguage('en'));

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
        await fetch(`${SIDECAR_API}/api/wa/connect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true })
        });
        fetchWhatsAppStatus();
      } catch (err) {
        appendLog('error', 'Gagal memuat ulang QR: ' + err.message);
      }
    });
  }

  // File Upload & Official Excel Template Download
  btnBrowseFile.addEventListener('click', () => excelFileInput.click());
  btnChangeFile.addEventListener('click', () => excelFileInput.click());
  if (btnDownloadTemplate) {
    btnDownloadTemplate.addEventListener('click', downloadExcelTemplate);
  }
  btnUseDemoData.addEventListener('click', loadDemoContacts);

  excelFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      const picked = e.target.files[0];
      handleFileUpload(picked);
      excelFileInput.value = '';
    }
  });

  // Drag & drop (works both on dropzone and anywhere on source-card when activeFileChip is shown)
  const sourceCardEl = document.querySelector('.source-card') || excelDropzone;
  sourceCardEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    excelDropzone.classList.add('dragover');
  });
  sourceCardEl.addEventListener('dragleave', () => excelDropzone.classList.remove('dragover'));
  sourceCardEl.addEventListener('drop', (e) => {
    e.preventDefault();
    excelDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });

  sheetSelect.addEventListener('change', () => {
    if (currentExcelMeta) {
      if (isTauriEnv && currentExcelMeta.file_path && !currentExcelMeta.isDemo) {
        readExcelSheet(currentExcelMeta.file_path, sheetSelect.value);
      } else if (currentExcelMeta.workbookRef && typeof XLSX !== 'undefined') {
        const selectedSheet = sheetSelect.value;
        const worksheet = currentExcelMeta.workbookRef.Sheets[selectedSheet];
        if (worksheet) {
          const parsed = extractCleanSheetRows(worksheet);
          if (parsed) {
            currentExcelMeta.active_sheet = selectedSheet;
            currentExcelMeta.headers = parsed.headers;
            currentExcelMeta.total_rows = parsed.rowsAsObjects.length;
            applyExcelDataToUI(currentExcelMeta, parsed.rowsAsObjects);
            appendLog('info', currentLang === 'en'
              ? `Switched to sheet '${selectedSheet}' (${parsed.rowsAsObjects.length} rows).`
              : `Beralih ke sheet '${selectedSheet}' (${parsed.rowsAsObjects.length} baris data).`);
          }
        }
      }
    }
  });

  // Mapping Drawer
  btnToggleMapping.addEventListener('click', () => {
    const isHidden = mappingDrawer.style.display === 'none';
    mappingDrawer.style.display = isHidden ? 'block' : 'none';
    const isEn = currentLang === 'en';
    btnToggleMapping.innerHTML = isHidden
      ? (isEn ? '⚙️ Hide Column Mapping ▴' : '⚙️ Tutup Pemetaan Kolom ▴')
      : (isEn ? '⚙️ Customize Column Mapping ▾' : '⚙️ Sesuaikan Pemetaan Kolom ▾');
  });

  [mapNameCol, mapPhoneCol, mapCustomCol].forEach(sel => {
    sel.addEventListener('change', () => {
      rebuildContactsFromMapping();
      triggerAttachmentScan();
    });
  });

  // Attachment controls
  if (attachmentFolderInput) {
    attachmentFolderInput.addEventListener('input', () => {
      browserPickedFiles = null;
      savePreferencesDebounced();
    });
  }

  if (btnBrowseAttachmentFolder) {
    btnBrowseAttachmentFolder.addEventListener('click', handleBrowseAttachmentFolder);
  }

  if (attachmentFolderPicker) {
    attachmentFolderPicker.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const firstFile = e.target.files[0];
        if (firstFile.path) {
          const folderDir = firstFile.path.replace(/[\\/][^\\/]+$/, '');
          browserPickedFiles = null;
          attachmentFolderInput.value = folderDir;
        } else {
          browserPickedFiles = Array.from(e.target.files);
          const relRoot = (firstFile.webkitRelativePath || '').split('/')[0] || 'Selected_Folder';
          attachmentFolderInput.value = relRoot;
        }
        savePreferencesDebounced();
        triggerAttachmentScan();
      }
      attachmentFolderPicker.value = '';
    });
  }

  btnScanFolder.addEventListener('click', triggerAttachmentScan);
  btnPresetDemoFolder.addEventListener('click', () => {
    browserPickedFiles = null;
    attachmentFolderInput.value = 'sample_data/attachments';
    savePreferencesDebounced();
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
  if (urlParams.get('mode') === 'testing') {
    bar.style.display = 'flex';
    return;
  }

  if (isTauriEnv && tauriCore) {
    try {
      const flavor = await tauriCore.invoke('cmd_get_app_flavor');
      if (flavor === 'testing') {
        bar.style.display = 'flex';
        appendLog('info', currentLang === 'en'
          ? '[Mode] QA Testing flavor active (simulator controls enabled).'
          : '[Mode] Versi Testing aktif (simulasi dummy terbuka).');
      } else {
        bar.style.display = 'none';
      }
      return;
    } catch (e) {
      console.warn('cmd_get_app_flavor error:', e);
    }
  }

  // Default production mode: strictly hide testing bar
  bar.style.display = 'none';
}

// ----------------------------------------------------
// DELIVERY MODE CONTROLLER
// ----------------------------------------------------
function setDeliveryMode(mode) {
  activeDeliveryMode = mode;
  const isEn = currentLang === 'en';
  if (mode === 'text') {
    modeBtnText.classList.add('active');
    modeBtnAttachment.classList.remove('active');
    attachmentConfigCard.classList.add('card-disabled');
    matchPercentageBadge.textContent = isEn ? 'Text Mode Active' : 'Mode Teks Aktif';
    matchPercentageBadge.className = 'match-badge badge-pending';
    previewAttachmentCard.style.display = 'none';
  } else {
    modeBtnAttachment.classList.add('active');
    modeBtnText.classList.remove('active');
    attachmentConfigCard.classList.remove('card-disabled');
    previewAttachmentCard.style.display = 'flex';
    triggerAttachmentScan();
  }
  renderTable();
  updateLivePreview();
}

// ----------------------------------------------------
// WHATSAPP API & CONNECTION LIFECYCLE (2-VIEW GATEWAY / WORKSPACE)
// ----------------------------------------------------
let isStartingSidecar = false;
let lastAutoConnectAt = 0;
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
  const isEn = currentLang === 'en';
  try {
    const res = await fetch(`${SIDECAR_API}/api/wa/status`, { signal: AbortSignal.timeout(2500) });
    const data = await res.json();

    if (data.status === 'READY') {
      waStatusBadge.className = 'status-pill status-ready';
      const dot = waStatusBadge.querySelector('.pulse-dot');
      if (dot) dot.style.display = 'inline-block';
      const name = data.clientInfo ? data.clientInfo.name : 'WhatsApp';
      waStatusText.textContent = isEn ? `Connected: ${name}` : `Terhubung: ${name}`;

      if (currentActiveView === 'gateway') {
        if (gatewayStatusText) gatewayStatusText.textContent = isEn ? 'Authenticated! Opening Workspace...' : 'Autentikasi Berhasil! Mengalihkan ke Workspace...';
        if (gatewaySubHint) gatewaySubHint.textContent = isEn ? `Connected as ${name}` : `Terhubung sebagai ${name}`;
        setTimeout(() => {
          showView('workspace');
        }, 500);
      } else {
        showView('workspace');
      }
    } else if (data.status === 'QR_READY') {
      waStatusBadge.className = 'status-pill status-connecting';
      waStatusText.textContent = isEn ? 'Scan QR Code' : 'Pindai QR Code';

      showView('gateway');
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'none';
      if (gatewayQRBox) gatewayQRBox.style.display = 'flex';
      if (data.qrCode) {
        if (gatewayQRSpinner) gatewayQRSpinner.style.display = 'none';
        if (gatewayQRImage) {
          gatewayQRImage.src = data.qrCode;
          gatewayQRImage.style.display = 'block';
        }
      } else {
        if (gatewayQRSpinner) gatewayQRSpinner.style.display = 'flex';
      }
    } else if (data.status === 'AUTHENTICATED') {
      waStatusBadge.className = 'status-pill status-connecting';
      waStatusText.textContent = isEn ? 'Syncing Session...' : 'Menyelaraskan Sesi...';

      showView('gateway');
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
      if (gatewayQRBox) gatewayQRBox.style.display = 'none';
      if (gatewayStatusText) gatewayStatusText.textContent = isEn ? 'Authenticated! Syncing WhatsApp session...' : 'Autentikasi Berhasil! Menyelaraskan sesi WhatsApp...';
      if (gatewaySubHint) gatewaySubHint.textContent = isEn ? 'Opening workspace momentarily' : 'Membuka workspace sesaat lagi';
    } else if (data.status === 'INITIALIZING') {
      waStatusBadge.className = 'status-pill status-connecting';
      waStatusText.textContent = isEn ? 'Initializing WA...' : 'Menyiapkan WA...';

      showView('gateway');
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
      if (gatewayQRBox) gatewayQRBox.style.display = 'none';
      if (gatewayStatusText) gatewayStatusText.textContent = isEn ? 'Initializing WhatsApp Engine (launching headless browser)...' : 'Menyiapkan WhatsApp Engine (memuat browser)...';
      if (gatewaySubHint) gatewaySubHint.textContent = isEn ? 'Restoring saved session or preparing QR Code' : 'Memulihkan sesi tersimpan atau menyiapkan QR Code';
    } else {
      waStatusBadge.className = 'status-pill status-disconnected';
      waStatusText.textContent = isEn ? 'Disconnected' : 'Terputus';

      showView('gateway');
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
      if (gatewayQRBox) gatewayQRBox.style.display = 'none';
      if (gatewayStatusText) gatewayStatusText.textContent = isEn ? 'Connecting to WhatsApp Engine...' : 'Menghubungkan ke WhatsApp Engine...';
      if (gatewaySubHint) gatewaySubHint.textContent = isEn ? 'Preparing new session...' : 'Menyiapkan koneksi baru...';

      // Auto-trigger connect only if sidecar explicitly fell into DISCONNECTED
      if (data.status === 'DISCONNECTED' && Date.now() - lastAutoConnectAt > 6000) {
        lastAutoConnectAt = Date.now();
        fetch(`${SIDECAR_API}/api/wa/connect`, { method: 'POST' }).catch(() => {});
      }
    }
  } catch (err) {
    waStatusBadge.className = 'status-pill status-disconnected';
    waStatusText.textContent = 'Sidecar Offline';

    if (currentActiveView === 'gateway') {
      if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
      if (gatewayQRBox) gatewayQRBox.style.display = 'none';
      if (gatewayStatusText) gatewayStatusText.textContent = isEn ? 'Starting local WhatsApp Engine in background...' : 'Memulai WhatsApp Engine lokal di latar belakang...';
      if (gatewaySubHint) gatewaySubHint.textContent = isEn ? 'Please wait a few seconds while the local engine warms up' : 'Mohon tunggu beberapa detik, sistem sedang menyiapkan engine';
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
  const isEn = currentLang === 'en';
  showCustomConfirm({
    title: isEn ? 'Reset WhatsApp Session?' : 'Reset Sesi WhatsApp?',
    subtitle: isEn 
      ? 'You will be signed out of the current WhatsApp account and the local session will be cleaned. You will need to scan the QR Code again to reconnect.'
      : 'Anda akan keluar dari akun WhatsApp saat ini dan sesi akun di komputer akan dibersihkan. Anda harus memindai ulang QR Code untuk menghubungkan akun baru.',
    emoji: '🔄',
    iconClass: 'hero-warning',
    confirmText: isEn ? 'Yes, Reset Session' : 'Ya, Reset Sesi',
    confirmBtnClass: 'btn-amber',
    cancelText: isEn ? 'Cancel' : 'Batal',
    onConfirm: async () => {
      try {
        showView('gateway');
        if (gatewayLoadingBox) gatewayLoadingBox.style.display = 'flex';
        if (gatewayQRBox) gatewayQRBox.style.display = 'none';
        if (gatewayStatusText) gatewayStatusText.textContent = isEn ? 'Resetting session & preparing new QR Code...' : 'Mereset sesi & menyiapkan QR Code baru...';
        if (gatewaySubHint) gatewaySubHint.textContent = isEn ? 'Cleaning local account session' : 'Membersihkan sesi akun di komputer';

        appendLog('warning', isEn ? 'Resetting WhatsApp session & preparing new QR Code...' : 'Mereset sesi WhatsApp & menyiapkan QR Code baru...');
        await ensureSidecar();
        await fetch(`${SIDECAR_API}/api/wa/reset-session`, { method: 'POST' });
        fetchWhatsAppStatus();
      } catch (err) {
        appendLog('error', isEn ? 'Failed to reset session: ' + err.message : 'Gagal mereset sesi: ' + err.message);
      }
    }
  });
}

// ----------------------------------------------------
// OFFICIAL EXCEL TEMPLATE GENERATOR (.XLSX)
// ----------------------------------------------------
async function downloadExcelTemplate() {
  const isEn = currentLang === 'en';
  if (typeof XLSX === 'undefined') {
    appendLog('error', isEn
      ? 'Excel generator library (SheetJS) is unavailable.'
      : 'Pustaka pembuat Excel (SheetJS) tidak tersedia.');
    return;
  }

  try {
    const defaultFileName = isEn ? 'Bulk_WA_Contact_Template.xlsx' : 'Template_Kontak_Bulk_WA.xlsx';
    const sheetTitle = isEn ? 'Contact List' : 'Daftar Kontak';
    const guideTitle = isEn ? 'Column Guide' : 'Panduan Kolom';

    const headers = isEn
      ? ['No', 'Name', 'Phone Number', 'Attachment File Name', 'City/Branch', 'Custom Column 1', 'Custom Column 2', 'Custom Column 3']
      : ['No', 'Nama', 'Nomor Telepon', 'Nama Lampiran File', 'Kota/Cabang', 'Custom Kolom 1', 'Custom Kolom 2', 'Custom Kolom 3'];

    const sampleRows = isEn
      ? [
          ['1', 'Budi Santoso', '081299990001', 'Budi Santoso.pdf', 'Jakarta Pusat', 'Priority Partner', 'Morning Session (09:00)', 'REF-2026-001'],
          ['2', 'Siti Rahmawati', '081299990002', 'Siti Rahmawati.pdf', 'Surabaya', 'Regular Member', 'Afternoon Session (13:00)', 'REF-2026-002'],
          ['3', 'Ahmad Fauzi', '081299990003', 'Ahmad Fauzi.jpg', 'Bandung', 'VIP Guest', 'Morning Session (09:00)', 'REF-2026-003']
        ]
      : [
          ['1', 'Budi Santoso', '081299990001', 'Budi Santoso.pdf', 'Jakarta Pusat', 'Mitra Prioritas', 'Sesi Pagi (09:00)', 'REF-2026-001'],
          ['2', 'Siti Rahmawati', '081299990002', 'Siti Rahmawati.pdf', 'Surabaya', 'Peserta Reguler', 'Sesi Siang (13:00)', 'REF-2026-002'],
          ['3', 'Ahmad Fauzi', '081299990003', 'Ahmad Fauzi.jpg', 'Bandung', 'Peserta VIP', 'Sesi Pagi (09:00)', 'REF-2026-003']
        ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

    // Force Phone Number cells (Column C) to explicit Text format ('@') so leading '0' is preserved in Excel
    for (let r = 1; r <= sampleRows.length; r++) {
      const phoneCellRef = XLSX.utils.encode_cell({ r, c: 2 });
      if (ws[phoneCellRef]) {
        ws[phoneCellRef].t = 's';
        ws[phoneCellRef].z = '@';
      }
    }

    ws['!cols'] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 18 },
      { wch: 24 },
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
      { wch: 20 }
    ];

    const guideRows = isEn
      ? [
          ['Column Header', 'Required?', 'Usage & Notes'],
          ['No', 'Optional', 'Sequential row number (1, 2, 3, ...).'],
          ['Name', 'Required', 'Recipient full name. Automatically mapped to {Name} / {Nama}.'],
          ['Phone Number', 'Required', 'WhatsApp number (0812... or 62812...). Leading 0 is automatically normalized to 62.'],
          ['Attachment File Name', 'Optional', 'Filename with extension (e.g. Budi Santoso.pdf) if matching attachments from Excel column.'],
          ['City/Branch', 'Optional', 'Recipient city, branch, or location.'],
          ['Custom Column 1 - 3', 'Optional', 'Flexible columns! You can keep these names OR rename the headers to anything (e.g. Role, Schedule, Voucher Code, Total Due) — the app reads your custom header names automatically upon upload.']
        ]
      : [
          ['Nama Kolom', 'Wajib?', 'Keterangan & Cara Pengisian'],
          ['No', 'Opsional', 'Nomor urut baris kontak (1, 2, 3, dst.).'],
          ['Nama', 'Wajib', 'Nama penerima pesan. Otomatis terhubung ke variabel {Nama}.'],
          ['Nomor Telepon', 'Wajib', 'Nomor WhatsApp tujuan (bisa diawali 08xx atau 628xx). Otomatis dinormalisasi sistem.'],
          ['Nama Lampiran File', 'Opsional', 'Nama file beserta ekstensi (contoh: Budi Santoso.pdf) bila memilih pencocokan dari kolom Excel.'],
          ['Kota/Cabang', 'Opsional', 'Informasi kota, cabang, atau lokasi penerima.'],
          ['Custom Kolom 1 - 3', 'Opsional', 'Kolom bebas! Judul header ini BOLEH diganti sesuai kebutuhan (misal: Jabatan, Jadwal Sesi, Kode Unik, Nominal Tagihan, atau tambah kolom baru) dan nama headernya akan terbaca otomatis saat diunggah.']
        ];

    const guideWs = XLSX.utils.aoa_to_sheet(guideRows);
    guideWs['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 90 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
    XLSX.utils.book_append_sheet(wb, guideWs, guideTitle);

    if (isTauriEnv && tauriCore) {
      const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const byteArr = Array.from(new Uint8Array(wbArray));
      const savedPath = await tauriCore.invoke('cmd_save_binary_file', {
        defaultName: defaultFileName,
        bytes: byteArr,
        title: isEn ? 'Save Excel Contact Template' : 'Simpan Template Excel Kontak'
      });

      if (savedPath) {
        appendLog('success', isEn
          ? `Excel template saved to: ${savedPath}`
          : `Template Excel berhasil disimpan ke: ${savedPath}`);
      } else {
        appendLog('info', isEn
          ? 'Template download cancelled.'
          : 'Penyimpanan template Excel dibatalkan.');
      }
      return;
    }

    // Browser mode fallback
    XLSX.writeFile(wb, defaultFileName);
    appendLog('success', isEn
      ? `Downloaded ready-to-edit Excel template '${defaultFileName}'.`
      : `Template Excel '${defaultFileName}' berhasil diunduh.`);
  } catch (err) {
    appendLog('error', (isEn ? 'Failed to generate Excel template: ' : 'Gagal membuat template Excel: ') + err.message);
    console.error(err);
  }
}

function extractCleanSheetRows(worksheet) {
  const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
  if (!sheetData || sheetData.length === 0) return null;

  let hIdx = -1;
  for (let i = 0; i < sheetData.length; i++) {
    if (Array.isArray(sheetData[i]) && sheetData[i].some(c => String(c || '').trim() !== '')) {
      hIdx = i;
      break;
    }
  }
  if (hIdx === -1) return null;

  const maxCols = sheetData.reduce((acc, row) => Math.max(acc, Array.isArray(row) ? row.length : 0), 0);
  let effectiveCols = maxCols;
  while (effectiveCols > 0) {
    const colIdx = effectiveCols - 1;
    const hasAnyInCol = sheetData.slice(hIdx).some(row => Array.isArray(row) && String(row[colIdx] ?? '').trim() !== '');
    if (hasAnyInCol) break;
    effectiveCols--;
  }
  if (effectiveCols === 0) return null;

  const rawHeader = sheetData[hIdx] || [];
  const headers = [];
  for (let c = 0; c < effectiveCols; c++) {
    const val = String(rawHeader[c] ?? '').trim();
    headers.push(val || `Kolom_${c + 1}`);
  }

  const rawRows = sheetData
    .slice(hIdx + 1)
    .filter(r => Array.isArray(r) && headers.some((_, idx) => String(r[idx] ?? '').trim() !== ''));

  const rowsAsObjects = rawRows.map(r => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] !== undefined && r[idx] !== null ? String(r[idx]).trim() : '';
    });
    return obj;
  });

  return { headers, rowsAsObjects };
}

// ----------------------------------------------------
// EXCEL & DEMO DATA INGESTION
// ----------------------------------------------------
async function loadDemoContacts() {
  const isEn = currentLang === 'en';
  appendLog('info', isEn ? 'Loading sample contacts (15 demo records)...' : 'Memuat data contoh standar (15 kontak)...');

  let loadedSuccessfully = false;
  // Load from pre-generated demo data
  if (isTauriEnv) {
    const candidatePaths = [
      'sample_data/Sample_Contact_List.xlsx',
      'sample_data/Daftar_Kontak_Penerima.xlsx',
      'data_contoh/Daftar_Kontak_Penerima.xlsx'
    ];
    for (const demoPath of candidatePaths) {
      try {
        const res = await tauriCore.invoke('cmd_read_excel', {
          filePath: demoPath,
          sheetName: null
        });
        if (res && res.rows && res.rows.length > 0) {
          res.isDemo = true;
          currentExcelMeta = res;
          applyExcelDataToUI(res, res.rows);
          attachmentFolderInput.value = 'sample_data/attachments';
          if (activeDeliveryMode === 'attachment') {
            triggerAttachmentScan();
          }
          loadedSuccessfully = true;
          appendLog('success', isEn ? `Loaded '${res.file_name}' (${res.total_rows} records).` : `Berhasil membaca '${res.file_name}' (${res.total_rows} baris data).`);
          break;
        }
      } catch (e) {
        // try next candidate
      }
    }
  }

  // If not loaded via Rust or contacts are empty (e.g. running from dist/), use built-in 15 contacts mockup
  if (!loadedSuccessfully || contactsData.length === 0) {
    currentExcelMeta = {
      isDemo: true,
      file_name: isEn ? 'Sample_Contact_List.xlsx' : 'Daftar_Kontak_Penerima.xlsx',
      file_path: 'sample_data/Sample_Contact_List.xlsx',
      sheets: ['Daftar Kontak'],
      active_sheet: 'Daftar Kontak',
      headers: ['No', 'Nama', 'Nomor Telepon', 'Nama Lampiran File', 'Kota/Cabang', 'Custom Kolom 1', 'Custom Kolom 2', 'Custom Kolom 3']
    };

    const sampleRows = [
      { 'No': '1', 'Nama': 'Budi Santoso', 'Nomor Telepon': '081299990001', 'Nama Lampiran File': 'INV-2026-001.pdf', 'Kota/Cabang': 'Jakarta Pusat', 'Custom Kolom 1': 'Mitra Prioritas', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-001' },
      { 'No': '2', 'Nama': 'Siti Rahmawati', 'Nomor Telepon': '081299990002', 'Nama Lampiran File': 'INV-2026-002.pdf', 'Kota/Cabang': 'Surabaya', 'Custom Kolom 1': 'Peserta Reguler', 'Custom Kolom 2': 'Sesi Siang (13:00)', 'Custom Kolom 3': 'REF-2026-002' },
      { 'No': '3', 'Nama': 'Ahmad Fauzi', 'Nomor Telepon': '081299990003', 'Nama Lampiran File': 'Ahmad Fauzi.jpg', 'Kota/Cabang': 'Bandung', 'Custom Kolom 1': 'Peserta VIP', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-003' },
      { 'No': '4', 'Nama': 'Dewi Lestari', 'Nomor Telepon': '081299990004', 'Nama Lampiran File': 'Dewi Lestari.pdf', 'Kota/Cabang': 'Semarang', 'Custom Kolom 1': 'Mitra Prioritas', 'Custom Kolom 2': 'Sesi Siang (13:00)', 'Custom Kolom 3': 'REF-2026-004' },
      { 'No': '5', 'Nama': 'Eko Prasetyo', 'Nomor Telepon': '081299990005', 'Nama Lampiran File': 'INV-2026-005.pdf', 'Kota/Cabang': 'Medan', 'Custom Kolom 1': 'Peserta Reguler', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-005' },
      { 'No': '6', 'Nama': 'Rina Handayani', 'Nomor Telepon': '081299990006', 'Nama Lampiran File': 'Rina Handayani.pdf', 'Kota/Cabang': 'Yogyakarta', 'Custom Kolom 1': 'Peserta VIP', 'Custom Kolom 2': 'Sesi Siang (13:00)', 'Custom Kolom 3': 'REF-2026-006' },
      { 'No': '7', 'Nama': 'Fajar Nugraha', 'Nomor Telepon': '081299990007', 'Nama Lampiran File': 'Fajar Nugraha.png', 'Kota/Cabang': 'Makassar', 'Custom Kolom 1': 'Mitra Prioritas', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-007' },
      { 'No': '8', 'Nama': 'Putri Ayu Wulandari', 'Nomor Telepon': '081299990008', 'Nama Lampiran File': 'INV-2026-008.docx', 'Kota/Cabang': 'Denpasar', 'Custom Kolom 1': 'Peserta Reguler', 'Custom Kolom 2': 'Sesi Siang (13:00)', 'Custom Kolom 3': 'REF-2026-008' },
      { 'No': '9', 'Nama': 'Hendra Gunawan', 'Nomor Telepon': '081299990009', 'Nama Lampiran File': 'Hendra Gunawan.pdf', 'Kota/Cabang': 'Palembang', 'Custom Kolom 1': 'Peserta VIP', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-009' },
      { 'No': '10', 'Nama': 'Nurul Hidayah', 'Nomor Telepon': '081299990010', 'Nama Lampiran File': 'INV-2026-010.pdf', 'Kota/Cabang': 'Malang', 'Custom Kolom 1': 'Mitra Prioritas', 'Custom Kolom 2': 'Sesi Siang (13:00)', 'Custom Kolom 3': 'REF-2026-010' },
      { 'No': '11', 'Nama': 'Rizky Pratama', 'Nomor Telepon': '081299990011', 'Nama Lampiran File': 'Rizky Pratama.pdf', 'Kota/Cabang': 'Bekasi', 'Custom Kolom 1': 'Peserta Reguler', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-011' },
      { 'No': '12', 'Nama': 'Mega Puspita', 'Nomor Telepon': '081299990012', 'Nama Lampiran File': 'Mega Puspita.jpg', 'Kota/Cabang': 'Tangerang', 'Custom Kolom 1': 'Peserta VIP', 'Custom Kolom 2': 'Sesi Siang (13:00)', 'Custom Kolom 3': 'REF-2026-012' },
      { 'No': '13', 'Nama': 'Bayu Saputra', 'Nomor Telepon': '081299990013', 'Nama Lampiran File': 'INV-2026-013.pdf', 'Kota/Cabang': 'Solo', 'Custom Kolom 1': 'Mitra Prioritas', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-013' },
      { 'No': '14', 'Nama': 'Indah Permatasari', 'Nomor Telepon': '081299990014', 'Nama Lampiran File': 'Indah Permatasari.pdf', 'Kota/Cabang': 'Bogor', 'Custom Kolom 1': 'Peserta Reguler', 'Custom Kolom 2': 'Sesi Siang (13:00)', 'Custom Kolom 3': 'REF-2026-014' },
      { 'No': '15', 'Nama': 'Dimas Kurniawan', 'Nomor Telepon': '081299990015', 'Nama Lampiran File': 'INV-2026-015.pdf', 'Kota/Cabang': 'Balikpapan', 'Custom Kolom 1': 'Peserta VIP', 'Custom Kolom 2': 'Sesi Pagi (09:00)', 'Custom Kolom 3': 'REF-2026-015' }
    ];

    applyExcelDataToUI(currentExcelMeta, sampleRows);
    attachmentFolderInput.value = 'sample_data/attachments';
    triggerAttachmentScan();
  }
}

async function handleFileUpload(file) {
  if (!file) return;
  const isEn = currentLang === 'en';
  appendLog('info', isEn ? `Reading spreadsheet: ${file.name}...` : `Membaca file spreadsheet: ${file.name}...`);

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
        throw new Error(isEn ? 'No worksheet found in this Excel file.' : 'Tidak ada sheet yang ditemukan di file Excel ini.');
      }

      const firstSheetName = sheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const parsed = extractCleanSheetRows(worksheet);

      if (!parsed || parsed.headers.length === 0) {
        throw new Error(isEn ? 'Worksheet is empty or missing a header row.' : 'Sheet kosong atau tidak memiliki baris judul kolom.');
      }

      currentExcelMeta = {
        isDemo: false,
        file_name: file.name,
        file_path: file.path || file.name,
        sheets: sheetNames,
        active_sheet: firstSheetName,
        headers: parsed.headers,
        total_rows: parsed.rowsAsObjects.length,
        workbookRef: workbook
      };

      applyExcelDataToUI(currentExcelMeta, parsed.rowsAsObjects);
      if (activeDeliveryMode === 'attachment') {
        triggerAttachmentScan();
      }
      appendLog('success', isEn
        ? `Loaded '${file.name}' (${parsed.rowsAsObjects.length} rows, columns: ${parsed.headers.join(', ')}).`
        : `Berhasil membaca '${file.name}' (${parsed.rowsAsObjects.length} baris, kolom: ${parsed.headers.join(', ')}).`);
      return;
    } catch (err) {
      appendLog('error', (isEn ? 'Failed to parse spreadsheet: ' : 'Gagal membaca Excel: ') + err.message);
      console.error(err);
      return;
    }
  }

  // Fallback demo if XLSX unavailable
  activeFileName.textContent = file.name;
  activeFileChip.style.display = 'flex';
  excelDropzone.style.display = 'none';
  appendLog('warning', 'Menggunakan struktur demo sebagai fallback.');
  loadDemoContacts();
}

async function readExcelSheet(filePath, sheetName) {
  if (!isTauriEnv) return;
  const isEn = currentLang === 'en';
  try {
    const res = await tauriCore.invoke('cmd_read_excel', {
      filePath: filePath,
      sheetName: sheetName
    });

    res.isDemo = false;
    currentExcelMeta = res;
    applyExcelDataToUI(res, res.rows);
    if (activeDeliveryMode === 'attachment') {
      triggerAttachmentScan();
    }
    appendLog('success', isEn
      ? `Loaded '${res.file_name}' (${res.total_rows} rows, columns: ${res.headers.join(', ')}).`
      : `Berhasil membaca '${res.file_name}' (${res.total_rows} baris, kolom: ${res.headers.join(', ')}).`);
  } catch (err) {
    appendLog('error', (isEn ? 'Failed to read spreadsheet: ' : 'Gagal membaca file Excel: ') + err);
  }
}

function applyExcelDataToUI(meta, rows) {
  activeFileName.textContent = meta.file_name;
  activeFileChip.style.display = 'flex';
  excelDropzone.style.display = 'none';

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
  const isEn = currentLang === 'en';
  [mapNameCol, mapPhoneCol, mapCustomCol].forEach(sel => {
    sel.innerHTML = '';
    const defOpt = document.createElement('option');
    defOpt.value = '';
    defOpt.textContent = isEn ? '-- Select Column --' : '-- Pilih Kolom --';
    sel.appendChild(defOpt);

    headers.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = h;
      sel.appendChild(opt);
    });
  });

  // Auto detect core columns (avoid matching 'Nama Lampiran File' / 'Attachment File Name' as Name!)
  const nameMatch =
    headers.find(h => /^(nama|name|nama lengkap|nama penerima|full name|recipient name|penerima|recipient)$/i.test(h.trim())) ||
    headers.find(h => /nama(?!\s*(lampiran|file))|name(?!\s*file)|penerima|recipient/i.test(h)) ||
    headers[1] ||
    '';
  const phoneMatch =
    headers.find(h => /nomor telepon|no\.?\s*telp|telepon|telp|whatsapp|\bwa\b|\bhp\b|no\.?\s*hp|phone|ponsel|mobile|kontak/i.test(h)) ||
    headers[2] ||
    '';
  const customMatch =
    headers.find(h => /nama lampiran|file lampiran|lampiran|attachment|nama file|\bfile\b/i.test(h)) ||
    '';

  if (nameMatch) mapNameCol.value = nameMatch;
  if (phoneMatch) mapPhoneCol.value = phoneMatch;
  if (customMatch) mapCustomCol.value = customMatch;

  mappingStatusSummary.textContent = isEn
    ? `Name: '${mapNameCol.value}', Phone: '${mapPhoneCol.value}'`
    : `Kolom Nama: '${mapNameCol.value}', Nomor: '${mapPhoneCol.value}'`;
}

function rawRowsToContacts(rows, headers) {
  const nameCol = mapNameCol.value || headers[1] || 'Nama';
  const phoneCol = mapPhoneCol.value || headers[2] || 'Nomor Telepon';
  const customCol = mapCustomCol.value || 'Nama Lampiran File';

  contactsData = rows.map((r, idx) => {
    const id = String(idx + 1);
    const nama = r[nameCol] || `Kontak ${idx + 1}`;
    const rawPhone = r[phoneCol] || '';
    const customVal = customCol ? (r[customCol] || '') : '';

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
  const isEn = currentLang === 'en';
  mappingStatusSummary.textContent = isEn
    ? `Name: '${mapNameCol.value}', Phone: '${mapPhoneCol.value}'`
    : `Kolom Nama: '${mapNameCol.value}', Nomor: '${mapPhoneCol.value}'`;
  rawRowsToContacts(contactsData.map(c => c.rawData), currentExcelMeta.headers);
  renderTable();
  updateLivePreview();
}

function rebuildDynamicTagPills(headers) {
  dynamicTagsContainer.innerHTML = '';
  const isEn = currentLang === 'en';

  // Special Utility Tags (Always Available)
  const specialTags = [
    { 
      tag: '{Salam}', 
      label: isEn ? '+ {Salam} (Time)' : '+ {Salam} (Waktu)', 
      title: isEn ? 'Automatic time greeting (Morning/Afternoon/Evening)' : 'Ucapan waktu otomatis (Pagi/Siang/Sore/Malam)' 
    },
    { 
      tag: isEn ? '{Hello|Hi|Greetings}' : '{Halo|Hai|Selamat Pagi|Salam}', 
      label: isEn ? '+ Spintax {Hello|Hi|...}' : '+ Spintax {Halo|Hai|...}', 
      title: isEn ? 'Random Spintax phrase variations anti-spam' : 'Variasi acak kata Spintax anti-spam' 
    }
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
  if (headers && Array.isArray(headers)) {
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
// DYNAMIC ATTACHMENT SCANNER & NATIVE FOLDER PICKER
// ----------------------------------------------------
async function handleBrowseAttachmentFolder() {
  const isEn = currentLang === 'en';
  if (isTauriEnv && tauriCore) {
    try {
      const selected = await tauriCore.invoke('cmd_pick_folder', {
        title: isEn ? 'Select Attachment Folder' : 'Pilih Folder File Lampiran'
      });
      if (selected) {
        browserPickedFiles = null;
        attachmentFolderInput.value = selected;
        savePreferencesDebounced();
        triggerAttachmentScan();
      }
      return;
    } catch (err) {
      console.warn('cmd_pick_folder error, falling back to HTML picker:', err);
    }
  }

  if (attachmentFolderPicker) {
    attachmentFolderPicker.click();
  }
}

function applyFolderNotFoundState(folder) {
  const isEn = currentLang === 'en';
  currentMatchingSummary = {
    error: true,
    folder_path: folder,
    total_records: contactsData.length,
    found_count: 0,
    missing_count: contactsData.length,
    match_percentage: 0,
    matches: []
  };

  contactsData.forEach(c => {
    c.fileInfo = {
      record_id: c.id,
      expected_query: c.nama,
      file_name: '-',
      full_path: '',
      exists: false,
      size_kb: 0,
      file_category: 'missing'
    };
  });

  matchPercentageBadge.textContent = isEn
    ? `0 / ${contactsData.length} Files (Folder Not Found)`
    : `0 / ${contactsData.length} File (Folder Tidak Ditemukan)`;
  matchPercentageBadge.className = 'match-badge badge-failed';

  appendLog('error', isEn
    ? `Attachment folder not found: '${folder}'`
    : `Direktori lampiran tidak ditemukan: '${folder}'`);

  renderTable();
  updateLivePreview();
}

async function triggerAttachmentScan() {
  if (activeDeliveryMode !== 'attachment') return;
  const isEn = currentLang === 'en';

  const folder = (attachmentFolderInput.value || '').trim();
  if (!folder) {
    currentMatchingSummary = null;
    matchPercentageBadge.textContent = isEn ? 'Select Folder First' : 'Pilih Folder Dulu';
    matchPercentageBadge.className = 'match-badge badge-warning';
    return;
  }

  const matchRule = document.querySelector('input[name="matchRule"]:checked')?.value || 'by_name';
  appendLog('info', isEn
    ? `Scanning folder '${folder}' (strategy: ${matchRule === 'by_name' ? 'Recipient Name' : 'Excel Column'})...`
    : `Memindai folder '${folder}' dengan aturan: ${matchRule === 'by_name' ? 'Nama Penerima' : 'Kolom Excel'}...`);

  // 1. If in Tauri, call native Rust scanner (strictly respects real disk state)
  if (isTauriEnv && tauriCore) {
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
      applyFolderNotFoundState(folder);
      return;
    }
  }

  // 2. If user selected local files via browser folder picker (in non-Tauri browser preview)
  if (browserPickedFiles && browserPickedFiles.length > 0) {
    const allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'docx', 'xlsx', 'csv', 'zip', 'txt'];
    const indexed = browserPickedFiles
      .map(f => {
        const name = f.name || '';
        const dotIdx = name.lastIndexOf('.');
        const ext = dotIdx > -1 ? name.substring(dotIdx + 1).toLowerCase() : '';
        const stem = (dotIdx > -1 ? name.substring(0, dotIdx) : name).toLowerCase().trim();
        return { name, ext, stem, sizeKb: Math.max(1, Math.round((f.size || 0) / 1024)) };
      })
      .filter(f => allowedExts.includes(f.ext));

    let foundCount = 0;
    const matches = contactsData.map(c => {
      const query = (matchRule === 'by_column' ? (c.customVal || '') : (c.nama || '')).trim();
      const norm = query.toLowerCase().replace(/[^a-z0-9]/g, '');
      const hit = indexed.find(item => {
        const itemNorm = item.stem.replace(/[^a-z0-9]/g, '');
        return item.name.toLowerCase() === query.toLowerCase() || item.stem === query.toLowerCase() || (norm && itemNorm === norm);
      });
      if (hit) foundCount++;
      let category = 'missing';
      if (hit) {
        if (hit.ext === 'pdf') category = 'pdf';
        else if (['jpg', 'jpeg', 'png', 'webp'].includes(hit.ext)) category = 'image';
        else category = 'document';
      }
      return {
        record_id: c.id,
        expected_query: query,
        file_name: hit ? hit.name : (query ? `${query}.pdf` : '-'),
        full_path: hit ? `${folder}/${hit.name}` : '',
        exists: Boolean(hit),
        size_kb: hit ? hit.sizeKb : 0,
        file_category: category
      };
    });

    const totalRecords = contactsData.length;
    const pct = totalRecords > 0 ? parseFloat(((foundCount / totalRecords) * 100).toFixed(1)) : 0;
    applyScanResult({
      folder_path: folder,
      total_records: totalRecords,
      found_count: foundCount,
      missing_count: totalRecords - foundCount,
      match_percentage: pct,
      matches
    });
    return;
  }

  // 3. Try Sidecar API scanner (strictly respects real disk state when sidecar is reachable)
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
    } else {
      // Sidecar responded (e.g. 400 Folder Not Found) — strictly report missing folder!
      applyFolderNotFoundState(folder);
      return;
    }
  } catch (err) {
    // Sidecar offline (static browser preview mode)
  }

  // 4. Static offline preview fallback ONLY for official sample folder presets
  const normFolder = folder.replace(/\\/g, '/').toLowerCase();
  const isDemoPreset = normFolder === 'sample_data/attachments' || normFolder === 'data_contoh/lampiran';
  if (!isDemoPreset) {
    applyFolderNotFoundState(folder);
    return;
  }

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
  const isEn = currentLang === 'en';
  currentMatchingSummary = summary;
  const matchMap = new Map();
  summary.matches.forEach(m => matchMap.set(m.record_id, m));

  contactsData.forEach(c => {
    c.fileInfo = matchMap.get(c.id) || null;
  });

  matchPercentageBadge.textContent = `${summary.found_count} / ${summary.total_records} ${isEn ? 'Files Ready' : 'File Siap'} (${summary.match_percentage}%)`;
  matchPercentageBadge.className = summary.missing_count === 0
    ? 'match-badge badge-success'
    : (summary.found_count === 0 ? 'match-badge badge-failed' : 'match-badge badge-warning');

  appendLog('success', isEn
    ? `Scan complete: ${summary.found_count} of ${summary.total_records} files matched.`
    : `Pemindaian selesai: ${summary.found_count} file cocok dari ${summary.total_records} kontak.`);
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
  if (currentLang === 'en') {
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 18) return 'Good afternoon';
    return 'Good evening';
  } else {
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  }
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

function isExplicitCurrencyColumn(colName) {
  if (!colName) return false;
  return /(nominal|tagihan|rupiah|\bidr\b|harga|biaya|gaji|\bthp\b|honor|salary|total bayar|total due|amount due)/i.test(String(colName).trim());
}

function resolveActiveColumnSchema() {
  const headers = (currentExcelMeta && Array.isArray(currentExcelMeta.headers) && currentExcelMeta.headers.length > 0)
    ? currentExcelMeta.headers
    : ['No', 'Nama', 'Nomor Telepon', 'Nama Lampiran File', 'Kota/Cabang', 'Custom Kolom 1', 'Custom Kolom 2', 'Custom Kolom 3'];
  const isDemo = Boolean(!currentExcelMeta || currentExcelMeta.isDemo);

  const noCol = headers.find(h => /^(no|no\.|nomor urut|#)$/i.test(h.trim())) || null;
  const nameCol = (mapNameCol && mapNameCol.value && headers.includes(mapNameCol.value))
    ? mapNameCol.value
    : (headers.find(h => /^(nama|name|nama lengkap|nama penerima|full name|recipient name|penerima|recipient)$/i.test(h.trim()))
       || headers.find(h => /nama(?!\s*(lampiran|file))|name(?!\s*file)|penerima|recipient/i.test(h))
       || null);
  const phoneCol = (mapPhoneCol && mapPhoneCol.value && headers.includes(mapPhoneCol.value))
    ? mapPhoneCol.value
    : (headers.find(h => /nomor telepon|no\.?\s*telp|telepon|telp|whatsapp|\bwa\b|\bhp\b|no\.?\s*hp|phone|ponsel|mobile|kontak/i.test(h))
       || null);

  // Dedicated attachment filename column in spreadsheet (keep custom columns visible even if selected in mapCustomCol)
  const attachHeaderCol = headers.find(h =>
    h !== noCol && h !== nameCol && h !== phoneCol &&
    /^(nama lampiran file|file lampiran|lampiran file|lampiran|nama file|attachment file name|attachment file|attachment)$/i.test(h.trim())
  ) || null;

  const cityCol = headers.find(h =>
    h !== noCol && h !== nameCol && h !== phoneCol && h !== attachHeaderCol &&
    /^(kota\/cabang|kota cabang|kota|cabang|city\/branch|city|branch|lokasi|wilayah|area)$/i.test(h.trim())
  ) || null;

  const coreSet = new Set([noCol, nameCol, phoneCol, attachHeaderCol, cityCol].filter(Boolean));
  const customCols = headers.filter(h => !coreSet.has(h));

  return { headers, isDemo, noCol, nameCol, phoneCol, attachHeaderCol, cityCol, customCols };
}

function compileMessageForContact(template, contact) {
  if (!template) return '';
  let msg = template;

  // 1. Time-aware Greeting {Salam}
  msg = msg.replace(/\{salam\}/gi, getTimeGreeting());

  // 2. Dynamic column interpolation from contact.rawData (exact spreadsheet headers)
  if (contact && contact.rawData) {
    Object.keys(contact.rawData).forEach(key => {
      const val = contact.rawData[key];
      const reg = new RegExp(`\\{${escapeRegex(key)}\\}`, 'gi');
      const cleanNumStr = String(val ?? '').replace(/[^0-9.-]/g, '');

      if (isExplicitCurrencyColumn(key) && cleanNumStr !== '' && !isNaN(Number(cleanNumStr)) && Number(cleanNumStr) > 0) {
        const formatted = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          maximumFractionDigits: 0
        }).format(Number(cleanNumStr));
        msg = msg.replace(reg, formatted);
      } else {
        msg = msg.replace(reg, val !== undefined && val !== null ? String(val) : '');
      }
    });

    // 3. Smart aliases for core & general columns across ID/EN or renamed custom columns
    const schema = resolveActiveColumnSchema();
    msg = msg.replace(/\{(nama|name|nama lengkap)\}/gi, contact.nama || '');
    msg = msg.replace(/\{(nomor telepon|phone number|nomor whatsapp)\}/gi, contact.phone || '');
    msg = msg.replace(/\{(nama lampiran file|attachment file name|file lampiran)\}/gi, contact.customVal || (contact.fileInfo ? contact.fileInfo.file_name : ''));
    if (schema.cityCol && contact.rawData[schema.cityCol] !== undefined) {
      msg = msg.replace(/\{(kota\/cabang|city\/branch|kota cabang)\}/gi, contact.rawData[schema.cityCol] || '');
    }
    [0, 1, 2].forEach(idx => {
      const n = idx + 1;
      const colKey = schema.customCols[idx];
      if (colKey && contact.rawData[colKey] !== undefined) {
        const aliasReg = new RegExp(`\\{(custom kolom ${n}|custom column ${n})\\}`, 'gi');
        msg = msg.replace(aliasReg, String(contact.rawData[colKey] ?? ''));
      }
    });
  }

  // 4. Spintax variations parsing
  msg = parseSpintax(msg);

  return msg;
}

function updateLivePreview() {
  const defaultContact = {
    nama: 'Budi Santoso',
    phone: '081299990001',
    customVal: 'INV-2026-001.pdf',
    rawData: {
      'No': '1',
      'Nama': 'Budi Santoso',
      'Nomor Telepon': '081299990001',
      'Nama Lampiran File': 'INV-2026-001.pdf',
      'Kota/Cabang': 'Jakarta Pusat',
      'Custom Kolom 1': 'Mitra Prioritas',
      'Custom Kolom 2': 'Sesi Pagi (09:00)',
      'Custom Kolom 3': 'REF-2026-001'
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
    const isEn = currentLang === 'en';
    previewAttachmentCard.style.display = 'flex';
    const fileInfo = contact.fileInfo;
    const fName = (fileInfo && fileInfo.file_name && fileInfo.file_name !== '-') ? fileInfo.file_name : `${contact.nama}.pdf`;
    previewAttachFilename.textContent = fName;

    if (fileInfo && fileInfo.exists === false) {
      document.getElementById('previewAttachIcon').textContent = '⚠️';
      previewAttachSub.textContent = isEn ? 'File Missing • Check Folder' : 'File Tidak Ditemukan • Cek Folder';
    } else if (fName.endsWith('.pdf')) {
      document.getElementById('previewAttachIcon').textContent = '📄';
      previewAttachSub.textContent = isEn ? 'PDF Document • 1 Page' : 'Dokumen PDF • 1 Halaman';
    } else if (fName.endsWith('.jpg') || fName.endsWith('.png') || fName.endsWith('.webp')) {
      document.getElementById('previewAttachIcon').textContent = '🖼️';
      previewAttachSub.textContent = isEn ? 'Image File • HD Media' : 'File Gambar • HD Media';
    } else {
      document.getElementById('previewAttachIcon').textContent = '📎';
      previewAttachSub.textContent = isEn ? 'Document Attachment' : 'Lampiran File Dokumen';
    }
  } else {
    previewAttachmentCard.style.display = 'none';
  }
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ----------------------------------------------------
// TABLE RENDERING (DYNAMIC CUSTOM COLUMNS)
// ----------------------------------------------------
function formatTableCustomCell(colName, rawVal) {
  const str = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
  if (!str) {
    return { html: '<span style="color: var(--text-dim);">-</span>', isCurrency: false };
  }
  const cleanNumStr = str.replace(/[^0-9.-]/g, '');
  if (isExplicitCurrencyColumn(colName) && cleanNumStr !== '' && !isNaN(Number(cleanNumStr)) && Number(cleanNumStr) > 0) {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(cleanNumStr));
    return { html: escapeHtml(formatted), isCurrency: true };
  }
  return { html: escapeHtml(str), isCurrency: false };
}

function getFilteredContacts() {
  const search = (tableSearchInput.value || '').toLowerCase().trim();
  const filter = tableStatusFilter.value;

  return contactsData.filter(c => {
    let matchesSearch = !search ||
      c.nama.toLowerCase().includes(search) ||
      c.phone.toLowerCase().includes(search);

    if (!matchesSearch && c.rawData) {
      matchesSearch = Object.values(c.rawData).some(v =>
        v !== undefined && v !== null && String(v).toLowerCase().includes(search)
      );
    }

    if (!matchesSearch) return false;

    if (filter === 'VALID_ONLY') {
      return c.phone && c.phone.replace(/[^0-9]/g, '').length >= 9;
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
  const isEn = currentLang === 'en';
  const t = I18N[currentLang];
  const schema = resolveActiveColumnSchema();
  const list = getFilteredContacts();

  // 1. Dynamically render <thead> to match standard or uploaded custom column headers verbatim
  const headRow = document.getElementById('contactsTableHeadRow') || document.querySelector('.contacts-table thead tr');
  const nameHeaderLabel = (schema.isDemo || !schema.nameCol || /^(nama|name|nama lengkap|nama penerima|recipient name)$/i.test(schema.nameCol.trim()))
    ? t.thName
    : schema.nameCol;
  const phoneHeaderLabel = (schema.isDemo || !schema.phoneCol || /^(nomor telepon|phone number|nomor whatsapp|whatsapp number)$/i.test(schema.phoneCol.trim()))
    ? t.thPhone
    : schema.phoneCol;
  const attachHeaderLabel = activeDeliveryMode === 'text'
    ? t.thDeliveryMode
    : ((schema.attachHeaderCol && !schema.isDemo && !/^(nama lampiran file|attachment file name|file lampiran)$/i.test(schema.attachHeaderCol.trim()))
        ? schema.attachHeaderCol
        : t.thAttachment);

  const dynamicHeadCells = [
    `<th style="width: 44px; text-align: center;">${escapeHtml(t.thSelect)}</th>`,
    `<th style="width: 50px; text-align: center;">${escapeHtml(schema.noCol && !schema.isDemo ? schema.noCol : t.thNo)}</th>`,
    `<th>${escapeHtml(nameHeaderLabel)}</th>`,
    `<th>${escapeHtml(phoneHeaderLabel)}</th>`,
    `<th id="thAttachmentCol">${escapeHtml(attachHeaderLabel)}</th>`
  ];

  if (schema.cityCol) {
    const cityLabel = /^(kota\/cabang|kota cabang|city\/branch|branch city)$/i.test(schema.cityCol.trim())
      ? t.thBranch
      : schema.cityCol;
    dynamicHeadCells.push(`<th>${escapeHtml(cityLabel)}</th>`);
  }

  schema.customCols.forEach(col => {
    let displayColName = col;
    if (schema.isDemo) {
      const m = /^custom kolom (\d+)$/i.exec(col.trim());
      if (m) {
        displayColName = isEn ? `Custom Column ${m[1]}` : `Custom Kolom ${m[1]}`;
      }
    }
    const alignRight = isExplicitCurrencyColumn(col) ? ' style="text-align: right;"' : '';
    dynamicHeadCells.push(`<th${alignRight}>${escapeHtml(displayColName)}</th>`);
  });

  if (headRow) {
    headRow.innerHTML = dynamicHeadCells.join('');
  }

  const totalColCount = dynamicHeadCells.length;
  const totalEl = document.getElementById('totalTableCount');
  if (totalEl) totalEl.textContent = contactsData.length;
  contactsTableBody.innerHTML = '';

  if (list.length === 0) {
    contactsTableBody.innerHTML = `<tr><td colspan="${totalColCount}" class="text-center empty-cell">${isEn ? 'No contacts match the active filter.' : 'Tidak ada kontak yang cocok dengan filter.'}</td></tr>`;
    return;
  }

  list.forEach(c => {
    const isChecked = selectedContactIds.has(c.id);
    const tr = document.createElement('tr');

    const phoneClean = (c.phone || '').replace(/[^0-9]/g, '');
    const isPhoneValid = phoneClean.length >= 9;

    let attachStatusHtml = '<span class="status-badge-inline" style="color: var(--text-dim);">-</span>';
    if (activeDeliveryMode === 'attachment') {
      if (c.fileInfo && c.fileInfo.exists) {
        attachStatusHtml = `<span class="status-badge-inline badge-ready">🟢 ${escapeHtml(c.fileInfo.file_name)}</span>`;
      } else {
        attachStatusHtml = `<span class="status-badge-inline badge-missing">${isEn ? '🔴 Not Found' : '🔴 Tidak Ditemukan'}</span>`;
      }
    } else {
      attachStatusHtml = `<span class="table-badge-mode-text">${isEn ? 'Text Mode' : 'Mode Teks'}</span>`;
    }

    let lastStatusPill = '';
    if (c.lastStatus === 'success') {
      lastStatusPill = `<span class="status-badge-inline badge-ready" style="font-size: 0.68rem; margin-left: 6px;">${isEn ? '✓ Sent' : '✓ Terkirim'}</span>`;
    } else if (c.lastStatus === 'failed') {
      lastStatusPill = `<span class="status-badge-inline badge-missing" style="font-size: 0.68rem; margin-left: 6px;">${isEn ? '✗ Failed' : '✗ Gagal'}</span>`;
    }

    const rowNo = (schema.noCol && c.rawData && c.rawData[schema.noCol]) ? c.rawData[schema.noCol] : c.no;

    let extraCellsHtml = '';
    if (schema.cityCol) {
      const cityVal = (c.rawData && c.rawData[schema.cityCol]) ? c.rawData[schema.cityCol] : '-';
      extraCellsHtml += `<td>${escapeHtml(cityVal)}</td>`;
    }

    schema.customCols.forEach(col => {
      const cellFmt = formatTableCustomCell(col, c.rawData ? c.rawData[col] : '');
      extraCellsHtml += `<td${cellFmt.isCurrency ? ' style="text-align: right; font-weight: 600;"' : ''}>${cellFmt.html}</td>`;
    });

    tr.innerHTML = `
      <td style="text-align: center;">
        <input type="checkbox" class="contact-checkbox" data-id="${escapeHtml(c.id)}" ${isChecked ? 'checked' : ''}>
      </td>
      <td style="text-align: center; color: var(--text-dim);" class="font-mono">${escapeHtml(String(rowNo))}</td>
      <td>
        <strong>${escapeHtml(c.nama)}</strong>
        ${lastStatusPill}
      </td>
      <td>
        <span class="font-mono">${escapeHtml(c.phone)}</span>
        ${isPhoneValid ? '' : `<span style="color: var(--rose-500); font-size: 0.7rem; margin-left: 4px; font-weight: 600;">${isEn ? '(Invalid)' : '(Tidak Valid)'}</span>`}
      </td>
      <td>${attachStatusHtml}</td>
      ${extraCellsHtml}
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
  const isEn = currentLang === 'en';
  const count = selectedContactIds.size;
  const selEl = document.getElementById('selectionCountBadge');
  const tgtEl = document.getElementById('btnTargetCount');
  if (selEl) selEl.textContent = `${count} ${isEn ? 'Selected' : 'Terpilih'}`;
  if (tgtEl) tgtEl.textContent = count;
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

  const isEn = currentLang === 'en';
  showCustomConfirm({
    title: isEn ? 'Start Broadcast Dispatch?' : 'Mulai Kirim Broadcast?',
    subtitle: isEn 
      ? `Dispatch broadcast to ${targets.length} contacts via ${activeDeliveryMode === 'text' ? 'Text Mode Only' : 'Message + File Attachment'}?`
      : `Mulai kirim broadcast ke ${targets.length} kontak dengan mode: ${activeDeliveryMode === 'text' ? 'Pesan Teks Saja' : 'Pesan + Lampiran File'}?`,
    emoji: '🚀',
    iconClass: 'state-success',
    confirmText: isEn ? 'Yes, Launch Broadcast' : 'Ya, Mulai Broadcast',
    confirmBtnClass: 'btn-emerald',
    cancelText: isEn ? 'Cancel' : 'Batal',
    onConfirm: async () => {
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
          appendLog('info', isEn ? 'Broadcast launched in background.' : 'Broadcast telah diluncurkan di latar belakang.');
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
  });
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

    const isEn = currentLang === 'en';
    if (st.isRunning) {
      progressStatusText.textContent = st.isPaused 
        ? (isEn ? `[PAUSED] Sending to ${st.currentName}...` : `[DIJEDA] Mengirim ke ${st.currentName}...`)
        : (isEn ? `Sending to: ${st.currentName} (${pct}%)...` : `Mengirim ke: ${st.currentName} (${pct}%)...`);
    } else {
      progressStatusText.textContent = isEn
        ? `Completed (${st.success} sent, ${st.failed} failed).`
        : `Selesai (${st.success} sukses, ${st.failed} gagal).`;
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
          const errMsg = f.error || f.reason || (isEn ? 'Failed to send message' : 'Gagal mengirim pesan');
          return {
            name: f.recipientName || f.name || (isEn ? 'Contact' : 'Kontak'),
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
async function exportReportCsv() {
  const isEn = currentLang === 'en';
  if (contactsData.length === 0) {
    alert(isEn ? 'No contact records available to export.' : 'Tidak ada data kontak untuk diekspor.');
    return;
  }

  const schema = resolveActiveColumnSchema();
  const csvQuote = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const headerRow = isEn
    ? ['No', 'Name', 'Phone Number', 'Dispatch Status', 'Attachment Status', 'File Path']
    : ['No', 'Nama', 'Nomor Telepon', 'Status Kirim', 'Status Lampiran', 'File Path'];

  if (schema.cityCol) {
    headerRow.push(schema.isDemo ? (isEn ? 'City/Branch' : 'Kota/Cabang') : schema.cityCol);
  }
  schema.customCols.forEach(col => {
    if (schema.isDemo) {
      const m = /^custom kolom (\d+)$/i.exec(col.trim());
      headerRow.push(m ? (isEn ? `Custom Column ${m[1]}` : `Custom Kolom ${m[1]}`) : col);
    } else {
      headerRow.push(col);
    }
  });

  const rows = [headerRow.map(csvQuote)];

  contactsData.forEach(c => {
    const dispatchStatus = c.lastStatus === 'success'
      ? (isEn ? 'Sent' : 'Terkirim')
      : (c.lastStatus === 'failed' ? (isEn ? 'Failed' : 'Gagal') : (isEn ? 'Pending' : 'Belum Dikirim'));
    const attachStatus = c.fileInfo
      ? (c.fileInfo.exists ? (isEn ? 'Available' : 'Tersedia') : (isEn ? 'Missing' : 'Tidak Ditemukan'))
      : (isEn ? 'Text Mode' : 'Mode Teks');

    const r = [
      csvQuote(c.no),
      csvQuote(c.nama),
      csvQuote(`'${c.phone}`),
      csvQuote(dispatchStatus),
      csvQuote(attachStatus),
      csvQuote(c.fileInfo ? c.fileInfo.full_path : '-')
    ];

    if (schema.cityCol) {
      r.push(csvQuote(c.rawData ? (c.rawData[schema.cityCol] || '') : ''));
    }
    schema.customCols.forEach(col => {
      r.push(csvQuote(c.rawData ? (c.rawData[col] || '') : ''));
    });

    rows.push(r);
  });

  const csvText = '\uFEFF' + rows.map(e => e.join(',')).join('\r\n');
  const defaultCsvName = `${isEn ? 'Broadcast_Report' : 'Laporan_Broadcast'}_${Date.now()}.csv`;

  if (isTauriEnv && tauriCore) {
    try {
      const encoder = new TextEncoder();
      const byteArr = Array.from(encoder.encode(csvText));
      const savedPath = await tauriCore.invoke('cmd_save_binary_file', {
        defaultName: defaultCsvName,
        bytes: byteArr,
        title: isEn ? 'Save Audit Report (.csv)' : 'Simpan Laporan Rekap (.csv)'
      });
      if (savedPath) {
        appendLog('success', isEn ? `Audit CSV report saved to: ${savedPath}` : `Laporan rekap berhasil disimpan ke: ${savedPath}`);
      }
      return;
    } catch (e) {
      console.warn('cmd_save_binary_file fallback for CSV:', e);
    }
  }

  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', defaultCsvName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  appendLog('success', isEn ? 'Audit CSV report downloaded successfully.' : 'Laporan rekap berhasil di-download.');
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
      if (p.template && !isBuiltInDefaultTemplate(p.template)) {
        messageTemplate.value = p.template;
      }
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
  const isEn = currentLang === 'en';
  if (!errMsg) {
    return {
      label: isEn ? 'System Error' : 'Kendala Sistem',
      desc: isEn ? 'No detail provided for this error.' : 'Tidak ada informasi detail kendala.',
      class: 'diag-unknown'
    };
  }
  const str = String(errMsg).toLowerCase();

  if (str.includes('not registered') || str.includes('invalid number') || str.includes('wid') || str.includes('nomor') || str.includes('tidak terdaftar')) {
    return {
      label: isEn ? 'Unregistered Number' : 'Nomor Tidak Terdaftar',
      desc: isEn ? 'WhatsApp account not registered or invalid phone number.' : 'Nomor WhatsApp belum terdaftar atau salah format.',
      class: 'diag-unregistered'
    };
  }
  if (str.includes('enoent') || str.includes('not found') || str.includes('lampiran') || str.includes('missing file') || str.includes('berkas')) {
    return {
      label: isEn ? 'Attachment Missing' : 'Lampiran Tidak Ada',
      desc: isEn ? 'Attachment file was not found in source directory.' : 'File lampiran tidak ditemukan di folder sumber.',
      class: 'diag-file-missing'
    };
  }
  if (str.includes('large') || str.includes('size') || str.includes('payload') || str.includes('besar') || str.includes('terlalu besar') || str.includes('limit')) {
    return {
      label: isEn ? 'File Too Large' : 'Ukuran Terlalu Besar',
      desc: isEn ? 'File size exceeds WhatsApp media upload limit.' : 'Ukuran file melampaui batas media WhatsApp.',
      class: 'diag-file-large'
    };
  }
  if (str.includes('detached frame') || str.includes('execution context') || str.includes('target closed') || str.includes('session') || str.includes('disconnect') || str.includes('connection') || str.includes('timeout') || str.includes('terputus') || str.includes('server')) {
    return {
      label: isEn ? 'Connection / Session Stale' : 'Sesi Koneksi Terputus',
      desc: isEn ? 'WhatsApp browser frame or engine connection dropped and needed refresh.' : 'Frame browser WhatsApp Web atau koneksi engine sempat terputus.',
      class: 'diag-connection'
    };
  }
  if (str.includes('abort') || str.includes('batal') || str.includes('stop')) {
    return {
      label: isEn ? 'Cancelled by User' : 'Dibatalkan Pengguna',
      desc: isEn ? 'Broadcast stopped manually by user.' : 'Proses broadcast dihentikan manual oleh pengguna.',
      class: 'diag-unknown'
    };
  }
  return {
    label: isEn ? 'Dispatch Failed' : 'Gagal Kirim',
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
  const isEn = currentLang === 'en';
  showCustomConfirm({
    title: isEn ? 'Clear Entire History?' : 'Bersihkan Seluruh Riwayat?',
    subtitle: isEn 
      ? 'All past broadcast summaries and failure audit records will be permanently removed from this computer.'
      : 'Seluruh rekapitulasi dan data audit kegagalan pengiriman broadcast akan dihapus dari penyimpanan komputer.',
    emoji: '🗑️',
    iconClass: 'hero-failed',
    confirmText: isEn ? 'Yes, Clear All' : 'Ya, Bersihkan',
    confirmBtnClass: 'btn-rose',
    cancelText: isEn ? 'Cancel' : 'Batal',
    onConfirm: () => {
      notificationHistory = [];
      unreadNotifCount = 0;
      updateNotifBadge();
      saveNotificationHistory();
      renderNotificationDrawer();
      appendLog('info', isEn ? 'Notification & audit history has been cleared.' : 'Riwayat notifikasi & audit telah dibersihkan.');
    }
  });
}

function showCompletionModal(session) {
  if (!completionModalOverlay) return;
  const isEn = currentLang === 'en';

  // Header styling & emoji
  modalHeroIcon.className = 'modal-hero-icon';
  if (session.type === 'test') {
    if (session.success > 0) {
      modalHeroIcon.classList.add('state-success');
      modalHeroEmoji.textContent = '🧪';
      modalTitle.textContent = isEn ? 'Test Message Dispatched!' : 'Uji Coba Pengiriman Berhasil!';
      modalSubtitle.textContent = isEn ? 'Test message was successfully dispatched to your phone.' : 'Pesan uji coba berhasil terkirim ke nomor tujuan Anda.';
    } else {
      modalHeroIcon.classList.add('state-warning');
      modalHeroEmoji.textContent = '⚠️';
      modalTitle.textContent = isEn ? 'Test Message Failed' : 'Uji Coba Pengiriman Gagal';
      modalSubtitle.textContent = isEn ? 'Test message could not be dispatched to destination number.' : 'Pesan uji coba tidak dapat dikirim ke nomor tujuan.';
    }
  } else {
    if (session.failed === 0) {
      modalHeroIcon.classList.add('state-success');
      modalHeroEmoji.textContent = '🎉';
      modalTitle.textContent = isEn ? 'Broadcast Completed Successfully!' : 'Broadcast Selesai Sempurna!';
      modalSubtitle.textContent = isEn ? `All ${session.total} messages were dispatched successfully without issues.` : `Seluruh ${session.total} pesan berhasil dikirimkan ke penerima tanpa kendala.`;
    } else if (session.success > 0) {
      modalHeroIcon.classList.add('state-warning');
      modalHeroEmoji.textContent = '⚠️';
      modalTitle.textContent = isEn ? 'Broadcast Completed with Issues' : 'Broadcast Selesai (Ada Kendala)';
      modalSubtitle.textContent = isEn ? `${session.success} sent successfully, but ${session.failed} contacts failed.` : `${session.success} pesan terkirim, namun terdapat ${session.failed} kontak gagal.`;
    } else {
      modalHeroIcon.classList.add('state-warning');
      modalHeroEmoji.textContent = '❌';
      modalTitle.textContent = isEn ? 'Broadcast Failed to Dispatch' : 'Broadcast Gagal Terkirim';
      modalSubtitle.textContent = isEn ? `All ${session.total} contacts encountered delivery failures.` : `Seluruh ${session.total} kontak mengalami kegagalan saat pengiriman.`;
    }
  }

  // Metrics
  modalStatSuccess.textContent = session.success;
  modalStatFailed.textContent = session.failed;
  modalStatTotal.textContent = session.total;
  modalStatDuration.textContent = `${session.durationSec || 0} ${isEn ? 'sec' : 'dtk'}`;

  // Failures breakdown table
  if (session.failed > 0 && session.failures && session.failures.length > 0) {
    modalFailuresSection.style.display = 'block';
    modalFailuresCount.textContent = session.failures.length;
    const failuresH3 = document.querySelector('.failures-header h3');
    if (failuresH3) failuresH3.innerHTML = `${isEn ? 'Failed Contacts Breakdown' : 'Rincian Kontak Gagal'} (<span id="modalFailuresCount">${session.failures.length}</span>)`;
    const failuresHint = document.querySelector('.failures-hint');
    if (failuresHint) failuresHint.textContent = isEn ? 'Check diagnostic reasons below:' : 'Periksa alasan kendala di bawah ini:';
    const failThs = document.querySelectorAll('.failures-table th');
    if (failThs && failThs.length >= 3) {
      failThs[0].textContent = isEn ? 'Recipient' : 'Penerima';
      failThs[1].textContent = isEn ? 'WhatsApp Number' : 'Nomor WhatsApp';
      failThs[2].textContent = isEn ? 'Diagnostic Reason' : 'Diagnosa Kendala';
    }
    modalFailuresTableBody.innerHTML = '';

    session.failures.forEach(f => {
      const diagInfo = categorizeError(f.error || (f.diag ? f.diag.desc : ''));
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong style="color: var(--text-heading);">${escapeHtml(f.name)}</strong></td>
        <td><code>${escapeHtml(f.phone)}</code></td>
        <td>
          <span class="diag-badge ${diagInfo.class}">${escapeHtml(diagInfo.label)}</span>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">${escapeHtml(diagInfo.desc)}</div>
        </td>
      `;
      modalFailuresTableBody.appendChild(tr);
    });

    if (session.type === 'broadcast') {
      btnModalRetryFailed.style.display = 'inline-flex';
      btnModalRetryFailed.innerHTML = `<svg class="icon"><use href="#icon-refresh"/></svg> ${isEn ? 'Retry Failed Contacts' : 'Kirim Ulang Kontak Gagal'} (<span id="modalRetryBtnCount">${session.failures.length}</span>)`;
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
  const isEn = currentLang === 'en';

  if (notificationHistory.length === 0) {
    notifHistoryBody.innerHTML = `
      <div class="history-empty-state">
        <svg class="history-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <p style="font-weight: 600; color: var(--text-heading); margin-bottom: 2px;">${isEn ? 'No History Yet' : 'Belum Ada Riwayat'}</p>
        <p style="font-size: 0.78rem;">${isEn ? 'Completed broadcast sessions and test dispatches will be recorded here.' : 'Setiap sesi broadcast atau uji coba yang selesai akan tercatat otomatis di sini.'}</p>
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
    let typeLabel = isTest 
      ? (isEn ? '🧪 Test' : '🧪 Uji Coba') 
      : (isSuccessOnly ? (isEn ? '✓ 100% Success' : '✓ Selesai Sempurna') : (isEn ? '⚠️ Issues Found' : '⚠️ Selesai (Ada Gagal)'));

    let failuresHtml = '';
    if (hasFailures && session.failures && session.failures.length > 0) {
      failuresHtml = `
        <div style="margin-top: 4px;">
          <button type="button" class="history-toggle-details-btn" data-idx="${idx}">
            ${isEn ? `View ${session.failures.length} Failed Contacts & Diagnostics ▾` : `Lihat ${session.failures.length} Kontak Gagal & Diagnosa ▾`}
          </button>
          <div class="history-failures-drawer-list" id="drawerFailures_${idx}" style="display: none; margin-top: 8px;">
            ${session.failures.map(f => {
              const diagInfo = categorizeError(f.error || (f.diag ? f.diag.desc : ''));
              return `
              <div class="history-fail-item">
                <div>
                  <div class="history-fail-user">${escapeHtml(f.name)}</div>
                  <div class="history-fail-phone">${escapeHtml(f.phone)}</div>
                </div>
                <div style="text-align: right;">
                  <span class="diag-badge ${diagInfo.class}">${escapeHtml(diagInfo.label)}</span>
                  <div style="font-size: 0.68rem; color: var(--text-dim); max-width: 170px;">${escapeHtml(diagInfo.desc)}</div>
                </div>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="history-card-top">
        <div>
          <span class="history-card-title">${isTest ? (isEn ? 'Test Message Dispatch' : 'Uji Coba Pengiriman') : (isEn ? 'Broadcast Session' : 'Sesi Broadcast')}</span>
          <div class="history-card-time">${escapeHtml(session.formattedTime || '')}</div>
        </div>
        <span class="history-badge ${badgeTypeClass}">${typeLabel}</span>
      </div>
      <div class="history-badges-row">
        <span class="history-badge badge-success">✓ ${session.success} ${isEn ? 'Sent' : 'Sukses'}</span>
        ${session.failed > 0 ? `<span class="history-badge badge-failed">✗ ${session.failed} ${isEn ? 'Failed' : 'Gagal'}</span>` : ''}
        <span class="history-badge badge-duration">⏱ ${session.durationSec || 0} ${isEn ? 'sec' : 'dtk'}</span>
        <span class="history-badge" style="background: rgba(148, 163, 184, 0.15); color: var(--text-dim);">
          Mode: ${session.mode === 'attachment' ? (isEn ? 'Attachment' : 'Lampiran') : (isEn ? 'Text' : 'Teks')}
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
            ? (isEn ? `Hide ${session.failures.length} Failed Contacts ▴` : `Tutup ${session.failures.length} Kontak Gagal ▴`)
            : (isEn ? `View ${session.failures.length} Failed Contacts & Diagnostics ▾` : `Lihat ${session.failures.length} Kontak Gagal & Diagnosa ▾`);
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
