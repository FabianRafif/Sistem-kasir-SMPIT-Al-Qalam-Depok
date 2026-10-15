# PANDUAN PENGELOLA & ADMINISTRATOR
## MINIMARKET SMPIT AL QALAM

Dokumen ini memuat petunjuk pengelolaan sistem, inventaris stok, laporan keuangan, pengaturan toko, dan manajemen kasir bagi Pengelola/Administrator Minimarket SMPIT Al Qalam.

---

### 1. AKSES ADMINISTRATOR
- **URL**: `http://localhost:3000/login`
- **Akun Utama Bawaan**: `admin`
- **Hak Akses**: Administrator memiliki otoritas penuh ke seluruh modul: Dashboard, Kasir (POS), Data Produk, Inventaris & Stok, Riwayat Transaksi, Laporan Penjualan, Kelola Pengguna, dan Pengaturan Toko.

---

### 2. PENGELOLAAN KATALOG & PRODUK
Buka menu **Data Produk** (`/products`):
1. **Pendaftaran Produk Baru**:
   - Klik `+ Tambah Produk Baru`.
   - Isi Nama Produk, Barcode fisik, Kategori, Harga Modal (HPP), Harga Jual, Stok Awal, dan Stok Minimum.
2. **Cetak Label Barcode Mandiri**:
   - Untuk produk lokal/kantin yang tidak memiliki kemasan barcode pabrik (misal: roti harian, kue, alat tulis satuan), klik ikon **Barcode** di tabel produk.
   - Sistem akan membuat label barcode Code128 siap cetak dengan nama produk dan harga jual.
3. **Import Produk Massal dari Excel / Spreadsheet**:
   - Klik `Import Excel/CSV`.
   - Unduh template spreadsheet melalui tombol `Unduh Template`.
   - Isi kolom data produk nyata dari pihak sekolah.
   - Unggah file. Sistem akan memeriksa baris valid dan baris gagal (validasi barcode & SKU duplikat) dalam mode pratinjau (*preview*) sebelum disimpan ke database.
4. **Export CSV**:
   - Klik `Export CSV`. File hasil ekspor telah dilengkapi proteksi formula injection (mencegah eksploitasi sel rumus `=,+,-,@` di Microsoft Excel).

---

### 3. AUDIT INVENTARIS & PENYESUAIAN STOK
Buka menu **Inventaris & Stok** (`/inventory`):
1. **Total Estimasi Nilai Persediaan**:
   - Ditampilkan di bagian atas, dihitung otomatis dari `Jumlah Stok × Harga Modal` seluruh barang aktif.
2. **Penyesuaian Stok (Audit Trail Mandatori)**:
   - Klik `Input Penyesuaian / Stok Masuk`.
   - Pilih barang, jenis operasi (`Stok Masuk (+)`, `Stok Keluar (-)`, atau `Opname / Set`).
   - Masukkan kuantitas dan **Alasan Perubahan** (alasan wajib diisi sebagai rekam jejak audit).
3. **Riwayat Mutasi**:
   - Seluruh mutasi barang tercatat permanen: tanggal, jenis mutasi (`INITIAL`, `IN`, `OUT`, `SALE`, `RETURN`), kuantitas, nama kasir/admin yang memproses, dan referensi nomor struk.

---

### 4. REKONSILIASI KEUANGAN & LAPORAN PENJUALAN
Buka menu **Laporan Penjualan** (`/reports`):
1. **Filter Periode Konsisten**:
   - Pilihan: Hari Ini, 7 Hari Terakhir, Bulan Ini, Tahun Ini, atau Rentang Khusus (menggunakan zona waktu `Asia/Jakarta`).
2. **Agregasi Angka Finansial Sah**:
   - **Omzet Kotor**: Total penjualan sebelum diskon.
   - **Diskon**: Total potongan yang diberikan.
   - **Omzet Bersih (Net Sales)**: Omzet kotor dikurangi diskon.
   - **Estimasi Laba Kotor (Gross Profit)**: Omzet bersih dikurangi total HPP (harga modal barang terjual).
   - **Pemisahan Tunai vs QRIS**:
     - Total Tunai = Saldo uang kas fisik di laci kasir.
     - Total QRIS = Mutasi masuk rekening bank/merchant QRIS sekolah.
3. **Peringkat Produk Terlaris**:
   - Menampilkan urutan barang dengan volume penjualan tertinggi dan kontribusi omzet terbesar.

---

### 5. MANAJEMEN AKUN PENGGUNA
Buka menu **Kelola Pengguna** (`/users`):
1. **Menambah Akun Kasir Baru**:
   - Klik `Tambah Pengguna Baru`.
   - Isi nama lengkap, username kasir, dan password minimal 6 karakter.
   - Pilih role: `Kasir (POS Saja)` agar tidak dapat mengubah harga modal atau mengakses laporan keuangan rahasia.
2. **Reset Password Kasir**:
   - Klik ikon kunci pada baris pengguna terkait untuk mengubah kata sandi akun kasir yang lupa password.
3. **Nonaktifkan Akun**:
   - Akun kasir yang sudah tidak bertugas dapat dinonaktifkan tanpa menghapus riwayat transaksi masa lalu yang pernah dibuatnya.

---

### 6. PENGATURAN TOKO & PRINTER
Buka menu **Pengaturan Toko** (`/settings`):
1. Ubah Nama Toko, Nama Sekolah, Alamat, dan Nomor Kontak.
2. Atur **Catatan Footer Struk** (pesan terima kasih, doa berkah, kebijakan retur).
3. Pilih ukuran printer thermal: **58 mm** (standar kasir kecil) atau **80 mm** (kertas lebar).
4. Pilih Mode QRIS: **Mode B (Dinamis Otomatis)** atau **Mode A (Statis Kantin)**.
