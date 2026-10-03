# Panduan Deploy Aplikasi NAWATIGA ke Vercel (vercel.app)

Aplikasi telah dikonfigurasi penuh agar dapat berjalan secara serverless di **Vercel** (`https://[nama-aplikasi].vercel.app`), lengkap dengan antarmuka React Vite dan seluruh backend API Express (`/api/*`).

---

## File Konfigurasi yang Telah Dibuat:
1. `vercel.json`: Mengatur build command (`npm run build`), output folder (`dist`), rewrite rule untuk API `/api/*` dan SPA routing untuk browser.
2. `api/index.ts`: Entry point Serverless Function Vercel yang menjalankan server Express.
3. `.vercelignore`: Mencegah upload file yang tidak perlu agar build cepat dan ringan.

---

## Cara Deploy ke Vercel (Pilih Salah Satu Metode)

### Metode 1: Lewat Dashboard Vercel & GitHub (Paling Mudah & Otomatis)
1. Simpan/Push source code proyek ini ke akun **GitHub** Anda.
2. Buka [https://vercel.com](https://vercel.com) dan login.
3. Klik tombol **"Add New..."** -> **"Project"**.
4. Pilih repository GitHub kafe Anda dan klik **"Import"**.
5. Pada bagian **Build and Output Settings**, Vercel akan otomatis mendeteksi:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. (Opsional) Pada bagian **Environment Variables**, tambahkan:
   - `GEMINI_API_KEY`: *(API Key Gemini untuk fitur asisten AI kafe)*
7. Klik tombol **"Deploy"**.
8. Dalam waktu ~1-2 menit, aplikasi Anda sudah live online dengan domain gratis seperti:
   `https://nawatiga-coffee.vercel.app`

---

### Metode 2: Deploy Lewat Vercel CLI (Terminal)
Jika Anda menggunakan komputer lokal:
1. Buka terminal pada folder proyek.
2. Jalankan perintah:
   ```bash
   npx vercel
   ```
3. Ikuti panduan di layar:
   - Set up and deploy? Ketik `y`
   - Link to existing project? Ketik `n`
   - Project name: misalnya `nawatiga-coffee`
   - In which directory is your code located? Tekan `Enter` (folder saat ini)
4. Untuk deploy ke production:
   ```bash
   npx vercel --prod
   ```

---

## Pemisahan Tampilan Online (Konsumen vs Barista / Pemilik Kafe)

Aplikasi kini telah disederhanakan menjadi **2 TAMPILAN RESMI**:

1. **Halaman Konsumen (Tamu Kafe)**:
   - **URL Scan QR Meja**: `https://[nama-aplikasi].vercel.app/?table=04` (atau `?meja=04`)
   - **URL Umum**: `https://[nama-aplikasi].vercel.app/`
   - **Tampilan Bersih**: Konsumen HANYA melihat *Menu Digital*, *Status Pesanan*, dan *Tanya AI*.
   - **Aman**: Seluruh panel internal kafe, tiket dapur, dan generator barcode meja tidak dapat diakses tamu.

2. **Portal Barista & Pemilik Kafe (Admin / KDS / Kasir)**:
   - **URL Akses**: `https://[nama-aplikasi].vercel.app/?mode=barista` (atau buka `/barista` atau `/admin`)
   - **PIN Default**: `8888`
   - **Semua Fitur Menyatu**:
     - *Antrean Pesanan Bar (KDS)*
     - *Kelola Menu & Stok Kasir*
     - *Riwayat Transaksi Kasir*
     - *Pengaturan QRIS & Pajak PB1*
     - *Cetak Barcode Stand Akrilik Meja 01–100* (bisa langsung dicetak dari tab di dalam dashboard ini)

