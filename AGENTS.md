# 🤖 AI Agent Development Guidelines (`AGENTS.md`)

> **Purpose**: This document serves as the authoritative architectural, UI/UX, localization, and engineering specification for AI coding agents working on **Bulk WA Sender**. Read and follow every rule in this file before planning or modifying code.

---

## 1. System Architecture & Tech Stack

**Bulk WA Sender** uses a three-tier hybrid desktop architecture:

1. **Frontend UI (`ui/`)**:
   - Pure Vanilla HTML5 (`ui/index.html`), custom CSS3 design tokens (`ui/style.css`), and Vanilla ES6+ JavaScript (`ui/app.js`).
   - Zero heavy frontend framework build step — `ui/` is loaded directly by Tauri WebView2 (`frontendDist: "../ui"`).
   - All icons are inlined inside `<div id="svgSpriteContainer">` in `ui/index.html` (`<svg class="icon"><use href="#icon-..."/></svg>`) to guarantee 100% offline compatibility.
2. **Native Rust Core (`src-tauri/`)**:
   - Built on **Tauri v2** (`src-tauri/src/lib.rs`, `excel.rs`, `attachment.rs`).
   - Handles high-speed spreadsheet parsing (`calamine`), recursive attachment folder indexing & fuzzy filename matching (`walkdir`), native OS folder selection (`rfd` inside `tauri::async_runtime::spawn_blocking`), phone normalization (`regex`), preference persistence, custom frameless window controls, and runtime flavor detection (`cmd_get_app_flavor`).
3. **WhatsApp Engine Sidecar (`sidecar/server.js`)**:
   - Local Express + `whatsapp-web.js` (Puppeteer) service listening on `http://127.0.0.1:3847`.
   - Spawned silently in the background by Rust (`CREATE_NO_WINDOW` flag `0x08000000` on Windows).
   - Manages Multi-Device QR authentication (`.wa_session`), anti-ban jitter/batch cooldown queues, real-time broadcast progress polling, and single test dispatches.

---

## 2. UI / UX & Design System ("Obsidian Emerald M3")

### 2.1. Theme Architecture (`dark` & `light`)
- Controlled via `document.documentElement.setAttribute('data-theme', 'dark' | 'light')` and persisted in `localStorage` (`bulk_wa_sender_theme`).
- **Dark Theme**: Deep Obsidian surfaces (`#080C14`, `#0F172A`, `#1E293B`) with WhatsApp Emerald (`#10B981`) accents.
- **Light Theme**: Crisp slate-white surfaces (`#F8FAFC`, `#FFFFFF`) with soft borders (`#E2E8F0`), high-contrast slate typography (`#0F172A` headings, `#475569` body), and frosted modal scrims (`rgba(15, 23, 42, 0.28)` + `backdrop-filter: blur(8px)`).
- **Modal Metric Cards in Light Mode**: Always use soft semantic pastel surfaces with crisp dark-tinted text:
  - Success: `#F0FDF4` bg / `#15803D` text
  - Failed: `#FEF2F2` bg / `#B91C1C` text
  - Total: `#F8FAFC` bg / `#0F172A` text
  - Duration: `#EEF2FF` bg / `#4338CA` text

### 2.2. Button Contrast Rules (CRITICAL)
- Filled semantic action buttons (`.btn-emerald`, `.btn-amber`, `.btn-rose`) **MUST ALWAYS** use crisp white text (`#FFFFFF !important`, `font-weight: 700`) across **both** Light and Dark themes.
- **Never** use black (`#000000`) or dark gray text on `.btn-amber` or `.btn-emerald` buttons (e.g., confirmation modals, retry buttons, or primary CTAs).

### 2.3. Layout & Overflow Prevention
- The workspace uses a two-column split layout:
  - **Left Hub (`.m3-left-pane`)**: `width: 430px; min-width: 400px; max-width: 480px;` containing the live WhatsApp smartphone preview and real-time activity terminal.
  - **Right Workspace (`.m3-right-pane`)**: Flexible scrollable operational cards (Delivery Mode, Contact Spreadsheet, File Attachment Settings, Message Composer, Execution Controls, and Pre-Flight Table).
- **Flexbox Truncation Rule**: Every horizontal bar combining labels, `<select>` dropdowns, `<input>` fields, and action buttons (such as `.preview-header-left` and `.input-with-button`) **MUST**:
  - Set `min-width: 0; flex: 1;` on flexible inputs/selects with `text-overflow: ellipsis; overflow: hidden; white-space: nowrap;`.
  - Set `flex-shrink: 0; white-space: nowrap;` on labels, badges (`.match-badge`), and buttons so longer English or Indonesian translations never overflow card borders.

### 2.4. Typography
- Primary UI font: `'Plus Jakarta Sans', sans-serif`.
- Monospace data font: `'JetBrains Mono', monospace` — mandatory for phone numbers, file paths, template variables (`{Column}`), invoice codes, and terminal logs.
- Custom native dialogs (`#completionModalOverlay`, `#confirmModalOverlay`) should always be preferred over raw browser `window.confirm()` for destructive or high-impact user actions.

---

## 3. Bilingual Internationalization (`ID` / `EN`) Rules

The application supports instant, zero-reload switching between **Indonesian (`id`)** and **English (`en`)** via the titlebar toggle (`#langBtnId` / `#langBtnEn`), persisted in `localStorage` (`bulk_wa_sender_lang`).

