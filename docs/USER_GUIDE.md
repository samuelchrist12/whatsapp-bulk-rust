# 📘 User Guide: Bulk WA Sender v1.0
**Design & Engineering by schrist.design**

Welcome to **Bulk WA Sender**, an ultra-fast, modern bulk WhatsApp messaging and file dispatching desktop application built with a **Tauri v2 Rust Core** and Obsidian Emerald Material Design 3 UI.

---

## 🚀 Key Features

1. **Ultra-Fast WhatsApp Broadcast Engine**
   - High-throughput text dispatching powered by Rust memory safety and asynchronous event loops.
   - Dynamic tag interpolation: `{Full Name}`, `{Invoice Number}`, `{Branch City}`, `{Total Due}`, `{Salutation}`.
2. **Multi-Format Dynamic File Attachments**
   - Send individualized documents (`.pdf`, `.docx`, `.xlsx`, `.zip`, `.csv`) and images (`.jpg`, `.png`, `.webp`) at scale.
   - **Two Intelligent File Matching Strategies:**
     - *By Recipient Name:* Automatically locates files matching `[Recipient_Name].[ext]`.
     - *By Column Mapping:* Reads filenames dynamically from any specified Excel/CSV column (e.g. `Invoice_No` or `Attachment_File`).
3. **Real-time Live WhatsApp Smartphone Preview**
   - Interactive smartphone simulator with authentic WhatsApp chat bubbles, media attachment cards, and formatted currency.
4. **Smart Anti-Ban Protection**
   - Natural humanized jitter delays (3–7 seconds) and background session keep-alive.
5. **Comprehensive Reporting & Audit Trail**
   - Instant dispatch statistics with detailed breakdown by delivery status.
   - Export full dispatch logs to Excel/CSV with one click.
6. **100% Clean Sample Datasets**
   - Pre-packaged with 15 mock contacts and sample attachments for out-of-the-box evaluation.

---

## ⚡ Quick Start

### Running from Pre-built Executable
1. Download `Bulk_WA_Sender_v1.0.0_x64_Setup.exe` (Installer) or `Bulk_WA_Sender_v1.0.0_x64_Portable.exe` (Standalone) from GitHub Releases.
2. Run the application directly.
3. The desktop client connects automatically to the background WhatsApp engine.

### Running from Source / Scripts
1. Run `npm install` inside the `sidecar/` directory if running from source.
2. Double-click:
   👉 **`Run_Application.bat`**
3. The desktop client will start automatically.

---

## 📖 Step-by-Step Workflow

### 1. Connect WhatsApp Account
- In the top-right title bar, click **"Connect WA"** (`Hubungkan WA`).
- If prompted, scan the on-screen QR Code using WhatsApp on your mobile phone (**Linked Devices** > **Link a Device**).
- The status pill will switch to `🟢 Connected` (`Terhubung`).

### 2. Choose Broadcast Mode
- Select **"Text Mode"** for pure text broadcasting (promotions, announcements, reminders).
- Select **"File Attachment Mode"** to send personalized invoices, receipts, or contracts to each recipient.

### 3. Download Template or Load Contacts
- Click **"Download Template (.xlsx)"** to save a ready-to-edit Excel file (`No`, `Name`/`Nama`, `Phone Number`/`Nomor Telepon`, `Attachment File Name`/`Nama Lampiran File`, `City/Branch`/`Kota/Cabang`, `Custom Column 1–3`/`Custom Kolom 1–3`). You may freely rename the custom column headers to match your data (e.g., `Role`, `Event Session`, `Voucher Code`) — uploaded header names are detected automatically!
- Drag and drop your `.xlsx` or `.csv` file onto the dropzone, or click **"⚡ Load Demo Data (15)"** to try the pre-loaded 15 contacts.
- Select your target sheet and verify column mapping if needed.

### 4. Compose & Test Message
- Type your message template in the composer and click any variable pill to insert dynamic tags.
- Use Spintax syntax like `{Selamat Pagi|Selamat Siang|Halo}` or `{Good morning|Good afternoon|Hello}` for varied greetings.
- Enter your test phone number in the **Send Test Message** box and send a preview.

### 5. Launch Broadcast
- Select contacts using the table checkboxes.
- Click **"🚀 Start Broadcast"** (`Mulai Kirim Broadcast`).
- Watch live delivery progress in the progress bar and real-time terminal log.
- When finished, review the M3 summary modal and download the delivery report.

---

*Crafted with precision by **schrist.design** (https://schrist.cyou)*

