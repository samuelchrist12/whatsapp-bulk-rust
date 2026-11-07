# 🌟 Panduan Lengkap: Bulk WA Sender
**Design & Engineering by schrist.design**

Selamat datang di **Bulk WA Sender**, aplikasi pengiriman pesan WhatsApp massal (*broadcast*) modern berbasis arsitektur **Rust Core** dan antarmuka berstandar tinggi.

---

## 🚀 Fitur Unggulan

1. **Fokus Utama: Bulk WhatsApp Broadcaster**
   * Pengiriman pesan massal teks murni super cepat untuk pengumuman, promosi, reminder tagihan, dan notifikasi.
   * Interpolasi placeholder dinamis otomatis (`{Nama Lengkap}`, `{Nomor Invoice}`, `{Kota Cabang}`, `{Nominal Tagihan}`).
2. **Fitur Tambahan: Multi-Format Dynamic File Attachment**
   * Dukungan pengiriman lampiran dokumen (`.pdf`, `.docx`, `.xlsx`, `.zip`, `.csv`) dan gambar (`.jpg`, `.png`, `.webp`).
   * **Dua Aturan Pencocokan File Cerdas:**
     * *Aturan 1 (Berdasarkan Nama Penerima):* Otomatis mencari file dengan nama yang sama dengan nama penerima (`[Nama_Penerima].[ext]`).
     * *Aturan 2 (Berdasarkan Kolom Excel):* Mengambil nama file dari salah satu kolom Excel Anda (misal kolom `File Lampiran` atau `Nomor Invoice`).
3. **Simulasi WhatsApp Realtime (Smartphone Mockup):**
   * Pratinjau langsung tampilan bubble chat, dokumen lampiran, dan format mata uang Rupiah secara live sebelum dikirim.
4. **Perlindungan Anti-Banned:**
   * Algoritma jeda acak (*random jitter delay*) 3–7 detik dan simulasi perilaku manusia.
5. **Ekspor Laporan Broadcast:**
   * Download rekap hasil pengiriman ke format spreadsheet `.csv` dengan status pengiriman per kontak.
6. **100% Data Dummy Bersih:**
   * Dilengkapi dataset contoh 15 kontak fiktif Indonesia dan file lampiran contoh untuk simulasi instan tanpa khawatir kebocoran data.

---

## ⚡ Cara Menjalankan Aplikasi

1. Buka folder `Bulk_WA_Rust`.
2. Klik dua kali file:
   👉 **`Jalankan_Aplikasi.bat`**
3. Jendela aplikasi desktop akan terbuka secara otomatis.

---

## 📖 Tutorial Alur Kerja Cepat

### 1. Hubungkan Akun WhatsApp
* Di pojok kanan atas, klik tombol **"Hubungkan WA"**.
* Jika status meminta scan, arahkan kamera WhatsApp di ponsel Anda ke QR Code yang muncul di layar.
* Status akan berubah menjadi hijau `🟢 Terhubung`.

### 2. Tentukan Mode Pengiriman
* Pilih **"Pesan Teks Saja"** jika Anda hanya ingin mengirim pesan teks broadcast cepat.
* Pilih **"Pesan + Lampiran File"** jika ingin melampirkan file dokumen atau gambar ke setiap penerima.

### 3. Unggah File Kontak Excel / CSV
* Tarik dan lepas file Excel Anda ke area dropzone, atau klik tombol **"⚡ Gunakan Data Contoh (15 Kontak)"** untuk mencoba dataset dummy yang sudah disediakan.
* Pilih sheet yang diinginkan.
* Sesuaikan pemetaan kolom jika nama judul kolom di file Anda berbeda.

### 4. Sesuaikan Format Pesan & Uji Coba
* Susun pesan pada kotak teks dan klik tag tombol di atasnya untuk menyisipkan variabel dinamis.
* Masukkan nomor WhatsApp pribadi Anda di kotak **Uji Coba Kirim** lalu klik **"Kirim Uji Coba"** untuk memastikan hasil pesan dan lampiran sudah sesuai.

### 5. Mulai Broadcast
* Centang kontak yang ingin dikirimi pesan di tabel bawah.
* Klik tombol besar: **"🚀 Mulai Kirim Broadcast"**.
* Pantau prosesnya melalui progress bar dan log aktivitas realtime.
* Setelah selesai, klik **"Download Laporan Rekap (.csv)"** untuk menyimpan arsip pengiriman.

---

*Crafted with precision by **schrist.design***
