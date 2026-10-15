# PANDUAN BACKUP DAN RESTORE DATABASE
## POS MINIMARKET SMPIT AL QALAM

Dokumen ini menjelaskan prosedur pencadangan (backup) dan pemulihan data (restore) database MySQL untuk menjaga keselamatan data transaksi minimarket sekolah dari risiko kerusakan hardware atau mati listrik.

---

### 1. INFORMASI DATABASE
- **Database Engine**: MySQL 8.0 (InnoDB)
- **Nama Database**: `pos_smpit_alqalam`
- **Charset & Collation**: `utf8mb4 / utf8mb4_unicode_ci`
- **Tingkat Transaksi**: ACID Compliant (Mendukung Rollback & Foreign Keys)

---

### 2. PROSEDUR BACKUP MANUAL (MENGGUNAKAN MYSQLDUMP)
Jalankan perintah ini melalui PowerShell atau Command Prompt pada komputer server kasir:

```powershell
# Backup Lengkap Struktur dan Data
& "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqldump.exe" -u root -p pos_smpit_alqalam > "D:\backup_pos_alqalam_$(Get-Date -Format 'yyyyMMdd_HHmm').sql"
```

*Catatan: Simpan file backup hasil dump ke drive eksternal (Flashdisk / Google Drive sekolah), bukan hanya di komputer kasir.*

---

### 3. PROSEDUR BACKUP OTOMATIS HARIAN (WINDOWS TASK SCHEDULER)
Untuk menjalankan backup otomatis setiap hari pukul 17:00 WIB (setelah jam operasional kantin selesai):

1. Buat file batch script di `D:\backup_pos.bat`:
   ```bat
   @echo off
   set BACKUP_DIR=D:\Backup_POS_AlQalam
   if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
   set FILE_NAME=%BACKUP_DIR%\pos_alqalam_%date:~10,4%%date:~4,2%%date:~7,2%.sql
   "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysqldump.exe" -u root pos_smpit_alqalam > "%FILE_NAME%"
   ```
2. Buka **Task Scheduler** di Windows.
3. Buat tugas baru (*Create Basic Task*):
   - Nama: `Backup_POS_SMPIT_AlQalam`
   - Trigger: `Daily` pada pukul `17:00`
   - Action: `Start a Program` -> pilih file `D:\backup_pos.bat`.

---

### 4. PROSEDUR PEMULIHAN DATA (RESTORE DATABASE)
Jika komputer mengalami kerusakan atau terjadi perpindahan komputer kasir baru:

1. Pastikan MySQL sudah terpasang dan database kosong `pos_smpit_alqalam` telah dibuat:
   ```sql
   CREATE DATABASE IF NOT EXISTS pos_smpit_alqalam CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Jalankan perintah restore file `.sql` cadangan:
   ```powershell
   & "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" -u root pos_smpit_alqalam < "D:\backup_pos_alqalam_terbaru.sql"
   ```
3. Lakukan verifikasi data dengan menjalankan:
   ```powershell
   & "C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe" -u root pos_smpit_alqalam -e "SELECT count(*) FROM sales; SELECT count(*) FROM products;"
   ```
4. Jalankan aplikasi Next.js:
   ```powershell
   npm run start
   ```
5. Buka browser dan periksa menu **Dashboard** serta **Riwayat Transaksi** untuk memastikan data telah pulih seutuhnya.
