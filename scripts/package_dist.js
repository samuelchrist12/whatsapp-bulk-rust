/**
 * Packages the self-contained distribution artifacts into dist/ after Tauri NSIS build:
 *   1. Bulk_WA_Sender_v1.0.0_x64_Setup.exe
 *   2. Bulk_WA_Sender_v1.0.0_x64_Portable.zip
 *   3. Bulk_WA_Sender_v1.0.0_x64_Testing.zip
 *   4. sample_data_starter_pack.zip
 *   5. checksums.txt, README.txt, RELEASE_NOTES_v1.0.0.md
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const RELEASE_DIR = path.join(ROOT, 'src-tauri', 'target', 'release');
const RUNTIME_DIR = path.join(ROOT, 'src-tauri', 'runtime');
const SAMPLE_DIR = path.join(ROOT, 'sample_data');

const VERSION = '1.0.0';

function formatMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function createZipFromFolder(stagingParentDir, folderName, destZipPath) {
  if (fs.existsSync(destZipPath)) fs.unlinkSync(destZipPath);
  // Use tar.exe (built into Windows 10/11 system32, fast & standard ZIP deflate) or PowerShell Compress-Archive fallback
  try {
    execSync(`tar -a -c -f "${destZipPath}" -C "${stagingParentDir}" "${folderName}"`, { stdio: 'inherit' });
  } catch (e) {
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${path.join(stagingParentDir, folderName)}' -DestinationPath '${destZipPath}' -Force"`,
      { stdio: 'inherit' }
    );
  }
}

function populatePortableFolder(targetFolder, exeFileName) {
  fs.rmSync(targetFolder, { recursive: true, force: true });
  fs.mkdirSync(path.join(targetFolder, 'runtime'), { recursive: true });
  fs.mkdirSync(path.join(targetFolder, 'sample_data', 'attachments'), { recursive: true });

  fs.copyFileSync(path.join(RELEASE_DIR, 'app.exe'), path.join(targetFolder, exeFileName));
  const dllPath = path.join(RELEASE_DIR, 'WebView2Loader.dll');
  if (fs.existsSync(dllPath)) {
    fs.copyFileSync(dllPath, path.join(targetFolder, 'WebView2Loader.dll'));
  }

  fs.copyFileSync(path.join(RUNTIME_DIR, 'node.exe'), path.join(targetFolder, 'runtime', 'node.exe'));
  fs.copyFileSync(path.join(RUNTIME_DIR, 'engine.cjs'), path.join(targetFolder, 'runtime', 'engine.cjs'));

  for (const sampleFile of ['Sample_Contact_List.xlsx', 'Sample_Contact_List.csv']) {
    const src = path.join(SAMPLE_DIR, sampleFile);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(targetFolder, 'sample_data', sampleFile));
    }
  }
  const attDir = path.join(SAMPLE_DIR, 'attachments');
  if (fs.existsSync(attDir)) {
    fs.cpSync(attDir, path.join(targetFolder, 'sample_data', 'attachments'), { recursive: true });
  }
}

fs.mkdirSync(DIST, { recursive: true });

// Clean legacy loose files in dist/
for (const oldName of [
  `Bulk_WA_Sender_v${VERSION}_x64_Portable.exe`,
  `Bulk_WA_Sender_v${VERSION}_x64_Testing.exe`,
  'bulk_wa_preferences.json',
  'BACA_SAYA.txt'
]) {
  const p = path.join(DIST, oldName);
  if (fs.existsSync(p)) {
    try { fs.unlinkSync(p); } catch (e) {}
  }
}

// 1. Copy NSIS Setup.exe
const nsisSrc = path.join(RELEASE_DIR, 'bundle', 'nsis', `Bulk WA Sender_${VERSION}_x64-setup.exe`);
const setupDest = path.join(DIST, `Bulk_WA_Sender_v${VERSION}_x64_Setup.exe`);
if (!fs.existsSync(nsisSrc)) {
  throw new Error(`NSIS installer not found at ${nsisSrc}`);
}
fs.copyFileSync(nsisSrc, setupDest);
console.log(`[package_dist] Copied Setup.exe (${formatMb(fs.statSync(setupDest).size)})`);

// 2. Build Portable.zip & Testing.zip
const stagingRoot = path.join(RELEASE_DIR, '_dist_staging');
fs.rmSync(stagingRoot, { recursive: true, force: true });
fs.mkdirSync(stagingRoot, { recursive: true });

const portableFolderName = `Bulk_WA_Sender_v${VERSION}_Portable`;
populatePortableFolder(path.join(stagingRoot, portableFolderName), 'Bulk_WA_Sender_Portable.exe');
const portableZip = path.join(DIST, `Bulk_WA_Sender_v${VERSION}_x64_Portable.zip`);
createZipFromFolder(stagingRoot, portableFolderName, portableZip);
console.log(`[package_dist] Built Portable.zip (${formatMb(fs.statSync(portableZip).size)})`);

const testingFolderName = `Bulk_WA_Sender_v${VERSION}_Testing`;
populatePortableFolder(path.join(stagingRoot, testingFolderName), 'Bulk_WA_Sender_Testing.exe');
const testingZip = path.join(DIST, `Bulk_WA_Sender_v${VERSION}_x64_Testing.zip`);
createZipFromFolder(stagingRoot, testingFolderName, testingZip);
console.log(`[package_dist] Built Testing.zip (${formatMb(fs.statSync(testingZip).size)})`);

// 3. Build sample_data_starter_pack.zip
const starterFolderName = 'sample_data';
const starterStage = path.join(stagingRoot, starterFolderName);
fs.mkdirSync(path.join(starterStage, 'attachments'), { recursive: true });
for (const f of ['Sample_Contact_List.xlsx', 'Sample_Contact_List.csv']) {
  const src = path.join(SAMPLE_DIR, f);
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(starterStage, f));
}
fs.cpSync(path.join(SAMPLE_DIR, 'attachments'), path.join(starterStage, 'attachments'), { recursive: true });
const starterZip = path.join(DIST, 'sample_data_starter_pack.zip');
createZipFromFolder(stagingRoot, starterFolderName, starterZip);

fs.rmSync(stagingRoot, { recursive: true, force: true });

// 4. Generate SHA-256 checksums.txt
const assetFiles = [
  `Bulk_WA_Sender_v${VERSION}_x64_Setup.exe`,
  `Bulk_WA_Sender_v${VERSION}_x64_Portable.zip`,
  `Bulk_WA_Sender_v${VERSION}_x64_Testing.zip`,
  'sample_data_starter_pack.zip'
];

const checksumLines = [
  `SHA-256 Checksums for Bulk WA Sender v${VERSION} Release Assets:`,
  '========================================================================================================'
];
for (const name of assetFiles) {
  const full = path.join(DIST, name);
  checksumLines.push(`${sha256File(full)}  ${name}`);
}
checksumLines.push('========================================================================================================');
fs.writeFileSync(path.join(DIST, 'checksums.txt'), checksumLines.join('\r\n') + '\r\n', 'utf-8');

const setupSize = formatMb(fs.statSync(setupDest).size);
const portableSize = formatMb(fs.statSync(portableZip).size);
const testingSize = formatMb(fs.statSync(testingZip).size);
const starterKb = Math.max(1, Math.round(fs.statSync(starterZip).size / 1024)) + ' KB';

// 5. Update dist/README.txt & dist/RELEASE_NOTES_v1.0.0.md with exact sizes
const readmeTxt = `================================================================
  BULK WA SENDER v${VERSION} - OFFICIAL SELF-CONTAINED RELEASE
  Design & Engineering by schrist. (https://schrist.cyou)
================================================================

ZERO-SETUP READY: All packages include the embedded WhatsApp Engine
runtime. End users DO NOT need to install Node.js, npm, or external
developer packages. Uses Windows 10/11's built-in Microsoft Edge or
Google Chrome automatically.

1. Bulk_WA_Sender_v${VERSION}_x64_Setup.exe (~${setupSize}) [RECOMMENDED]
   - Official Windows Installer (NSIS Setup Wizard).
   - Installs application, WebView2Loader.dll, embedded WhatsApp runtime,
     and sample_data; creates Desktop & Start Menu shortcuts + uninstaller.
   - Edition: Production Clean (QA simulation buttons hidden).

2. Bulk_WA_Sender_v${VERSION}_x64_Portable.zip (~${portableSize})
   - Self-Contained Portable Package (No installation required).
   - Extract the ZIP folder anywhere and double-click Bulk_WA_Sender_Portable.exe.
   - Edition: Production Clean (QA simulation buttons hidden).

3. Bulk_WA_Sender_v${VERSION}_x64_Testing.zip (~${testingSize})
   - Self-Contained QA & Diagnostic Testing Portable Package.
   - Extract and run Bulk_WA_Sender_Testing.exe to enable QA simulation buttons.

4. sample_data_starter_pack.zip (~${starterKb})
   - Sample 8-column general spreadsheets (Sample_Contact_List.xlsx & .csv)
     and sample attachments (PDF, JPG, PNG, DOCX) for quick evaluation.

5. checksums.txt
   - SHA-256 cryptographic hashes for verifying file integrity.
================================================================
`;
fs.writeFileSync(path.join(DIST, 'README.txt'), readmeTxt, 'utf-8');

const releaseNotesMd = `# 🚀 Bulk WA Sender v${VERSION} (Official Self-Contained Release)

**High-Performance WhatsApp Bulk Broadcaster & Personalized Document Dispatcher**  
*Design & Craft by [schrist.](https://schrist.cyou)*

---

## ✨ What's New in v${VERSION}

### 1. 📦 100% Zero-Setup Self-Contained Architecture (Ready for Everyone)
- **No Node.js or Developer Tools Required**: Both the Installer (\`Setup.exe\`) and Portable (\`.zip\`) editions come pre-bundled with the complete WhatsApp automation runtime. Just install or extract and double-click to launch on any standard Windows 10/11 PC.
- **Zero-Bloat Browser Detection**: Automatically leverages Google Chrome or Windows 10/11's pre-installed **Microsoft Edge** in headless mode — keeping download size compact without a 300 MB browser download.
- **Clean Auto-Shutdown & Self-Healing Session**: Closing the application cleanly terminates all background engine and headless browser processes (\`0 MB\` idle RAM residue) while preserving your authenticated WhatsApp session safely in \`%LOCALAPPDATA%\\BulkWASender\`, plus automatic recovery against detached browser frames.

### 2. 🌐 Bilingual System (\`ID\` | \`EN\`)
- Segmented language switcher integrated directly into the title bar (\`ID\` | \`EN\`).
- Instant, zero-reload localization across all UI controls, status pills, Spintax salutations, notification drawers, and diagnostic modals.

### 3. 📊 Ready-to-Edit Excel Template & Dynamic Custom Column Detection
- **1-Click \`.xlsx\` Template Downloader**: Generate and save an official ready-to-fill 8-column Excel workbook (\`No\`, \`Name\`/\`Nama\`, \`Phone Number\`/\`Nomor Telepon\`, \`Attachment File Name\`/\`Nama Lampiran File\`, \`City/Branch\`/\`Kota/Cabang\`, \`Custom Column 1–3\`/\`Custom Kolom 1–3\`) via native Save-As dialog, with pre-formatted text phone cells so leading \`0\` (\`08xx\`) is never stripped.
- **Automatic Custom Column Header Reading**: Rename \`Custom Column 1–3\` / \`Custom Kolom 1–3\` to any custom header in Excel (e.g., \`Role\`, \`Event Schedule\`, \`Voucher Code\`, \`Total Due\`) or add extra columns — the Pre-Flight Verification Table, \`{Tag}\` composer pills, search filter, and CSV audit report automatically read and display your exact spreadsheet headers upon upload.

### 4. ⚡ Blazing-Fast Native Rust Core (Tauri v2)
- High-speed Excel (\`.xlsx\`) and \`.csv\` parsing powered by \`calamine\`.
- Sub-second attachment filesystem indexing powered by Rust's \`walkdir\`.
- Silent background WhatsApp automation service (\`CREATE_NO_WINDOW\`).

### 5. 🎨 Obsidian Emerald Material Design 3 UI & Light Mode Refinement
- High-contrast, accessibility-focused **Obsidian Emerald** theme (\`#059669\`) across Dark and Light modes.
- Frosted modal scrims and semantic pastel metric cards (*Success*, *Failed*, *Duration*, *Total*).

### 6. 📎 Intelligent Dynamic File Attachments & Native Folder Picker
- **1-Click Native Folder Browser**: Select attachment directories directly via native Windows Explorer dialog (\`rfd\`) with automatic instant scanning.
- **Dual Matching Strategies**: *By Recipient Name* (\`[Name].[ext]\`) or *By Spreadsheet Column* (\`Attachment File Name\` / custom key).
- Supports \`.pdf\`, \`.docx\`, \`.xlsx\`, \`.zip\`, \`.csv\`, \`.jpg\`, \`.png\`, and \`.webp\` with strict pre-flight verification.

### 7. 🛡️ Intelligent Anti-Ban Protection & Audit Flyout Drawer
- Humanized jitter delays (3–7s random interval), configurable batch cooldown rests, Spintax (\`{Hello|Hi|Greetings}\`), and time-aware salutations (\`{Salam}\`).
- Interactive completion summary modal with categorized failure diagnostics, **1-Click Retry Failed**, CSV report export, and persistent notification history drawer.

---

## 📦 Release Assets & Downloads

| File Name | Size | Target Environment | Description |
| :--- | :--- | :--- | :--- |
| **\`Bulk_WA_Sender_v${VERSION}_x64_Setup.exe\`** | ~${setupSize} | Windows 10/11 x64 | **Recommended for General Users**: Official 1-click Installer with bundled WA runtime, Desktop & Start Menu shortcuts, and clean uninstaller. |
| **\`Bulk_WA_Sender_v${VERSION}_x64_Portable.zip\`** | ~${portableSize} | Windows 10/11 x64 | **No-Install Self-Contained Portable**: Extract anywhere and run \`Bulk_WA_Sender_Portable.exe\` — includes all runtime files out of the box. |
| **\`Bulk_WA_Sender_v${VERSION}_x64_Testing.zip\`** | ~${testingSize} | Windows 10/11 x64 | **QA & Testing Edition**: Self-contained portable package with visible simulation buttons for modal & audit testing. |
| **\`sample_data_starter_pack.zip\`** | ~${starterKb} | All Platforms | Sample 8-column spreadsheets and demo attachments for instant testing. |

---

## 🔐 Cryptographic Checksums (SHA-256)
Refer to \`checksums.txt\` for SHA-256 hash verification.

---
*Developed with craft by **schrist.***
`;
fs.writeFileSync(path.join(DIST, `RELEASE_NOTES_v${VERSION}.md`), releaseNotesMd, 'utf-8');

console.log('[package_dist] All release artifacts and checksums generated successfully!');

