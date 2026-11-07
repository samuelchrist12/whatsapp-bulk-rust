# 📋 Dokumen Analisis Mendalam & Roadmap Pengembangan
## **Aplikasi Bulk WA Sender (v2.0 Rust Core & Modern Desktop)**
**Analisis Arsitektur, Evaluasi Kode, dan Rencana Pengembangan Strategis**  
*Dipersiapkan untuk Tim Rekayasa & Pengembangan Swapro*

---

## 📌 1. Ringkasan Eksekutif (Executive Summary)

**Bulk WA Sender** adalah aplikasi desktop modern untuk pengiriman pesan massal (*broadcast*) WhatsApp yang dirancang untuk mendukung operasional bisnis secara cepat, terpersonalisasi, dan aman. Berawal dari kebutuhan internal otomasi pengiriman slip gaji karyawan dan penagihan invoice di lingkungan Swapro, aplikasi ini telah berevolusi menjadi platform penyiaran pesan universal dengan arsitektur hibrida berkinerja tinggi.

### Inti Kemampuan Saat Ini:
1. **Dua Mode Siaran Utama**: Pengiriman *Pesan Teks Saja* (pengumuman, notifikasi, promosi cepat) dan *Pesan + Lampiran File* (dokumen `.pdf`, `.docx`, `.xlsx`, `.zip`, serta gambar `.jpg`, `.png`, `.webp`).
2. **Pencocokan Lampiran Cerdas (*Smart Attachment Matching*)**:
   - *Metode 1 (Berdasarkan Nama Penerima)*: Mencocokkan nama file dengan nama penerima secara cerdas (toleran terhadap tanda baca `_`, `-`, spasi, dan kapitalisasi).
   - *Metode 2 (Berdasarkan Kolom Excel)*: Mengambil nama file langsung dari kolom spreadsheet (misalnya nomor invoice atau nama file lampiran).
3. **Simulasi WhatsApp Realtime (*Smartphone Mockup Frame*)**: Pratinjau WYSIWYG interaktif menyerupai aplikasi WhatsApp asli lengkap dengan bubble chat, waktu kirim, status centang, kartu lampiran dinamis, dan formatting otomatis mata uang Rupiah (`Rp XX.XXX.XXX`).
4. **Perlindungan Anti-Banned Dasar**: Algoritma jeda acak (*random jitter delay*) 3–7 detik dan mekanisme jeda/lanjutkan/hentikan (*pause/resume/stop*) interaktif.
5. **Dukungan Dataset Dummy Bersih**: Dilengkapi 15 kontak fiktif Indonesia beserta file lampiran siap uji.

---

## 🏗️ 2. Analisis Arsitektur Sistem Saat Ini

Aplikasi ini mengadopsi arsitektur tiga lapis (*three-tier hybrid architecture*):

```
┌─────────────────────────────────────────────────────────────┐
│                 LAPISAN ANTARMUKA (FRONTEND)                │
│  - HTML5, Vanilla JavaScript (ES6+), Modern Dark CSS        │
│  - Simulasi Smartphone Mockup & Dynamic Tag Interpolator    │
│  - Tabel Pre-Flight Verification & CSV Rekap Exporter       │
└──────────────┬──────────────────────────────┬───────────────┘
               │ (Mode Tauri IPC)             │ (REST API HTTP :3847)
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      NATIVE RUST CORE        │ │   WHATSAPP ENGINE SIDECAR  │
│      (Tauri v2 Shell)        │ │      (Node.js Puppeteer)   │
│                              │ │                            │
│ • calamine: Parser Excel/CSV │ │ • Express API Server       │
│ • walkdir: Scanner Folder    │ │ • whatsapp-web.js          │
│ • regex: Phone Normalizer    │ │ • LocalAuth Session Multi- │
│ • JSON Prefs Persistence     │ │   Device + Auto QR Code    │
│                              │ │ • Broadcast Queue Engine   │
└──────────────────────────────┘ └────────────────────────────┘
```

