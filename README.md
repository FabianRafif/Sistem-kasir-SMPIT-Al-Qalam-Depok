# SISTEM KASIR (POS) MINIMARKET SMPIT AL QALAM

Sistem Point of Sale (POS) dan Inventory Management profesional berbasis Web yang dirancang khusus untuk operasional kasir minimarket/kantin sekolah **SMPIT Al Qalam**.

Aplikasi ini dibangun menggunakan arsitektur modern berstandar enterprise yang siap diuji dan digunakan langsung pada komputer kasir Windows dengan dukungan USB Barcode Scanner dan Printer Thermal Kasir.

---

## 1. TEKNOLOGI UTAMA
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript (Strict Mode), Tailwind CSS, Lucide React Icons.
- **Backend**: Next.js Server Route Handlers & Server Services.
- **Database**: MySQL 8.0 (InnoDB) dengan Prisma ORM v6, transaksi atomik ACID, Foreign Keys, dan Indexes.
- **Autentikasi & Keamanan**: Bcrypt password hashing, JWT HttpOnly Session Cookie, brute-force rate limiter, dan mitigasi CSV Formula Injection.
- **Fitur Khusus Kasir**:
  - Dukungan USB Barcode Scanner instan dengan auto-focus.
  - Pencarian manual produk cepat (F2) dengan navigasi keyboard panah atas/bawah & Enter.
  - Perhitungan pembayaran tunai otomatis (F4) dengan pecahan uang pas & kembalian akurat.
  - Integrasi pembayaran QRIS Dinamis (F9) dengan suara konfirmasi nominal berbahasa Indonesia (Web Speech API).
  - Format cetak struk thermal standar 58 mm dan 80 mm (Monospace typography).
  - Generator label stiker barcode mandiri (Code128) untuk barang tanpa barcode pabrik.
  - Import produk massal dari Excel/CSV dengan pratinjau validasi baris gagal/sukses.
  - Laporan penjualan harian, mingguan, bulanan, tahunan, omzet bersih, HPP, dan laba kotor.

---

## 2. PANDUAN INSTALASI & MENJALANKAN SISTEM

### Langkah 1: Kebutuhan Awal
- Komputer Windows 10/11
- [Node.js](https://nodejs.org) (v20+ / v22+ / v24+)
- [Laragon](https://laragon.org) atau MySQL 8.0 Server aktif di port `3306`

### Langkah 2: Setup Database MySQL
Buka MySQL (di Laragon) dan buat database:
```sql
CREATE DATABASE IF NOT EXISTS pos_smpit_alqalam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Langkah 3: Konfigurasi Environment (`.env`)
Pastikan file `.env` telah disiapkan:
```env
DATABASE_URL="mysql://root:@localhost:3306/pos_smpit_alqalam"
JWT_SECRET="alqalam_super_secure_jwt_secret_production_ready_pos_2026_xyz"
NEXT_PUBLIC_APP_NAME="POS SMPIT Al Qalam"
NEXT_PUBLIC_SCHOOL_NAME="SMPIT Al Qalam"
APP_TIMEZONE="Asia/Jakarta"
PORT=3000
```

### Langkah 4: Sinkronisasi Skema Database & Data Awal
```bash
# Sinkronkan skema database Prisma ke MySQL
npx prisma db push

# Jalankan Seeding (Membuat Akun Admin, Kasir, 7 Kategori, Pengaturan Toko, & Produk Demo)
npx tsx prisma/seed.ts
```

### Langkah 5: Menjalankan Pengujian Otomatis
```bash
npm test
```
*Hasil: 17 Uji Kasus (Keamanan, Rumus Kasir, Struk 58mm, Integritas Barcode, Mutasi Stok MySQL) LULUS 100%.*

### Langkah 6: Kompilasi & Menjalankan Aplikasi
```bash
# Kompilasi versi produksi
npm run build

# Menjalankan server produksi
npm run start
```
Buka browser di: **`http://localhost:3000`**

---

## 3. AKUN PENGUJIAN DEMO SEKOLAH

| Role | Username | Password | Hak Akses |
|---|---|---|---|
| **Administrator** | `admin` | `AdminAlQalam2026!` | Akses penuh ke seluruh modul, produk, inventaris, laporan, dan pengaturan toko |
| **Kasir Toko** | `kasir1` | `KasirAlQalam2026!` | Khusus operasional kasir (POS), pencarian barang, scan barcode, dan riwayat penjualan |

---

## 4. DOKUMENTASI LENGKAP PROYEK
- [Panduan Pengoperasian Kasir](docs/PANDUAN_KASIR.md)
- [Panduan Pengelola & Administrator](docs/PANDUAN_ADMINISTRATOR.md)
- [Panduan Backup dan Restore Database](docs/PANDUAN_BACKUP_RESTORE.md)
- [Panduan Deployment Operasional](docs/PANDUAN_DEPLOYMENT.md)
- [Checklist Go-Live Bersama Sekolah](docs/CHECKLIST_GOLIVE.md)
- [Laporan Hasil Pengujian Sistem (Test Report)](docs/LAPORAN_PENGUJIAN.md)
- [Formulir User Acceptance Testing (UAT) Sekolah](docs/UAT_SMPIT_AL_QALAM.md)

---

## 5. STRUKTUR DATABASE (11 TABEL INNODB)
1. `users`: Kredensial akun, role (ADMIN / CASHIER), dan status aktif.
2. `categories`: Kategori produk minimarket sekolah.
3. `products`: Katalog barang, barcode unik, SKU, harga modal, harga jual, stok, dan stok minimum.
4. `sales`: Transaksi penjualan, nomor struk unik (`KM-YYYYMMDD-XXXXXX`), diskon, total akhir, metode bayar, dan status lunas.
5. `sale_items`: Detail barang terjual dengan snapshot harga satuan dan harga modal saat transaksi terjadi.
6. `stock_movements`: Rekam jejak audit mutasi stok (`INITIAL`, `IN`, `OUT`, `ADJUSTMENT`, `SALE`, `RETURN`).
7. `payments`: Pencatatan transaksi pembayaran tunai dan QRIS dinamis.
8. `payment_webhook_events`: Rekam jejak event webhook pembayaran dengan hash tracking idempoten.
9. `audit_logs`: Log keamanan aktivitas administratif (perubahan harga, stok, login, pembatalan).
10. `store_settings`: Identitas sekolah, alamat, kontak, logo, footer struk, dan ukuran printer thermal.
11. `cashier_shifts`: Pencatatan shift kerja kasir, kas awal, kas akhir, dan rekonsiliasi kas.

---
Dikembangkan secara profesional untuk **SMPIT Al Qalam**.
