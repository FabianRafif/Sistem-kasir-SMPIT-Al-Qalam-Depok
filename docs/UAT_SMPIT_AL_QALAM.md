# DOKUMEN USER ACCEPTANCE TESTING (UAT)
## SISTEM POINT OF SALE (POS) MINIMARKET SMPIT AL QALAM

Dokumen ini digunakan sebagai berita acara pengujian penerimaan sistem secara bersama-sama antara Pengembang Sistem dan Pihak Sekolah SMPIT Al Qalam.

---

### DATA PENGUJIAN
- **Nama Sistem**: POS SMPIT Al Qalam
- **Institusi**: SMPIT Al Qalam
- **Tanggal Uji**: .....................................................
- **Tempat Pengujian**: Komputer Kasir Minimarket SMPIT Al Qalam
- **Penguji Sekolah (Kasir / Admin)**: .....................................................
- **Petugas Pengembang**: .....................................................

---

### SKENARIO PENGUJIAN BERSAMA SEKOLAH

| No | Skenario Pengujian | Hasil Yang Diharapkan | Hasil Pengujian Sekolah | Keterangan / Paraf |
|:---:|---|---|:---:|:---:|
| 1 | **Login Kasir & Admin**<br>Masuk menggunakan akun kasir dan akun administrator sekolah | Berhasil login, role dibatasi (kasir hanya kasir, admin punya menu kelola toko & laporan) | [ ] Diterima<br>[ ] Ditolak | |
| 2 | **Identitas Visual Logo**<br>Memeriksa tampilan logo resmi SMPIT Al Qalam di sidebar, login, dan struk | Logo asli sekolah tampil proporsional tanpa distorsi aspek rasio | [ ] Diterima<br>[ ] Ditolak | |
| 3 | **Pindai Barcode Scanner USB**<br>Memindai kemasan barang (Air Mineral, Teh Botol, Buku Tulis, dll) | Produk langsung masuk ke keranjang dalam < 300ms disertai bunyi *beep* sukses | [ ] Diterima<br>[ ] Ditolak | |
| 4 | **Pencarian Produk Manual (F2)**<br>Mencari barang lewat keyboard tanpa barcode scanner | Menampilkan hasil instan, navigasi panah keyboard lancar, tekan Enter barang masuk | [ ] Diterima<br>[ ] Ditolak | |
| 5 | **Tambah Barang Baru Dari Kasir**<br>Mendaftarkan barang di rak yang belum terdaftar di database | Formulir ringkas terbuka, barang baru tersimpan, keranjang belanja sebelumnya tidak hilang | [ ] Diterima<br>[ ] Ditolak | |
| 6 | **Pencegahan Stok Minus**<br>Mencoba memasukkan jumlah barang melebihi stok yang ada | Sistem menolak dengan nada peringatan dan menampilkan sisa stok fisik yang tersedia | [ ] Diterima<br>[ ] Ditolak | |
| 7 | **Transaksi Tunai & Kembalian (F4)**<br>Menerima uang tunai dan menghitung kembalian | Rumus kembalian presisi, menolak uang kurang, tombol pecahan cepat uang pas berfungsi | [ ] Diterima<br>[ ] Ditolak | |
| 8 | **Pembayaran QRIS & Suara Konfirmasi (F9)**<br>Membuat invoice QRIS dan verifikasi otomatis | Kode QRIS terikat nominal tampil, saat pembayaran masuk terdengar suara pengumuman nominal | [ ] Diterima<br>[ ] Ditolak | |
| 9 | **Cetak Struk Thermal (58mm / 80mm)**<br>Mencetak bukti belanja ke printer kasir | Format monospace rapi, nama sekolah tercetak, daftar barang & rincian pembayaran presisi | [ ] Diterima<br>[ ] Ditolak | |
| 10 | **Retur / Pembatalan Struk Sah**<br>Membatalkan struk belanja oleh pihak berwenang | Status struk berubah menjadi dibatalkan, kuantitas stok otomatis kembali ke database | [ ] Diterima<br>[ ] Ditolak | |
| 11 | **Laporan Penjualan & Ekspor CSV**<br>Memeriksa ringkasan omzet harian/bulanan | Angka omzet kotor, omzet bersih, tunai vs QRIS akurat, ekspor spreadsheet rapi | [ ] Diterima<br>[ ] Ditolak | |

---

### CATATAN & TEMUAN PENGUJIAN
.........................................................................................................................................................  
.........................................................................................................................................................  
.........................................................................................................................................................  

---

### PERSETUJUAN HASIL PENGUJIAN (SIGN-OFF)

Dengan ini pihak sekolah menyatakan bahwa Sistem POS Minimarket SMPIT Al Qalam telah diuji sesuai skenario di atas dan:
- [ ] **DITERIMA PENUH** dan siap digunakan untuk operasional pelayanan siswa dan civitas sekolah.
- [ ] **DITERIMA BERSYARAT** dengan catatan perbaikan kecil yang tercantum di atas.
- [ ] **DITOLAK** dan memerlukan perbaikan menyeluruh sebelum pengujian ulang.

<br><br>

| Perwakilan Pengelola / Sekolah<br>**SMPIT Al Qalam** | Pengembang Sistem / Senior Engineer<br>**Tim Pengembang POS** |
|:---:|:---:|
| <br><br><br>____________________________________<br>Nama: <br>NIP/Jabatan: | <br><br><br>____________________________________<br>Nama: <br>Tanggal: |