### 2.1. Lapis 1: Frontend UI (`ui/`)
* **`index.html`**: Antarmuka terstruktur rapi dengan semantik HTML5, pembagian seksi alur kerja (Pilih Mode ➔ Sumber Data & Mapping ➔ Komposer & Simulasi Mockup ➔ Kontrol Eksekusi ➔ Tabel Pre-Flight).
* **`style.css`**: Desain kustom berstandar tinggi berbasis palet *Obsidian Dark Theme* (`#080C14`, `#0F172A`), aksen Emerald WhatsApp (`#10B981`), tipografi modern (*Plus Jakarta Sans* & *JetBrains Mono*), serta tata letak responsif.
* **`app.js`**: Pengontrol logika antarmuka yang mengelola state data kontak, filtering real-time, seleksi baris kontak, pemindaian lampiran, pemformatan template dinamis, dan polling berkala terhadap status WhatsApp engine sidecar.

### 2.2. Lapis 2: Native Rust Core (`src-tauri/`)
* **`excel.rs`**: Memanfaatkan *crate* `calamine` untuk membaca file spreadsheet (`.xlsx`, `.xls`, `.csv`) tanpa ketergantungan pada runtime Node.js atau Microsoft Excel eksternal. Mampu mendeteksi daftar sheet, mengekstrak header baris pertama, dan menghasilkan array objek JSON secara instan.
* **`attachment.rs`**: Memanfaatkan *crate* `walkdir` untuk mengindeks direktori file hingga kedalaman 2 sub-folder. Menggunakan algoritma normalisasi string (menghapus karakter khusus, spasi, dan *case-folding*) untuk mencocokkan dokumen dengan data kontak secara akurat.
* **`lib.rs` & `main.rs`**: Mendefinisikan IPC handlers (`cmd_read_excel`, `cmd_scan_attachments`, `cmd_format_phone`, `cmd_save_preferences`, `cmd_load_preferences`) yang menjembatani Rust dengan WebView.

### 2.3. Lapis 3: WhatsApp Engine Sidecar (`sidecar/server.js`)
* Berjalan sebagai proses *background* lokal pada port `3847` berbasis Express.js.
* Mengintegrasikan pustaka `whatsapp-web.js` dan Puppeteer headless yang otomatis mendeteksi browser Chromium atau Microsoft Edge bawaan sistem operasi Windows pengguna.
* Mengelola sesi autentikasi (*Multi-Device Session*) dengan persistensi folder `.wa_session` dan pembersihan kunci file (*lockfile*) sisa secara otomatis.
* Menjalankan antrean broadcast non-blocking dengan jeda dinamis, pelaporan progres pengiriman real-time, serta penanganan error per kontak.

---

## 🔍 3. Temuan Kritis & Evaluasi Kode (Critical Findings)

Berdasarkan hasil analisis mendalam terhadap kode sumber dan berkas konfigurasi, ditemukan beberapa poin kritis yang perlu disempurnakan:

### ⚠️ Temuan 1: Pemisahan Modus Eksekusi (*Hybrid Decoupling*)
* **Kondisi**: File `Jalankan_Aplikasi.bat` saat ini meluncurkan antarmuka menggunakan Microsoft Edge / Google Chrome dalam mode *application window* (`--app="file:///...ui/index.html"`), bukan mengeksekusi binary kompilasi Tauri (`bulk-wa-sender.exe`).
* **Dampak**: Ketika antarmuka dibuka via browser eksternal, objek `window.__TAURI__` tidak terdefinisi (`isTauriEnv = false`). Akibatnya, pemanggilan fungsi Rust berkinerja tinggi (`cmd_read_excel` dan `cmd_scan_attachments`) dialihkan (*fallback*) ke data tiruan (*mockup in-memory*) di `app.js`.

