'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Image from 'next/image';
import {
  Settings,
  Store,
  Printer,
  QrCode,
  Shield,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Database,
  Upload,
  Trash2,
  Image as ImageIcon,
  FileImage,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const [storeName, setStoreName] = useState<string>('');
  const [schoolName, setSchoolName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [receiptFooter, setReceiptFooter] = useState<string>('');
  const [logoPath, setLogoPath] = useState<string>('/logo-alqalam.png');
  const [printerPaperSize, setPrinterPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [qrisMode, setQrisMode] = useState<'STATIC' | 'DYNAMIC'>('DYNAMIC');
  const [qrisStaticImage, setQrisStaticImage] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.data) {
          const s = data.data;
          setStoreName(s.storeName || '');
          setSchoolName(s.schoolName || '');
          setAddress(s.address || '');
          setPhone(s.phone || '');
          setReceiptFooter(s.receiptFooter || '');
          setLogoPath(s.logoPath || '/logo-alqalam.png');
          setPrinterPaperSize(s.printerPaperSize || '58mm');
          setQrisMode(s.qrisMode || 'DYNAMIC');
          setQrisStaticImage(s.qrisStaticImage || '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const showNotice = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          schoolName,
          address,
          phone,
          receiptFooter,
          logoPath,
          printerPaperSize,
          qrisMode,
          qrisStaticImage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Gagal menyimpan pengaturan.');
        return;
      }

      showNotice('success', 'Pengaturan toko berhasil disimpan ke database.');
    } catch (err: any) {
      showNotice('error', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Pengaturan Toko" subtitle="Memuat konfigurasi...">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
          <span className="text-xs font-semibold text-slate-500">Memuat konfigurasi...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Pengaturan Identitas Toko & Kasir"
      subtitle="Sesuaikan nama sekolah, footer struk thermal, printer, dan konfigurasi pembayaran QRIS"
    >
      <form onSubmit={handleSave} className="space-y-6 max-w-4xl select-none">
        {/* NOTIFIKASI */}
        {notification && (
          <div
            className={`p-3 text-xs font-semibold rounded-xl flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* 1. IDENTITAS SEKOLAH & LOGO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Store className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Identitas Sekolah & Minimarket</h3>
              <p className="text-[11px] text-slate-500">
                Nama dan kontak yang tampil pada dashboard, struk belanja, dan laporan
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
            <div className="relative w-24 h-24 bg-white rounded-2xl p-2 shadow-xs border border-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
              <Image
                src={logoPath || '/logo-alqalam.png'}
                alt="Logo SMPIT Al Qalam"
                width={240}
                height={240}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">Logo Resmi SMPIT Al Qalam</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Aset resmi sekolah digunakan secara proporsional pada sidebar, struk kasir, dan login.
              </p>
              <span className="inline-block mt-2 text-[10px] font-mono text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded">
                Path: {logoPath}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Sekolah <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Toko / Unit Usaha <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Kontak / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-3456-7890"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Komplek Perguruan Islam Terpadu Al Qalam"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </div>

        {/* 2. PENGATURAN STRUK & PRINTER THERMAL */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <Printer className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Format Struk Thermal & Kertas Printer</h3>
              <p className="text-[11px] text-slate-500">
                Format monospace kasir minimarket asli 58 mm atau 80 mm
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ukuran Lebar Kertas Printer Thermal
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPrinterPaperSize('58mm')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                    printerPaperSize === '58mm'
                      ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  58 mm (Standar Kasir Kecil)
                </button>
                <button
                  type="button"
                  onClick={() => setPrinterPaperSize('80mm')}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                    printerPaperSize === '80mm'
                      ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  80 mm (Printer Lebar)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Footer Struk (Pesan Terima Kasih / Kebijakan)
              </label>
              <textarea
                rows={3}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Terima kasih telah berbelanja..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 3. KONFIGURASI QRIS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <QrCode className="w-5 h-5 text-brand-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Metode QRIS & Verifikasi Pembayaran</h3>
              <p className="text-[11px] text-slate-500">
                Pilih metode pembayaran QRIS kertas meja (statis) atau QRIS dinamis di layar kasir
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setQrisMode('STATIC')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                qrisMode === 'STATIC'
                  ? 'border-brand-500 bg-brand-50/40 text-brand-900 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">Mode A — QRIS Kertas Meja Kasir (Statis)</span>
                <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                  Stiker Meja
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Menggunakan stiker/akrilik QRIS fisik yang ditempel di depan meja kasir. Pembeli scan di meja, lalu pembayaran otomatis terverifikasi masuk ke sistem kasir.
              </p>
            </div>

            <div
              onClick={() => setQrisMode('DYNAMIC')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                qrisMode === 'DYNAMIC'
                  ? 'border-brand-500 bg-brand-50/40 text-brand-900 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs">Mode B — QRIS Dinamis Layar Kasir</span>
                <span className="text-[10px] font-bold uppercase bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                  Di Layar
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Membuat kode QR unik terikat nominal di layar kasir untuk setiap transaksi. Cocok bila ada monitor kedua yang menghadap pembeli.
              </p>
            </div>
          </div>

          {/* AREA UPLOAD STIKER QRIS KERTAS MEJA */}
          <div className="mt-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileImage className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-bold text-slate-800">
                  Foto Stiker QRIS Kertas Meja Kasir (Ditempel di Meja)
                </span>
              </div>
              {qrisStaticImage && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Foto QRIS Terpasang
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Upload foto stiker/kertas QRIS resmi yang tertempel di meja kasir minimarket SMPIT Al Qalam. Sistem kasir akan menggunakan referensi QRIS ini saat transaksi, dan otomatis mendeteksi konfirmasi dana masuk.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 pt-1">
              {/* Preview Box Foto QRIS Meja */}
              <div className="w-36 h-48 sm:w-44 sm:h-56 bg-white rounded-xl border-2 border-dashed border-slate-300 p-2 flex flex-col items-center justify-center relative overflow-hidden shadow-2xs flex-shrink-0">
                {qrisStaticImage ? (
                  <>
                    <img
                      src={qrisStaticImage}
                      alt="Stiker QRIS Meja Kasir"
                      className="w-full h-full object-contain rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setQrisStaticImage('');
                        showNotice('warning', 'Foto QRIS meja telah dihapus. Jangan lupa klik "Simpan".');
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition-transform hover:scale-110"
                      title="Hapus foto QRIS meja"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="text-center p-3">
                    <QrCode className="w-10 h-10 text-slate-300 mx-auto mb-1.5" />
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Belum ada foto stiker QRIS
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Klik tombol upload di samping
                    </span>
                  </div>
                )}
              </div>

              {/* Kontrol Upload & Informasi */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-all">
                    <Upload className="w-4 h-4" />
                    <span>Upload Foto QRIS dari HP / Komputer</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 3 * 1024 * 1024) {
                            showNotice('error', 'Ukuran foto maksimal 3 MB.');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => {
                            setQrisStaticImage(reader.result as string);
                            showNotice('success', 'Foto stiker QRIS berhasil dimuat! Klik "Simpan Seluruh Pengaturan" untuk menyimpan.');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      // Template QRIS Meja Resmi SMPIT Al Qalam
                      setQrisStaticImage('/logo-alqalam.png');
                      showNotice('success', 'Template QRIS resmi dipilih. Klik simpan untuk menyimpan.');
                    }}
                    className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
                  >
                    Gunakan Default Logo Al Qalam
                  </button>
                </div>

                <div className="p-3 bg-brand-50 border border-brand-200 rounded-xl text-[11px] text-brand-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💡 Cara Kerja QRIS Kertas Meja Kasir:</span>
                  </div>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-700">
                    <li>Stiker QRIS dicetak dan ditempel di meja kasir sekolah.</li>
                    <li>Saat pembeli ingin bayar QRIS, kasir klik tombol <strong>Bayar QRIS (F9)</strong> di kasir.</li>
                    <li>Sistem menampilkan total belanja di layar, dan pembeli memindai QRIS fisik di meja menggunakan aplikasi m-banking (BCA, Livin, BRImo, Dana, GoPay, ShopeePay).</li>
                    <li>Sistem kasir secara otomatis mendeteksi notifikasi dana masuk, memutar suara pelunasan berbahasa Indonesia, mengurangi stok secara atomik, dan langsung mencetak struk belanja.</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. INFORMASI BACKUP DATABASE & INTEGRITAS */}
        <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-white">
            <Database className="w-5 h-5 text-brand-400" />
            <h4 className="text-sm font-bold">Prosedur Backup & Restore Database</h4>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Database MySQL menggunakan engine <strong>InnoDB</strong> dengan relasi foreign key dan transaksi atomik ACID. Untuk menjalankan backup harian, gunakan perintah mysqldump berikut:
          </p>
          <div className="bg-black/50 p-3 rounded-lg font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
            mysqldump -u root -p pos_smpit_alqalam &gt; backup_pos_alqalam_$(date +%Y%m%d).sql
          </div>
        </div>

        {/* TOMBOL SIMPAN */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan Pengaturan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Seluruh Pengaturan Toko</span>
              </>
            )}
          </button>
        </div>
      </form>
    </AppLayout>
  );
}
