# PANDUAN DEPLOYMENT OPERASIONAL
## SISTEM POS MINIMARKET SMPIT AL QALAM

Dokumen ini memuat langkah instalasi dan konfigurasi sistem pada komputer kasir Windows di lingkungan sekolah SMPIT Al Qalam.

---

### 1. SPESIFIKASI MINIMAL PERANGKAT KERAS (HARDWARE)
- **Komputer / Laptop**: Prosesor Intel Core i3 / AMD Ryzen 3 atau setara.
- **RAM**: Minimal 4 GB (Disarankan 8 GB).
- **Penyimpanan**: SSD dengan sisa ruang minimal 20 GB.
- **Sistem Operasi**: Windows 10 / Windows 11 (64-bit).
- **Perangkat Pendukung**:
  - USB Barcode Scanner (Plug & Play, emulasi HID keyboard).
  - Printer Thermal Kasir USB (Lebar kertas 58 mm atau 80 mm).
  - Keyboard & Mouse.
  - Koneksi Jaringan / WiFi lokal sekolah.

---

### 2. SOFTWARE YANG DIPERLUKAN
1. **Node.js**: Versi LTS 20.x atau 22.x atau 24.x (Download dari `nodejs.org`).
2. **Laragon / MySQL 8.0**: Server database lokal MySQL InnoDB (Download dari `laragon.org`).
3. **Google Chrome / Microsoft Edge**: Browser untuk menjalankan antarmuka kasir.

---

### 3. LANGKAH DEPLOYMENT SISTEM
1. **Ekstrak / Clone Source Code**:
   Tempatkan folder proyek di komputer sekolah (misal: `D:\pos-smpit-alqalam`).

2. **Siapkan Database MySQL**:
   - Jalankan MySQL di Laragon.
   - Buka terminal MySQL dan buat database:
     ```sql
     CREATE DATABASE IF NOT EXISTS pos_smpit_alqalam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```

3. **Konfigurasi Environment Variable (`.env`)**:
   Salin `.env.example` menjadi `.env`, sesuaikan kredensial:
   ```env
   DATABASE_URL="mysql://root:@localhost:3306/pos_smpit_alqalam"
   JWT_SECRET="ganti_dengan_acak_panjang_minimal_32_karakter_produksi"
   NEXT_PUBLIC_APP_NAME="POS SMPIT Al Qalam"
   NEXT_PUBLIC_SCHOOL_NAME="SMPIT Al Qalam"
   APP_TIMEZONE="Asia/Jakarta"
   PORT=3000
   ```

4. **Sinkronisasi Skema Database & Migrasi**:
   ```powershell
   npx prisma db push
   ```

5. **Inisialisasi Data Awal (Seeding)**:
   ```powershell
   npx tsx prisma/seed.ts
   ```

6. **Kompilasi Versi Produksi**:
   ```powershell
   npm run build
   ```

7. **Jalankan Aplikasi Mode Produksi**:
   ```powershell
   npm run start
   ```

8. **Membuat Shortcut Desktop Otomatis**:
   Buat file `Mulai_Kasir_AlQalam.bat` di Desktop kasir:
   ```bat
   @echo off
   start http://localhost:3000/pos
   cd /d D:\pos-smpit-alqalam
   npm run start
   ```