### ⚠️ Temuan 2: Ketergantungan Eksternal Folder (*Cross-Folder Dependency*)
* **Kondisi**: Pada `sidecar/server.js` baris ke-10, terdapat dependensi absolut/relatif ke luar folder aplikasi:
  ```javascript
  const { Client, LocalAuth, MessageMedia } = require(path.resolve(__dirname, '..', '..', '04_Scripts_dan_Generator', 'node_modules', 'whatsapp-web.js'));
  ```
* **Dampak**: Jika folder `Bulk_WA_Rust` dipindahkan ke komputer lain atau didistribusikan sebagai arsip mandiri tanpa menyertakan folder `04_Scripts_dan_Generator`, sidecar akan gagal beroperasi (*Module Not Found Error*).

### ⚠️ Temuan 3: Keterbatasan Pengunggahan Excel pada Mode Browser Standalone
* **Kondisi**: Pada mode web biasa (`file:///`), browser memblokir akses ke path absolut lokal (`file.path` bernilai kosong atau tidak dapat diakses di Chromium modern demi alasan keamanan sandbox).
* **Dampak**: Pengguna tidak dapat memuat file Excel milik mereka sendiri jika aplikasi dijalankan tanpa runtime Tauri, kecuali disematkan pustaka pembaca Excel client-side (seperti `xlsx / SheetJS`) langsung di frontend.

### ⚠️ Temuan 4: Penyimpanan State Bersifat Sementara (*In-Memory State*)
* **Kondisi**: Riwayat pengiriman, progres broadcast, dan status per kontak saat ini hanya tersimpan di memori variabel runtime `broadcastState` pada `server.js` dan `contactsData` di `app.js`.
* **Dampak**: Jika aplikasi ditutup, listrik padam, atau browser di-refresh di tengah-tengah broadcast 500 kontak, riwayat penerima yang sudah sukses terkirim dan yang belum terkirim akan hilang dari tampilan layar, menyulitkan proses resume.

### ⚠️ Temuan 5: Proteksi Akun WhatsApp Tingkat Lanjut (*Advanced Anti-Banned*)
* **Kondisi**: Algoritma jeda saat ini sudah sangat baik dengan *random jitter* 3–7 detik. Namun, teks pesan yang dikirim ke ratusan penerima memiliki struktur yang identik (kecuali variabel placeholder).
* **Dampak**: Sistem deteksi spam WhatsApp berpotensi menandai pesan berulang dengan format kalimat identik sebagai aktivitas robotik jika dikirim dalam volume besar (>100 kontak sekaligus).

### 🛠️ Temuan 6: Isu Kompilasi Linker Windows GNU (Export Ordinal Limit > 65.535) — *Terselesaikan*
* **Kondisi**: Pada konfigurasi bawaan `src-tauri/Cargo.toml`, didefinisikan `crate-type = ["staticlib", "cdylib", "rlib"]`. Pada lingkungan Windows dengan toolchain MinGW/GCC (`x86_64-pc-windows-gnu`), proses kompilasi binary Tauri v2 sempat gagal dengan pesan: `ld.exe: error: export ordinal too large: 100902` karena batas maksimal simbol ekspor DLL pada format Windows PE adalah 65.535.
* **Solusi yang Diterapkan**: Mengubah `crate-type = ["rlib"]` untuk target desktop Windows murni. Binary aplikasi desktop `src-tauri/target/debug/app.exe` kini **berhasil dikompilasi secara sempurna (100% build pass)**.

---

## 🗺️ 4. Rencana & Roadmap Pengembangan Terpadu

