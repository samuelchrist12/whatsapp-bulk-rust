<div align="center">

  <h1>⚡ Bulk WA Sender (Rust Core Edition)</h1>
  <p><strong>Ultra-Fast Desktop WhatsApp Broadcast & Personalized Document Dispatcher</strong></p>
  <p><em>Engineered with Tauri v2 Native Rust Core, Dynamic File Attachment Matching, Spintax Anti-Ban Engine, Bilingual UI, and M3 Obsidian Emerald Aesthetics.</em></p>

  <p>
    <img src="https://img.shields.io/badge/Release-v1.0.0-059669?style=for-the-badge&logo=github&logoColor=white" alt="Release v1.0.0" />
    <img src="https://img.shields.io/badge/Tauri-v2.0-24C8D8?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri v2" />
    <img src="https://img.shields.io/badge/Rust-2024%20Edition-DEA584?style=for-the-badge&logo=rust&logoColor=black" alt="Rust" />
    <img src="https://img.shields.io/badge/Node.js-Sidecar%20Engine-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Design-Material%20Design%203-059669?style=for-the-badge&logo=material-design&logoColor=white" alt="M3" />
    <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011%20x64-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
    <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
  </p>

  <p>
    <strong>Designed & Developed by <a href="https://schrist.cyou">schrist.</a></strong>
  </p>

</div>

---

## 📸 Interface Preview

<div align="center">
  <h3>✨ Obsidian Emerald Workspace (Dark & Light Modes)</h3>
  <img src="docs/screenshots/01_workspace_dark.png" alt="Main Workspace Dark Mode" width="850" />
  <br/><br/>
  <img src="docs/screenshots/02_workspace_light.png" alt="Main Workspace Light Mode" width="850" />
</div>

<br/>

<table align="center">
  <tr>
    <td align="center" width="50%">
      <strong>🛡️ Two-View Gateway (QR Scanner & Verification)</strong><br/><br/>
      <img src="docs/screenshots/03_gateway_loading.png" alt="Gateway Screen" width="400" />
    </td>
    <td align="center" width="50%">
      <strong>🔔 Intelligent Completion & Failure Diagnostic Modal</strong><br/><br/>
      <img src="docs/screenshots/04_modal_failed_audit.png" alt="Completion Modal" width="400" />
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <strong>📑 Flyout Notification Drawer & Audit History</strong><br/><br/>
      <img src="docs/screenshots/05_notif_drawer_history.png" alt="Flyout Drawer" width="400" />
    </td>
    <td align="center" width="50%">
      <strong>🎉 100% Success Modal (Refined Light Mode)</strong><br/><br/>
      <img src="docs/screenshots/06_modal_success_light.png" alt="Success Modal Light Mode" width="400" />
    </td>
  </tr>
</table>

---

## 🌟 Key Features

### 1. ⚡ Hybrid Architecture: Tauri v2 Rust Core + Node.js Engine
- **Native Rust Speed**: High-performance parsing of massive Excel (`.xlsx`) and `.csv` contact books via `calamine`, combined with blazing-fast file scanning via `walkdir`.
- **Silent Background Automation**: WhatsApp Web engine runs quietly in the background without UI stutter.
- **Resource Efficient**: Substantially lower RAM consumption compared to standard Electron applications.

### 2. 🌐 Built-in Bilingual Interface (`ID` | `EN`)
- Seamless language switcher embedded directly in the titlebar.
- Instant, non-reloading localization across all labels, placeholders, Spintax greetings, status pills, audit drawers, and completion modals.
- Persistent language choice saved in local storage.

### 3. 📎 Dynamic Smart File Attachment Matching
- **Intelligent Discovery**:
  - *By Recipient Name*: Automatically finds individualized files matching the recipient's name (e.g., `Budi Santoso.pdf`, `John Doe.jpg`).
  - *By Spreadsheet Column*: References invoice numbers, tax IDs, or custom file keys defined in your sheet.
- **Multi-Format Support**: `.pdf`, `.docx`, `.xlsx`, `.zip`, `.csv`, `.jpg`, `.png`, and `.webp`.
- **Pre-flight Status Validation**: Visual check badges alert you before dispatching whether every recipient's attachment is present on disk.

### 4. 💬 Dynamic Interpolation & Spintax Engine (Anti-Ban)
- **One-Click Tag Insertion**: Insert `{Full Name}`, `{Branch City}`, `{Invoice Number}`, or `{Total Due}` directly into your template.
- **Time-Aware Salutations**: `{Salam}` dynamically outputs *Good morning*, *Good afternoon*, *Good evening*, or *Selamat Pagi/Siang/Sore/Malam*.
- **Spintax Variations**: Randomize openings with `{Hello|Hi|Greetings}` or `{Halo|Hai|Selamat Siang}` to avoid spam detection patterns.
- **Localized Number Formatting**: Automatically formats invoice totals into standard currency expressions.

