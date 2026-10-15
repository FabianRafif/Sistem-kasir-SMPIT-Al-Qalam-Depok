# CHECKLIST PERSIAPAN GO-LIVE
## SISTEM KASIR MINIMARKET SMPIT AL QALAM

Gunakan daftar periksa (*checklist*) ini bersama pihak sekolah sebelum sistem resmi dioperasikan dalam pelayanan jual-beli nyata.

---

### TAHAP 1: DATA BARANG & INVENTARIS
- [ ] Daftar barang fisik minimarket telah diterima dari pihak sekolah.
- [ ] Seluruh harga modal (HPP) dan harga jual telah diverifikasi pihak sekolah.
- [ ] Barcode produk kemasan telah didaftarkan (atau dicetak label barcode internal untuk barang tanpa kemasan pabrik).
- [ ] Seluruh stok awal fisik telah dihitung (stock opname awal) dan diimpor ke sistem.
- [ ] Template produk Excel telah diverifikasi tanpa kesalahan baris.

### TAHAP 2: PERANGKAT KERAS KASIR
- [ ] Komputer / Laptop kasir menyala stabil dan terpasang UPS (penyimpan daya darurat bila mati listrik).
- [ ] USB Barcode Scanner telah diuji: memindai kode kemasan dengan terminator Enter secara stabil.
- [ ] Printer Thermal USB telah terpasang, terhubung driver Windows, dan diuji cetak struk (pilihan lebar 58 mm atau 80 mm).
- [ ] Tombol pintasan keyboard (F2, F4, F9, Enter, Esc) telah dicoba oleh petugas kasir.

### TAHAP 3: AKUN & KEAMANAN
- [ ] Akun administrator utama sekolah telah dibuat dengan kata sandi rahasia yang kuat.
- [ ] Akun kasir telah dibuat terpisah dengan role `CASHIER` (hanya bisa mengakses kasir dan transaksi miliknya).
- [ ] Kata sandi akun demo default telah diganti atau diamankan.
- [ ] Kunci rahasia sesi `JWT_SECRET` pada file `.env` telah menggunakan string acak minimal 32 karakter unik.

### TAHAP 4: METODE PEMBAYARAN & QRIS
- [ ] Saldo modal uang tunai awal laci kasir telah disiapkan dan dicatat.
- [ ] Identitas QRIS resmi sekolah (NMID / QRIS Bank BSI/BCA/Mandiri) telah dikonfirmasi pengelola kantin.
- [ ] Jika menggunakan Mode A (QRIS Statis): Stiker QRIS fisik sekolah dipajang jelas di meja kasir.
- [ ] Jika menggunakan Mode B (QRIS Dinamis): Kredensial penyedia pembayaran resmi telah dikonfigurasi dan diuji transaksi nominal Rp 1.000 via sandbox/live.
- [ ] Pengeras suara / speaker kasir aktif untuk memutar suara konfirmasi nominal QRIS.

### TAHAP 5: PROSEDUR DARURAT & BACKUP
- [ ] Jadwal backup otomatis database MySQL telah diaktifkan di Windows Task Scheduler.
- [ ] Prosedur restore database telah diuji coba satu kali ke file cadangan.
- [ ] Kasir telah dilatih menangani kondisi barcode tidak terbaca, barang belum terdaftar, dan pembatalan struk sah.
- [ ] Nota belanja fisik kertas manual cadangan tetap tersedia di laci meja sebagai antisipasi darurat.
- [ ] Form User Acceptance Testing (UAT) telah ditandatangani oleh perwakilan pihak SMPIT Al Qalam.
