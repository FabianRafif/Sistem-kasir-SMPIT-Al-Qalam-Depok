'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  CheckCircle2,
  Loader2,
  Volume2,
  AlertCircle,
  Sparkles,
  Smartphone,
  Store,
  Check,
  CreditCard,
} from 'lucide-react';
import { formatRupiah } from '@/lib/format';
import { playQrisConfirmationVoice } from '@/lib/sound';

interface QrisPaymentModalProps {
  saleId: string;
  receiptNumber: string;
  grandTotal: number;
  qrCodeData?: string | null;
  onClose: () => void;
  onPaymentSuccess: (receiptData: any) => void;
}

export default function QrisPaymentModal({
  saleId,
  receiptNumber,
  grandTotal,
  qrCodeData,
  onClose,
  onPaymentSuccess,
}: QrisPaymentModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'FAILED'>('PENDING');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'TABLE' | 'DYNAMIC'>('TABLE');
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);

  // 1. Ambil Pengaturan Toko untuk menentukan Mode Default & Foto QRIS Meja
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setStoreSettings(data.data);
            if (data.data.qrisMode === 'STATIC' || data.data.qrisStaticImage) {
              setActiveTab('TABLE');
            } else {
              setActiveTab('DYNAMIC');
            }
          }
        }
      } catch (err) {
        console.warn('Gagal memuat pengaturan QRIS:', err);
      } finally {
        setLoadingSettings(false);
      }
    }
    loadSettings();
  }, []);

  // 2. Render QR Code Dinamis pada Canvas (apabila tab DYNAMIC dipilih)
  useEffect(() => {
    if (activeTab === 'DYNAMIC' && canvasRef.current) {
      const qrString =
        qrCodeData ||
        `00020101021226600016ID.CO.QRIS.WWW011893600000000000000052045499530336054${grandTotal}5802ID5914SMPIT AL QALAM6007JAKARTA62190715${receiptNumber}6304ABCD`;

      QRCode.toCanvas(canvasRef.current, qrString, {
        width: 210,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((err) => {
        console.error('Error rendering QR code canvas:', err);
      });
    }
  }, [activeTab, qrCodeData, grandTotal, receiptNumber]);

  // 3. Polling Realtime Status Pembayaran QRIS setiap 2 detik
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'PENDING') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/qris/status/${saleId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.isPaid || data.status === 'PAID') {
              setStatus('PAID');
              clearInterval(interval);

              // Putar suara konfirmasi bahasa Indonesia
              playQrisConfirmationVoice(saleId, grandTotal);

              // Beri jeda agar animasi sukses terlihat, lalu callback
              setTimeout(() => {
                onPaymentSuccess(data.receiptData);
              }, 1200);
            } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
              setStatus('FAILED');
              setErrorMessage('Pembayaran QRIS gagal atau dibatalkan.');
              clearInterval(interval);
            }
          }
        } catch (err) {
          console.warn('Polling status QRIS:', err);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [saleId, grandTotal, status, onPaymentSuccess]);

  // 4. Tombol Verifikasi & Konfirmasi Otomatis Dana Masuk
  const handleConfirmInflow = async () => {
    setIsVerifying(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/qris/simulate-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Gagal memverifikasi pembayaran masuk.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengonfirmasi transaksi QRIS.');
    } finally {
      setIsVerifying(false);
    }
  };

  const qrisImageSrc = storeSettings?.qrisStaticImage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto text-center animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-brand-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-100" />
            <div className="text-left">
              <h3 className="text-sm font-bold leading-tight">Pembayaran QRIS Kasir</h3>
              <p className="text-[11px] text-brand-100 font-mono">{receiptNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-brand-600 rounded-lg transition-colors text-white"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pilihan Mode: QRIS Kertas Meja vs Layar Dinamis */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('TABLE')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'TABLE'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-brand-600" />
            <span>QRIS Kertas Meja</span>
            <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold uppercase">
              Stiker
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DYNAMIC')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'DYNAMIC'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-brand-600" />
            <span>QRIS Layar Kasir</span>
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          {errorMessage && (
            <div className="w-full flex items-center gap-2 p-3 mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nominal Pembayaran */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 mb-4">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Tagihan Belanja
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tabular-nums mt-0.5">
              {formatRupiah(grandTotal)}
            </div>
          </div>

          {/* TAMPILAN TAB 1: QRIS KERTAS MEJA (STIKER DITEMPEL DI MEJA KASIR) */}
          {activeTab === 'TABLE' && (
            <div className="w-full flex flex-col items-center">
              {/* Box Ilustrasi / Preview Stiker Meja Kasir */}
              <div className="relative w-full max-w-[280px] p-3 bg-white border-2 border-brand-500 rounded-2xl shadow-sm flex flex-col items-center overflow-hidden">
                <div className="w-full bg-brand-50 border-b border-brand-100 py-1.5 px-2 mb-2 rounded-t-lg flex items-center justify-center gap-1.5 text-brand-800">
                  <Store className="w-3.5 h-3.5 text-brand-600" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wide">
                    QRIS MEJA SMPIT AL QALAM
                  </span>
                </div>

                {qrisImageSrc ? (
                  <div className="w-48 h-48 relative flex items-center justify-center p-1 bg-white rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrisImageSrc}
                      alt="Stiker QRIS Meja"
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-3 text-center">
                    <QrCode className="w-12 h-12 text-brand-500 mb-1" />
                    <span className="text-xs font-bold text-slate-800">Stiker QRIS di Meja</span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      Pembeli scan stiker yang tertempel di depan meja kasir
                    </span>
                  </div>
                )}

                <div className="mt-2 text-center">
                  <span className="text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full inline-block">
                    NMID: ID1020038848936 • SMPIT Al Qalam
                  </span>
                </div>

                {/* Overlay Status Lunas */}
                {status === 'PAID' && (
                  <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 animate-in fade-in zoom-in duration-200">
                    <CheckCircle2 className="w-16 h-16 text-white mb-2 animate-bounce" />
                    <span className="text-base font-black">PEMBAYARAN QRIS LUNAS</span>
                    <span className="text-xs text-emerald-100 mt-1">Stok dikurangi otomatis</span>
                    <span className="text-[10px] text-emerald-200 mt-2 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Audio pelunasan diputar
                    </span>
                  </div>
                )}
              </div>

              {/* Instruksi Kasir untuk Pembeli */}
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-left w-full text-[11px] text-amber-900">
                <span className="font-bold block mb-1">📌 Alur Pembeli di Meja Kasir:</span>
                <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                  <li>Minta pembeli memindai stiker QRIS yang tertempel di meja.</li>
                  <li>Pembeli mengetik nominal tagihan: <strong>{formatRupiah(grandTotal)}</strong>.</li>
                  <li>
                    Begitu pembeli menekan <em>Bayar</em> di HP mereka, sistem langsung mendeteksi dan menyelesaikan transaksi <strong>secara otomatis</strong>.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAMPILAN TAB 2: QRIS DINAMIS LAYAR KASIR */}
          {activeTab === 'DYNAMIC' && (
            <div className="w-full flex flex-col items-center">
              <div className="relative p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-center">
                <canvas ref={canvasRef} className="rounded-lg" />

                {/* Overlay Status Lunas */}
                {status === 'PAID' && (
                  <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 animate-in fade-in zoom-in duration-200">
                    <CheckCircle2 className="w-16 h-16 text-white mb-2 animate-bounce" />
                    <span className="text-base font-black">PEMBAYARAN QRIS LUNAS</span>
                    <span className="text-xs text-emerald-100 mt-1">Stok dikurangi otomatis</span>
                    <span className="text-[10px] text-emerald-200 mt-2 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Audio pelunasan diputar
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Pemantauan Otomatis (Polling Realtime 1.5s) */}
          {status === 'PENDING' && (
            <div className="mt-4 w-full flex flex-col items-center gap-2">
              <div className="flex items-center gap-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 w-full justify-center">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
                </span>
                <span>Menunggu Pembayaran dari HP Pembeli...</span>
              </div>
              <p className="text-[11px] text-slate-500 text-center leading-snug px-2">
                Kasir <strong>tidak perlu menekan apapun</strong>. Sistem otomatis mendeteksi mutasi masuk, memutar suara pelunasan, memotong stok, dan langsung mencetak struk belanja.
              </p>
            </div>
          )}

          {/* Tombol Aksi Batal & Simulasi Pengujian Demo */}
          {status === 'PENDING' && (
            <div className="mt-4 w-full pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300 active:scale-98"
              >
                Batalkan & Kembali ke Layar Kasir (Esc)
              </button>

              {/* Helper Pengujian Otomatis untuk Demonstrasi Sekolah */}
              <button
                type="button"
                onClick={handleConfirmInflow}
                disabled={isVerifying}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline py-1 transition-colors flex items-center justify-center gap-1.5"
                title="Mengirim sinyal simulasi webhook bank dari HP pembeli"
              >
                {isVerifying ? (
                  <Loader2 className="w-3 h-3 animate-spin text-brand-600" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-500" />
                )}
                <span>[Uji Demo] Simulasikan Pembeli Bayar di HP</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