Rencana pengembangan disusun ke dalam 4 fase strategis dengan prinsip modular, stabil, dan minim risiko regresi:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ROADMAP PENGEMBANGAN                            │
├───────────────────┬───────────────────┬───────────────────┬────────────┤
│      FASE 1       │      FASE 2       │      FASE 3       │   FASE 4   │
│   Stabilisasi &   │   Fitur Anti-Ban  │ Multi-Template &  │  Database, │
│    Portabilitas   │     & Spintax     │   Retry Otomatis  │ Scheduler  │
│     (Pondasi)     │  (Keamanan Akun)  │ (Produktivitas)   │ & Multi-No │
└───────────────────┴───────────────────┴───────────────────┴────────────┘
```

---

### 🚀 FASE 1: Stabilisasi Arsitektur & Portabilitas Mandiri (Prioritas: P0)
*Target: Menjadikan aplikasi 100% mandiri (*portable*), dapat dijalankan di komputer manapun tanpa instalasi manual yang rumit.*

1. **Lokalisasi Dependensi Node.js**:
   - Menambahkan berkas `sidecar/package.json` mandiri yang mencakup `express`, `qrcode`, dan `whatsapp-web.js`.
   - Mengubah impor di `server.js` menjadi `require('whatsapp-web.js')` standar lokal.
2. **Kompilasi & Integrasi Binary Tauri Native**:
   - Menyiapkan target build release Tauri (`bulk-wa-sender.exe`).
   - Mengintegrasikan plugin dialog native Tauri (`@tauri-apps/plugin-dialog`) agar pemilihan file Excel dan folder lampiran menggunakan jendela file explorer Windows asli yang mengembalikan path absolut sistem.
3. **Penyediaan Client-Side Excel Fallback (SheetJS)**:
   - Menambahkan `xlsx.full.min.js` lokal di folder `ui/assets/` sehingga jika aplikasi dijalankan via browser portabel (Edge mode), pengguna tetap dapat membuka file Excel apapun tanpa kendala path sandbox.
4. **Pembaruan Launcher `Jalankan_Aplikasi.bat`**:
   - Memeriksa ketersediaan binary `src-tauri/target/release/bulk-wa-sender.exe`. Jika tersedia, jalankan aplikasi Tauri asli; jika tidak, jalankan mode browser Edge/Chrome secara transparan.

---

### 🛡️ FASE 2: Peningkatan Fitur Anti-Banned & Personalisasi (Prioritas: P0)
*Target: Memaksimalkan keamanan nomor pengirim agar terhindar dari pemblokiran WhatsApp saat mengirim volume besar.*

1. **Implementasi Variasi Teks Cerdas (*Spintax Support*)**:
   - Mendukung format spintax di template pesan:
     ```text
     {Halo|Selamat Pagi|Salam hangat} Rekan {Nama Lengkap},
     {Berikut kami sampaikan|Berikut ini adalah|Terlampir} informasi tagihan Anda...
     ```
   - Generator akan memilih salah satu kata acak untuk setiap penerima sehingga tidak ada dua pesan yang 100% identik di server WhatsApp.
2. **Aturan Pengelompokan & Istirahat Berkala (*Batching & Cool-Down Delay*)**:
   - Menambahkan opsi konfigurasi: *"Kirim dalam batch X pesan, lalu istirahat Y menit"*.
   - Contoh: Kirim 25 pesan ➔ Istirahat 3 menit ➔ Lanjut 25 pesan berikutnya.
3. **Pemberian Salam Sesuai Waktu (*Time-Aware Greeting*)**:
   - Placeholder otomatis `{Salam}` yang mengembalikan `"Selamat Pagi"`, `"Selamat Siang"`, atau `"Selamat Sore"` berdasarkan jam komputer lokal saat pesan dikirim.
4. **Deteksi Nomor Terdaftar WhatsApp Sebelum Mengirim (*Pre-Flight Number Validation*)**:
   - Memanfaatkan fungsi `waClient.isRegisteredUser(chatId)` untuk memfilter nomor yang tidak memiliki akun WhatsApp sebelum pesan dieksekusi, mencegah log kegagalan beruntun.

---

### ⚡ FASE 3: Fleksibilitas Pengelolaan Pesan & Recovery (Prioritas: P1)
*Target: Meningkatkan kenyamanan pengguna dan penanganan jika terjadi kegagalan transmisi.*

1. **Pengelola Banyak Template (*Multi-Template Manager*)**:
   - Menyediakan fitur simpan, beri nama, dan muat template pesan (contoh: *"Slip Gaji Karyawan"*, *"Invoice Vendor WOM"*, *"Pengumuman Internal"*, *"Reminder Jatuh Tempo"*).
   - Penyimpanan template lokal secara otomatis.
2. **Mekanisme Kirim Ulang Otomatis (*Auto-Retry Failed Contacts*)**:
   - Menambahkan tombol *"Kirim Ulang Kontak Gagal Saja"* pada tabel dan progress bar.
   - Mengeliminasi kebutuhan menyaring atau menghapus data kontak yang sudah sukses secara manual.
3. **Filter Grouping Kontak Dinamis**:
   - Filter tabel berdasarkan kolom spreadsheet yang terbaca (misal: filter berdasarkan `Kota Cabang` = *"Surabaya"*, atau `Status` = *"Aktif"*).
4. **Validasi Batasan Ukuran Dokumen (*File Size Guard*)**:
   - Pengecekan otomatis sebelum broadcast: jika ukuran lampiran melebihi 100 MB (batas dokumen WhatsApp) atau gambar melebihi 16 MB, beri peringatan visual di tabel.

---

### 📊 FASE 4: Database Riwayat, Penjadwalan & Multi-Akun (Prioritas: P2)
*Target: Pengelolaan tingkat lanjut untuk kebutuhan operasional skala korporat.*

1. **Penyimpanan Riwayat Broadcast (*SQLite Local History*)**:
   - Menyimpan seluruh riwayat siaran ke database lokal ringan: ID broadcast, tanggal/waktu, judul template, jumlah sukses, jumlah gagal, dan log detail per nomor.
   - Kemampuan melihat kembali laporan pengiriman minggu lalu atau bulan lalu kapan saja.
2. **Penjadwalan Pengiriman (*Broadcast Scheduler*)**:
   - Menentukan jadwal waktu pengiriman (misal: kirim otomatis besok pukul 08:30 WIB).
3. **Dukungan Multi-Sesi Akun (*Multi-Account Switcher*)**:
   - Kemampuan menyimpan profil lebih dari 1 nomor WhatsApp (misal: *"Nomor Finance / Payroll"* dan *"Nomor HRD / Rekrutmen"*), serta berpindah akun hanya dengan 1 klik tanpa perlu scan ulang.
4. **Metode Tautkan Menggunakan Kode Pairing (*8-Digit Pairing Code*)**:
   - Alternatif scan QR Code: pengguna cukup memasukkan nomor HP dan aplikasi menampilkan 8 digit kode pairing untuk dimasukkan di WhatsApp ponsel. Fitur ini sangat bermanfaat jika kamera ponsel buram atau pengguna mengoperasikan server dari jarak jauh.

---

## 📊 5. Matriks Prioritas & Estimasi Dampak

| ID | Modul / Fitur | Kategori | Tingkat Urgensi | Estimasi Usaha | Dampak Bisnis / Pengguna |
|:---|:---|:---:|:---:|:---:|:---|
| **P0-1** | Lokalisasi dependensi `sidecar/package.json` | Arsitektur | **Tinggi (Kritis)** | 0.5 Hari | Aplikasi mandiri & tidak rentan path rusak |
| **P0-2** | Pustaka `xlsx` client-side di UI | Aksesibilitas | **Tinggi (Kritis)** | 0.5 Hari | User bisa buka Excel di mode browser biasa |
| **P0-3** | Fitur Spintax `{Kata1\|Kata2}` | Anti-Banned | **Tinggi (Kritis)** | 1 Hari | Menghindarkan akun WhatsApp dari pemblokiran |
| **P1-1** | Fitur "Kirim Ulang Hanya Yang Gagal" | UX / Operasional | **Sedang** | 1 Hari | Menghemat waktu tim operasional jika ada kendala koneksi |
| **P1-2** | Multi-Template Manager (Simpan/Pilih Format) | Produktivitas | **Sedang** | 1 Hari | Pengguna tidak perlu mengetik ulang template pesan |
| **P1-3** | Filter Grouping Kontak per Cabang/Kategori | Data Pre-Flight | **Sedang** | 0.5 Hari | Fleksibilitas pengiriman tersegmentasi |
| **P2-1** | Database Riwayat Pengiriman (SQLite) | Audit & Rekap | **Rendah** | 2 Hari | Arsip pengiriman tersimpan permanen |
| **P2-2** | Tautkan WhatsApp via 8-Digit Pairing Code | Koneksi WA | **Rendah** | 1.5 Hari | Solusi jika kamera smartphone tidak dapat scan QR |
| **P2-3** | Penjadwalan Broadcast Otomatis | Otomasi | **Rendah** | 2 Hari | Pengiriman dapat disiapkan di luar jam kerja |

---

## 💻 6. Panduan Implementasi Teknis & Contoh Kode

### 6.1. Algoritma Parser Spintax (Untuk `ui/app.js` & `server.js`)
Fungsi JavaScript ringan untuk mengevaluasi teks acak berulang:

```javascript
/**
 * Mengevaluasi spintax bertingkat, contoh: "{Halo|Hai|Selamat {pagi|siang}}"
 */