### Mandatory Checklist When Adding or Editing Any UI Feature:
1. **Register Keys in Both Dictionaries**: Add every static label, subtitle, button text, input placeholder, and tooltip (`title`) to **both** `I18N.id` and `I18N.en` in `ui/app.js`.
2. **Bind Inside `applyLanguage(lang)`**: Ensure `applyLanguage(lang)` updates all static elements AND triggers re-renders of stateful views (`renderTable()`, `renderNotificationDrawer()`, `updateLivePreview()`, and `#matchPercentageBadge`).
3. **Localize All Dynamic Strings**: Check `const isEn = currentLang === 'en';` inside dynamic renderers:
   - Attachment scan badges (`Files Ready` vs `File Siap`, `Select Folder First` vs `Pilih Folder Dulu`, `Folder Not Found` vs `Folder Tidak Ditemukan`).
   - Pre-flight table pills (`Text Mode` vs `Mode Teks`, `🔴 Not Found` vs `🔴 Tidak Ditemukan`, `✓ Sent` vs `✓ Terkirim`, `✗ Failed` vs `✗ Gagal`, `(Invalid)` vs `(Tidak Valid)`).
   - Live smartphone mockup attachment subtitles (`PDF Document • 1 Page`, `Image File • HD Media`, etc.) and `{Salam}` time greetings.
   - Real-time broadcast progress bar text (`Sending to...`, `[PAUSED]`, `Completed...`) and CSV export headers/values.
4. **Avoid Detached DOM References**: Never rely on cached top-level DOM element references if a parent container's `.innerHTML` is rewritten during language switching (always look up dynamic badges like `#selectionCountBadge`, `#btnTargetCount`, and `#totalTableCount` via `document.getElementById()`).

---

## 4. Repository Language & File Naming Conventions

- **100% English Repository Standard**: All tracked files, directories, documentation, scripts, commit messages, and release notes pushed to GitHub **MUST** be named and written in **English**:
  - `README.md`, `AGENTS.md`, `docs/USER_GUIDE.md`
  - `sample_data/Sample_Contact_List.xlsx`, `sample_data/attachments/`
  - `Run_Application.bat`, `scripts/`
- Local internal Indonesian scratch/analysis notes (e.g., `ANALISIS_DAN_PENGEMBANGAN.md`, legacy `data_contoh/`) must stay listed in `.gitignore` and never be committed to remote.

---

## 5. Validation Integrity & Native Dialogs

- **Strict Filesystem Truthfulness (Zero False-Positives)**:
  - When scanning an attachment directory via `cmd_scan_attachments` (Rust) or `/api/scan-attachments` (Sidecar), if the directory does not exist or is invalid, **NEVER** fall back to simulated/mock success data.
  - Always invoke `applyFolderNotFoundState(folder)` so all contacts are marked `exists: false` and `#matchPercentageBadge` displays `0 / N Files (Folder Not Found)` with `.badge-failed`.
  - Static demo simulation is permitted **only** when running in a pure offline browser preview (no Tauri & no Sidecar) **and** the folder path explicitly matches the built-in sample preset (`sample_data/attachments`).
- **Folder Selection UX**:
  - Maintain both manual path input (`#attachmentFolderInput`) and one-click native folder browsing (`#btnBrowseAttachmentFolder` -> `cmd_pick_folder` in Rust, with `#attachmentFolderPicker` `webkitdirectory` fallback in browsers). Selecting a folder must automatically save preferences and trigger `triggerAttachmentScan()`.

---

## 6. Build Flavors, Versioning & Release Packaging

### 6.1. Version Synchronization
Keep version numbers synchronized across:
- `src-tauri/tauri.conf.json` (`"version": "X.Y.Z"`)
- `src-tauri/Cargo.toml` (`version = "X.Y.Z"`)
- `sidecar/package.json` (`"version": "X.Y.Z"`)
- UI version badges in `ui/index.html` (`vX.Y`) and Git tags (`vX.Y.Z`).

### 6.2. Three Distribution Artifacts (`dist/`)
Every release produces three executables inside `dist/` alongside `dist/checksums.txt` (SHA-256):
1. **`Bulk_WA_Sender_vX.Y.Z_x64_Setup.exe`**: NSIS installer from `src-tauri/target/release/bundle/nsis/`. Production mode (`#simulationTestingBar` hidden).
2. **`Bulk_WA_Sender_vX.Y.Z_x64_Portable.exe`**: Standalone release binary from `src-tauri/target/release/app.exe`. Production mode (`#simulationTestingBar` hidden).
3. **`Bulk_WA_Sender_vX.Y.Z_x64_Testing.exe`**: Identical release binary named with `Testing` — `cmd_get_app_flavor()` in `src-tauri/src/lib.rs` detects `"test"` in the executable filename (or `BULK_WA_TESTING` env var / `?mode=testing` query param) and reveals `#simulationTestingBar` exclusively for QA testing.

> **CRITICAL QA RULE**: `#simulationTestingBar` must ALWAYS default to `style="display: none;"` in `ui/index.html` and `display: none;` in `ui/style.css` so QA dummy buttons never appear in `Setup.exe` or `Portable.exe`.

### 6.3. Security & Git Hygiene
- **Never** commit `.exe`, `.dll`, `.pdb`, `dist/`, `target/`, `node_modules/`, `bulk_wa_preferences.json`, or WhatsApp authentication directories (`.wa_session/`, `.wwebjs_auth/`, `.wwebjs_cache/`).

