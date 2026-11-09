# User Manual — Bulk WA Sender v1.0

**Desktop Bulk WhatsApp Broadcaster & Personalized Document Dispatcher for Windows 10/11**  
*Design & Engineering by [schrist.](https://schrist.cyou)*

---

## Table of Contents

1. [System Requirements & Installation](#1-system-requirements--installation)
2. [Linking Your WhatsApp Account (QR Code)](#2-linking-your-whatsapp-account-qr-code)
3. [Preparing Your Contact Spreadsheet & Column Mapping](#3-preparing-your-contact-spreadsheet--column-mapping)
4. [Sending Personalized File Attachments](#4-sending-personalized-file-attachments)
5. [Composing Messages, Dynamic Tags, Spintax & Anti-Ban Delays](#5-composing-messages-dynamic-tags-spintax--anti-ban-delays)
6. [Pre-Flight Verification, Test Dispatch & Audit CSV Export](#6-pre-flight-verification-test-dispatch--audit-csv-export)
7. [Troubleshooting & Frequently Asked Questions](#7-troubleshooting--frequently-asked-questions)

---

## 1. System Requirements & Installation

### Requirements
- **Operating System:** Windows 10 or Windows 11 (64-bit)
- **Browser Engine:** Microsoft Edge (pre-installed on Windows 10/11) or Google Chrome
- **External Runtimes:** None required. Both the Installer and Portable packages bundle the WhatsApp automation runtime directly inside the application.
- **Data Privacy:** All contact spreadsheets, attachments, and session files stay locally on your computer.

### Option A: Official Windows Installer (`Bulk_WA_Sender_v1.0.0_x64_Setup.exe`) — *Recommended*
1. Double-click `Bulk_WA_Sender_v1.0.0_x64_Setup.exe`.
2. Follow the setup wizard to completion.
3. Launch **Bulk WA Sender** from your Desktop shortcut or the Windows Start Menu.

### Option B: Portable Edition (`Bulk_WA_Sender_v1.0.0_x64_Portable.zip`) — *No Installation*
1. Right-click `Bulk_WA_Sender_v1.0.0_x64_Portable.zip` and choose **Extract All...** into a regular folder. Do not launch the `.exe` directly from inside a ZIP archive viewer.
2. Open the extracted folder and double-click `Bulk_WA_Sender_Portable.exe`.

> **Windows SmartScreen Note:** On first launch after downloading from the internet, Windows may show a *"Windows protected your PC"* prompt. Click **More info**, then click **Run anyway**.

### Automatic Clean Shutdown
Closing the application window (`✕`) stops all background engine and headless browser processes automatically so zero idle RAM is consumed after exit. Your linked WhatsApp session remains stored in `%LOCALAPPDATA%\BulkWASender` so you do not need to scan the QR code again next time.

---

## 2. Linking Your WhatsApp Account (QR Code)

1. Open **Bulk WA Sender**. On first launch, the gateway screen prepares the local engine and displays a QR Code.
2. Open **WhatsApp** on your mobile phone and ensure the phone has an active internet connection.
3. Open **Linked Devices**:
   - **Android:** Tap the three-dot menu (`⋮`) in the top-right corner > **Linked devices** > **Link a device**.
   - **iPhone (iOS):** Open **Settings** > **Linked Devices** > **Link a Device**.
4. Point your phone camera at the QR Code shown in the application window.
5. Once authenticated, the application transitions automatically to the main workspace and the top status pill turns green (**Connected**).

### Top Title Bar Controls
- **`ID | EN` Language Switch:** Switches the entire interface between Indonesian (`ID`) and English (`EN`) immediately without reloading.
- **Sun / Moon Theme Switch:** Toggles between Light Mode and Dark Mode.
- **Notification Bell:** Opens the slide-over history drawer showing past broadcast summaries and test dispatches.
- **`Switch Account` / `Reset Session`:** Logs out of the currently linked WhatsApp account and generates a fresh QR Code if you want to switch sender numbers.

---

## 3. Preparing Your Contact Spreadsheet & Column Mapping

1. At the top of the workspace, select your **Message Delivery Mode**:
   - **Text Message Only:** Sends personalized text messages without file attachments.
   - **Message + File Attachment:** Sends an individual document or image alongside your text caption to each recipient.
2. Inside the **Excel / CSV Contact File** card, choose how to load recipients:
   - Click **Download Template (.xlsx)** to save a ready-to-fill 2-sheet Excel workbook (*Contact List* and *Column Guide*). Phone number cells in this template are pre-formatted as Text (`@`) so Microsoft Excel preserves leading zeros (`0812...`).
   - Click **Sample Data (15)** to load the built-in 15 sample contacts for quick evaluation.
   - Drag and drop your `.xlsx`, `.xls`, `.xlsm`, or `.csv` file onto the dropzone (or click **Browse Computer**). If your workbook has multiple worksheets, pick the target sheet from the **Sheet** dropdown.

### Standard 8-Column Spreadsheet Layout

| Column Header | Requirement | Purpose & Example |
| :--- | :--- | :--- |
| `No` | Optional | Row sequence number (`1`, `2`, `3`). |
| `Name` (`Nama`) | **Required** | Recipient's name (referenced in messages via `{Name}` or `{Nama}`). |
| `Phone Number` (`Nomor Telepon`) | **Required** | Recipient's WhatsApp number (`08123456789`, `628123456789`, or `+62 812-3456-789`). Automatically normalized to country prefix `62`. |
| `Attachment File Name` (`Nama Lampiran File`) | Optional | Exact filename (e.g., `INV-2026-001.pdf`) when matching attachments from a spreadsheet column. |
| `City/Branch` (`Kota/Cabang`) | Optional | City, region, or office branch (`{City/Branch}`). |
| `Custom Column 1` – `3` (`Custom Kolom 1` – `3`) | Freely Editable | You may rename these headers to anything (`Role`, `Session Time`, `Voucher Code`, `Total Due`) or add extra columns beyond column 8. Uploaded header names appear verbatim in the table and as `+ {HeaderName}` pills in the composer. |

### What If My Phone Number Column Is in a Different Position?
You do **not** need to rearrange columns in your existing Excel file:
1. **Automatic Header Detection:** Regardless of whether your phone column sits in Column A, Column C, or Column H, the parser scans all header names first for common keywords (`Phone Number`, `Phone`, `Mobile`, `WhatsApp`, `WA`, `Nomor Telepon`, `No HP`, `HP`, `Telepon`).
2. **Manual Column Mapping Drawer:** If your spreadsheet uses an unconventional column title (such as `Destination`), click **Customize Column Mapping** right below the uploaded file box and select which column holds the **Name**, **Phone Number**, and optional **Attachment File Name**. The table and smartphone preview update immediately.

---

## 4. Sending Personalized File Attachments

When **Message + File Attachment** mode is selected, the **File Attachment Settings** card becomes active:

1. Click **Browse Folder** and select the directory on your computer containing your attachment files. Supported formats: `PDF`, `JPG`, `JPEG`, `PNG`, `WEBP`, `DOCX`, `XLSX`, `CSV`, `TXT`, and `ZIP`.
2. Choose a **Filename Matching Rule**:
   - **Match Recipient Name:** Matches files named after each contact's Name column (for example, recipient `Budi Santoso` matches `Budi Santoso.pdf` or `Budi Santoso.jpg`).
   - **Read from Excel Column:** Matches the exact filename listed in your mapped attachment column (for example, `INV-2026-001.pdf`).
3. Click **Scan** and verify the status badge in the top-right corner of the card:
   - **Green (`X / X Files Ready (100%)`):** Every contact was matched to an existing file on disk.
   - **Amber (`Y / X Files Ready`):** Some contacts are missing files; check rows marked `Not Found` in the Pre-Flight Table below.
   - **Red (`Folder Not Found`):** The specified folder path does not exist; click **Browse Folder** to pick a valid directory.

---

## 5. Composing Messages, Dynamic Tags, Spintax & Anti-Ban Delays

Type your message in the **Message Composer** card while checking the live **Message Preview** smartphone screen in the left pane. Use the contact dropdown and **Shuffle** button above the phone mockup to preview how different recipients and random phrase variations render.

### Dynamic Variables & Spintax Reference

| Tag Syntax | Rendered Output |
| :--- | :--- |
| `{Salam}` | Time-aware greeting based on your PC clock (*Good morning / Good afternoon / Good evening* in `EN`, or *Selamat Pagi / Siang / Sore / Malam* in `ID`). |
| `{Hello\|Hi\|Greetings}` | **Spintax:** Picks one option separated by vertical pipes (`\|`) at random for each recipient so outgoing messages vary naturally. |
| `{Name}`, `{City/Branch}`, `{YourHeader}` | Inserts the exact cell value from each recipient's row. |
| Currency columns (`{Total Due}`, `{Amount Due}`, `{Salary}`, `{Nominal}`, `{Tagihan}`, `{Harga}`, `{Gaji}`) | Numeric values in explicitly named monetary columns are formatted automatically as Indonesian Rupiah (`Rp 1.500.000`). Non-monetary custom columns are left untouched as plain text. |
| `*bold*`, `_italic_`, `~strikethrough~` | Standard WhatsApp text formatting markers work directly inside the template. |

### Anti-Ban Delay & Batch Cooldown Settings
Sending hundreds of identical messages without pauses increases the risk of WhatsApp rate-limiting or flagging your number. Configure pacing in the toolbar above the composer:
- **Random Jitter Delay (default `3` to `7` sec):** Waits a randomized duration between consecutive messages.
- **Batch Cooldown (default enabled — every `20` messages, pause `60` sec):** Adds a longer rest interval after each batch. For lists exceeding 100 contacts, keep **Cooldown** enabled and consider raising the random delay to `5`–`12` seconds.

---

## 6. Pre-Flight Verification, Test Dispatch & Audit CSV Export

1. **Inspect the Pre-Flight Table:** Scroll to the **Recipient List & Pre-Flight Verification** table at the bottom of the workspace.
   - Only checked rows are included in the broadcast.
   - Filter recipients quickly via the search box or status dropdown (`All Contacts`, `Valid Numbers Only`, `With Attachment Only`, `Failed Contacts Only`).
   - In attachment mode, rows with missing files (`Not Found`) are skipped automatically so recipients never receive a caption missing its promised document.
2. **Send 1 Test Message:** Enter your own WhatsApp number in the **Test Send 1 Message** box and click **Send Test**. Confirm on your phone that text formatting, dynamic tags, and attachments look right before launching the full batch.
3. **Run & Control the Broadcast:** Click **Start Broadcast (X Contacts)**. While active, monitor live counters (`Sent`, `Failed`, `Total`) and the **Real-Time Activity Log**. You can **Pause**, **Resume**, or **Stop** the queue at any point.
4. **Download Audit CSV & Retry Failures:** When the queue finishes, the summary modal displays total sent, failed, and elapsed time.
   - Click **Download Report (.csv)** to save a complete timestamped delivery report via a native Save-As dialog.
   - If any numbers failed, click **Retry Failed Contacts** to re-queue only the failed rows without sending duplicates to recipients who already succeeded.

---

## 7. Troubleshooting & Frequently Asked Questions

- **Microsoft Excel stripped the leading `0` from my phone numbers (`8123456789` instead of `08123456789`). Will messages still go through?**  
  Yes. The phone normalizer automatically converts `8...` Indonesian mobile numbers to `628...`. To keep leading zeros visible in Excel, start from **Download Template (.xlsx)** or prefix cell entries with an apostrophe (`'0812...`).
- **The Portable `.exe` shows a missing DLL or runtime error on launch.**  
  Extract the entire `.zip` archive into a standard folder first, and keep `Bulk_WA_Sender_Portable.exe` inside the same folder alongside `WebView2Loader.dll` and the `runtime/` directory.
- **The screen stays on "Connecting to WhatsApp Engine..." or the QR code does not appear.**  
  Verify your PC has an active internet connection and either Microsoft Edge or Google Chrome installed. Click **Refresh QR** / **Reset Session**, or close and reopen the app.
- **Does my phone need to stay unlocked during a broadcast?**  
  No. Once linked via WhatsApp Multi-Device, dispatches run directly from your PC as long as the PC has internet access. Just open WhatsApp on your phone at least once every 14 days so WhatsApp does not expire the linked device session.

---

*Crafted by **schrist.** (https://schrist.cyou)*