function parseSpintax(text) {
  const spintaxRegex = /\{([^{}]+)\}/g;
  let matches;
  while ((matches = spintaxRegex.exec(text)) !== null) {
    const options = matches[1].split('|');
    const chosen = options[Math.floor(Math.random() * options.length)];
    text = text.replace(matches[0], chosen);
    spintaxRegex.lastIndex = 0; // reset pointer untuk spintax bersarang
  }
  return text;
}
```

### 6.2. Struktur `package.json` Mandiri untuk `sidecar/`
Membuat `Bulk_WA_Rust/sidecar/package.json` terisolasi:

```json
{
  "name": "bulk-wa-sidecar",
  "version": "2.0.0",
  "description": "WhatsApp Engine Sidecar for Bulk WA Sender",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "qrcode": "^1.5.3",
    "whatsapp-web.js": "^1.26.0"
  }
}
```

### 6.3. Fallback Parser Spreadsheet di Frontend (`ui/app.js`)
Menyematkan pembacaan file lokal dengan `FileReader` dan `XLSX` jika dijalankan di luar Tauri:

```javascript
function parseExcelInBrowser(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    const headers = Object.keys(jsonRows[0] || {});
    
    currentExcelMeta = {
      file_name: file.name,
      sheets: workbook.SheetNames,
      active_sheet: sheetName,
      headers: headers
    };
    applyExcelDataToUI(currentExcelMeta, jsonRows);
  };
  reader.readAsArrayBuffer(file);
}
```

---

## 🏁 7. Kesimpulan & Rekomendasi Langkah Selanjutnya

Aplikasi **Bulk WA Sender (v2.0)** saat ini telah memiliki fondasi desain visual dan fungsionalitas inti yang sangat solid:
- Desain antarmuka Obsidian Dark UI sangat elegan, intuitif, dan responsif.
- Fitur simulasi WhatsApp mockup live memberikan rasa percaya diri (*confidence*) tinggi bagi pengguna sebelum menekan tombol kirim.
- Logika pencocokan lampiran dinamis di Rust (`attachment.rs`) telah dirancang sangat pintar dan toleran.

**Langkah Implementasi yang Direkomendasikan Segera:**
1. **Langkah 1**: Buat direktori paket mandiri di `sidecar/` agar aplikasi tidak lagi bergantung pada folder luar `04_Scripts_dan_Generator`.
2. **Langkah 2**: Tambahkan pustaka SheetJS di antarmuka frontend agar pengguna dapat mengunggah file Excel pribadi secara instan dalam modus apapun.
3. **Langkah 3**: Integrasikan algoritma Spintax di komposer pesan untuk menjamin keamanan nomor WhatsApp pengguna dari risiko banned saat melakukan broadcast skala besar.

---
*Dokumen ini disusun sebagai acuan teknis pengembangan dan peningkatan kualitas berkelanjutan untuk proyek Bulk WA Sender Swapro.*