### 5. ⏱️ Anti-Ban Smart Timing & Batch Throttling
- **Humanized Jitter Delay**: Natural randomized pause intervals (default: 3 to 7 seconds).
- **Batch Cooldown Controls**: Configurable rest periods (e.g., pause 60s every 20 messages) to emulate human typing patterns.
- **Realtime Dispatch Controls**: Instant pause, resume, and cancellation at any point during broadcast.

### 6. 🔔 Material Design 3 Modal & Audit Flyout Drawer
- Replaces standard browser dialogs with polished M3 dialogs in Obsidian Emerald aesthetics.
- **Categorized Failure Diagnostics**:
  - 🔴 *Unregistered Number*: WhatsApp account not found or invalid phone format.
  - 🟡 *Attachment Missing*: File not found in source folder.
  - 🟣 *File Too Large*: Media exceeds maximum upload size limits.
  - 🌐 *Connection Timeout*: Sidecar or network communication interruption.
- **1-Click Retry Failed**: Easily isolate failed contacts and re-dispatch them instantly.
- **Persistent Notification Drawer**: Click the titlebar bell to review unread notifications and past dispatch batches.

---

## 📁 Repository Structure

```text
├── sample_data/               # Sample contacts (XLSX, CSV) & attachment files
│   ├── Sample_Contact_List.xlsx
│   ├── Sample_Contact_List.csv
│   └── attachments/           # Sample PDF, DOCX, JPG, and PNG files
├── dist/                      # Production executables & release packages
│   ├── Bulk_WA_Sender_v1.0.0_x64_Setup.exe     (NSIS Installer)
│   ├── Bulk_WA_Sender_v1.0.0_x64_Portable.exe  (Clean Standalone)
│   ├── Bulk_WA_Sender_v1.0.0_x64_Testing.exe   (Testing Standalone)
│   ├── sample_data_starter_pack.zip
│   ├── RELEASE_NOTES_v1.0.0.md
│   └── checksums.txt
├── docs/                      # Screenshots, documentation, and user guide
│   ├── USER_GUIDE.md
│   └── screenshots/
├── src-tauri/                 # Tauri v2 Rust Core backend
│   ├── src/
│   │   ├── lib.rs             # Tauri command routing & flavor detection
│   │   ├── excel.rs           # Fast spreadsheet parser & resolver
│   │   ├── attachment.rs      # High-speed file crawler & matcher
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── sidecar/                   # WhatsApp engine background service
│   ├── server.js              # Express + whatsapp-web.js handler
│   └── package.json
├── ui/                        # Obsidian Emerald M3 Frontend
│   ├── index.html             # Application markup & SVGs
│   ├── style.css              # Theme tokens & responsive styles
│   └── app.js                 # Bilingual i18n & application controller
└── Run_Application.bat        # Windows launcher script
```

---

## 🚀 Getting Started

### Option 1: Standalone / Portable `.exe` (No Installation Required)
1. Download **`Bulk_WA_Sender_v1.0.0_x64_Portable.exe`** from [Releases](https://github.com/samuelchrist12/whatsapp-bulk-rust/releases).
2. Download **`sample_data_starter_pack.zip`** and extract it into the same folder.
3. Launch the `.exe` directly.

### Option 2: Build from Source

#### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://rustup.rs/) (2021/2024 edition)
- Windows 10 / 11 x64

#### Development Setup
```bash
# Clone the repository
git clone https://github.com/samuelchrist12/whatsapp-bulk-rust.git
cd whatsapp-bulk-rust

# Install sidecar dependencies
cd sidecar
npm install
cd ..

# Run in development mode
cargo tauri dev
```

#### Production Build
```bash
# Build optimized Rust binary
cargo build --release --manifest-path src-tauri/Cargo.toml

# Build full NSIS installer bundle
npx @tauri-apps/cli build --bundles nsis
```

---

## 🔒 Privacy & Safety Notice
- **100% Local Processing**: All contact numbers, spreadsheets, and attachments are processed strictly on your local computer. No customer data is ever sent to third-party cloud servers.
- **WhatsApp Terms Compliance**: This tool is designed for legitimate business notifications, customer service alerts, and announcements. Please adhere to WhatsApp's anti-spam regulations and obtain recipient consent.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">
  Crafted with precision by <a href="https://schrist.cyou"><strong>schrist.design</strong></a>
</div>
