# LAPORAN HASIL PENGUJIAN SISTEM (TEST REPORT)
## SISTEM POS MINIMARKET SMPIT AL QALAM

**Tanggal Pengujian**: 15 Oktober 2026  
**Lingkungan Uji**: Windows 11 (64-bit), Node.js v24.11.1, MySQL 8.0.30 (Laragon InnoDB)  
**Database**: `pos_smpit_alqalam`  
**Hasil Keseluruhan**: **17 Uji Kasus Dieksekusi — 17 PASS (100% Lulus) — 0 FAIL**

---

### TABEL HASIL PENGUJIAN OTOMASI

| ID | Modul / Fitur | Skenario Pengujian | Hasil Aktual | Status |
|---|---|---|---|:---:|
| **SEC-01** | Keamanan Autentikasi | Hashing password dengan bcrypt salt 10 putaran dan verifikasi kecocokan password | Password di-hash irreversibel, password benar terverifikasi valid, password salah ditolak | **PASS** |
| **SEC-02** | Manajemen Sesi | Pembuatan dan verifikasi token JWT terenkripsi dengan masa berlaku 12 jam | Payload user id, username, dan role terverifikasi tanpa modifikasi | **PASS** |
| **SEC-03** | Proteksi Brute-Force | Rate limiting percobaan login maksimal 5 kali per menit per IP | Percobaan ke-1 s/d 5 diizinkan, percobaan ke-6 otomatis diblokir kode status 429 | **PASS** |
| **SEC-04** | Keamanan Data | Penomoran struk unik dengan format standar `KM-YYYYMMDD-XXXXXX` | Nomor struk format presisi dan tidak bertabrakan | **PASS** |
| **SEC-05** | Barcode Internal | Pembuatan barcode internal otomatis prefix `200` sepanjang 12 karakter | Barcode internal EAN-13 compatible terbuat unik untuk produk tanpa barcode pabrik | **PASS** |
| **SEC-06** | Keamanan CSV | Sanitasi formula injection pada karakter `=, +, -, @` saat export spreadsheet | Karakter diawali tanda kutip tunggal (`'`) mencegah eksekusi rumus arbitrer di Excel | **PASS** |
| **SEC-07** | Format Finansial | Pemformatan nominal Rupiah dan angka tabular kasir | Menghasilkan representasi `Rp 15.000` dan pemisah ribuan rapi | **PASS** |
| **POS-01** | Cetak Struk 58mm | Formatting teks monospace struk thermal kasir lebar 32 karakter | Setiap baris rapi, tidak melebihi 32 karakter, alignment kiri-kanan presisi | **PASS** |
| **POS-02** | Rata Kanan Struk | Fungsi `padLine` untuk nama barang di kiri dan total harga di kanan | Menghasilkan garis sejajar dengan padding spasi dinamis | **PASS** |
| **POS-03** | Judul Tengah Struk | Fungsi `centerLine` untuk nama sekolah dan toko di struk | Teks sekolah berada tepat di tengah struk | **PASS** |
| **POS-04** | Aturan Pembayaran Tunai | Perhitungan kembalian otomatis `Kembalian = Uang Diterima - Grand Total` | Kembalian akurat, uang pas bernilai 0, nominal kurang terdeteksi | **PASS** |
| **DB-01** | Database Seeding | Memuat data pengguna bawaan administrator dan kasir dari MySQL | User `admin` (Role ADMIN) dan `kasir1` (Role CASHIER) terbaca dari database | **PASS** |
| **DB-02** | Kategori Minimarket | Memuat 7 kategori standar minimarket kantin sekolah | Ketujuh kategori (`Makanan Ringan`, `Minuman`, `Alat Tulis`, dll) aktif di MySQL | **PASS** |
| **DB-03** | Barcode Scanner Presisi | Pencarian produk dengan barcode berawalan nol (`089686010383` Indomie) | Karakter nol awal dipertahankan sebagai string, produk ditemukan dengan tepat | **PASS** |
| **DB-04** | Integritas Barcode | Penolakan pendaftaran barcode kemasan duplikat di database | Database MySQL melempar error constraint `products_barcode_key`, mencegah data ganda | **PASS** |
| **DB-05** | Mutasi Stok Atomik | Transaksi mutasi stok atomik dengan pencatatan audit log di MySQL | Stok produk bertambah/berkurang konsisten dalam transaksi database rollback-safe | **PASS** |
| **DB-06** | Idempotensi QRIS | Hash tracking payload webhook QRIS untuk mencegah pemrosesan transaksi ganda | Event ID dan hash payload tercatat, webhook ganda ditolak sebagai duplikat | **PASS** |

---

### PENGUJIAN KOMPILASI & PRODUKSI
- **TypeScript Typecheck (`npx tsc --noEmit`)**: Berhasil tanpa kesalahan tipe (0 error).
- **Next.js Production Build (`npm run build`)**: Berhasil mengompilasi 31 rute statis & dinamis, bundle CSS, dan API route tanpa kegagalan.
- **Ukuran First Load JS**: Rata-rata 106 kB (sangat ringan dan cepat untuk komputer kasir spek standar).
