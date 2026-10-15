# PANDUAN PENGOPERASIAN KASIR (POS)
## MINIMARKET SMPIT AL QALAM

Selamat datang di Sistem Kasir Minimarket SMPIT Al Qalam. Panduan ini dirancang untuk mempermudah kasir dalam menjalankan operasional harian kasir secara cepat, akurat, dan profesional.

---

### 1. CARA MASUK KE SISTEM (LOGIN)
1. Buka browser (Google Chrome atau Microsoft Edge) pada komputer kasir.
2. Akses alamat sistem: `http://localhost:3000/login`.
3. Masukkan **Username** dan **Password** akun kasir Anda:
   - Contoh Akun Kasir: `kasir1` / `KasirAlQalam2026!`
4. Klik tombol **"Masuk ke Sistem Kasir"** atau tekan **Enter**.
5. Sistem akan otomatis mengarahkan Anda ke layar utama **Kasir (POS)**.

---

### 2. TOMBOL PINTASAN KEYBOARD (KEYBOARD SHORTCUTS)
Untuk mempercepat proses pelayanan tanpa banyak menggunakan mouse:
- **F2**: Langsung fokus ke kolom **Pencarian Produk Manual** (nama produk atau SKU).
- **F4**: Langsung membuka jendela **Pembayaran Tunai (Cash)**.
- **F9**: Langsung membuat invoice & kode **Pembayaran QRIS Dinamis**.
- **Enter**:
  - Pada scanner: menambahkan barang ke keranjang belanja.
  - Pada modal pembayaran: menyelesaikan transaksi dan mencetak struk.
- **Esc**: Membatalkan modal yang terbuka dan mengembalikan kursor ke kolom scanner barcode.

---

### 3. ALUR TRANSAKSI SCANNER BARCODE USB
1. Pastikan kabel USB Barcode Scanner terhubung ke komputer.
2. Setiap kali layar kasir dibuka, kursor secara otomatis berada di kotak **"Scanner USB"**.
3. Arahkan sinar scanner ke barcode kemasan barang:
   - **Terdengar Nada Beep Tinggi**: Barang berhasil ditemukan dan masuk ke keranjang belanja kasir.
   - **Terdengar Nada Peringatan Rendah**: Barcode tidak ditemukan atau stok barang habis.
4. Jika pembeli membeli barang yang sama lebih dari 1 buah:
   - Pindai barcode barang tersebut berulang kali, atau
   - Ubah angka kuantitas langsung pada tabel keranjang belanja kasir.

---

### 4. PENCARIAN PRODUK MANUAL (JIKA BARCODE RUSAK/TIDAK BISA DI-SCAN)
1. Tekan tombol **F2** pada keyboard.
2. Ketik sebagian nama produk (contoh: `air`, `roti`, `susu`, atau `pensil`).
3. Gunakan tombol panah **Bawah / Atas** pada keyboard untuk memilih produk dari daftar.
4. Tekan **Enter** untuk memasukkan produk ke keranjang belanja.

---

### 5. MENDAFTARKAN BARANG FISIK BARU DARI LAYAR KASIR
Jika kasir menemukan barang fisik di rak yang belum pernah didaftarkan ke sistem:
1. Klik tombol **"+ Produk Baru"** di bagian atas layar kasir.
2. Masukkan nama barang, pindai barcode kemasannya (atau klik *Auto Gen* jika barang tidak punya barcode).
3. Pilih kategori, masukkan harga jual, dan stok awal barang.
4. Klik **"Simpan & Tambah ke Keranjang"**.
5. Barang baru langsung tersimpan di database dan keranjang belanja pembeli tidak akan hilang.

---

### 6. PEMBAYARAN TUNAI (CASH)
1. Setelah seluruh barang selesai dipindai, tekan **F4** atau klik tombol **"TUNAI (CASH)"**.
2. Jendela pembayaran tunai akan muncul menampilkan total tagihan belanja.
3. Masukkan nominal uang yang diterima dari pembeli, atau klik tombol pecahan cepat (**Uang Pas**, **Rp 10.000**, **Rp 20.000**, **Rp 50.000**, **Rp 100.000**).
4. Sistem secara otomatis menghitung nilai **Kembalian**.
5. Tekan **Enter** atau klik **"Selesaikan & Cetak"**.
6. Struk thermal akan otomatis terbuka dan siap dicetak ke printer.

---

### 7. PEMBAYARAN DIGITAL QRIS
1. Tekan **F9** atau klik tombol **"QRIS DINAMIS"**.
2. Sistem akan menampilkan kode QRIS dinamis yang mengunci nominal transaksi pembeli.
3. Arahkan pembeli untuk memindai kode QRIS menggunakan aplikasi mobile banking atau e-wallet (BSI, BCA, Mandiri, GoPay, OVO, ShopeePay, Dana, dll).
4. Layar kasir akan menampilkan status *"Menunggu Pembeli Scan QRIS..."*.
5. Begitu pembayaran berhasil masuk, sistem akan:
   - Menampilkan tanda centang hijau **"PEMBAYARAN LUNAS"**.
   - Memutar suara konfirmasi: *"Pembayaran melalui QRIS, nominal Rp [nominal] masuk ke sistem."*
   - Membuka struk thermal transaksi untuk dicetak.
6. **Untuk Simulasi Uji Demo Sekolah**: Kasir dapat menekan tombol *"Simulasi Bayar QRIS (Uji Demo)"* pada jendela QRIS.

---

### 8. PEMBATALAN TRANSAKSI / SALAH INPUT
- **Sebelum dibayar**: Klik tombol ikon tempat sampah di samping baris produk, atau klik *"Kosongkan Keranjang"* jika pembeli batal berbelanja.
- **Setelah transaksi selesai (struk sudah terbit)**:
  1. Buka menu **Riwayat Transaksi**.
  2. Cari nomor struk terkait.
  3. Minta administrator menekan tombol **Batalkan Transaksi** serta mengisi alasan pembatalan. Stok barang akan otomatis dikembalikan ke inventaris.

---

### 9. MENGAKHIRI SHIFT / KELUAR
1. Klik tombol **"Keluar Sesi"** di bagian bawah sidebar kiri.
2. Pastikan uang fisik di laci kasir telah dihitung dan disesuaikan dengan total penjualan tunai pada dashboard laporan harian.
