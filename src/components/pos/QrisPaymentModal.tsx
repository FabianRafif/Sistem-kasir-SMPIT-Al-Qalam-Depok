'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  CheckCircle2,
  Loader2,
  Volume2,
  AlertCircle,
  Smartphone,
  Store,
  ArrowLeft,
  Monitor,
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
    let isMounted = true;
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && isMounted) {
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
        if (isMounted) setLoadingSettings(false);
      }
    }
    loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Render QR Code pada Canvas saat Mode Layar Kasir Aktif
  useEffect(() => {
    if (activeTab === 'DYNAMIC' && canvasRef.current) {
      // Prioritaskan payload QRIS asli dari upload admin toko
      const defaultStorePayload =
        '00020101021126610014COM.GO-JEK.WWW01189360091434872473310210G4872473310303UMI51440014ID.CO.QRIS.WWW0215ID10264693049540303UMI5204899953033605802ID5916Jimpitan Digital6008BANYUMAS61055313362070703A0163041C04';

      const isDummyString = qrCodeData && qrCodeData.startsWith('00020101021226600016ID.CO.QRIS.WWW0118936');
      const validPayload = !isDummyString && qrCodeData ? qrCodeData : storeSettings?.qrisPayload || defaultStorePayload;

      QRCode.toCanvas(canvasRef.current, validPayload, {
        width: 290,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((err) => {
        console.error('Error rendering QR code canvas:', err);
      });
    }
  }, [activeTab, qrCodeData, storeSettings]);

  const isSubmittingRef = useRef<boolean>(false);

  // 3. Polling Realtime Status Pembayaran QRIS setiap 2 detik (Mendeteksi Webhook Otomatis)
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

              // Putar suara konfirmasi pelunasan bahasa Indonesia
              playQrisConfirmationVoice(saleId, grandTotal);

              // Callback untuk cetak struk thermal otomatis (respons cepat 200ms)
              setTimeout(() => {
                onPaymentSuccess(data.receiptData);
              }, 200);
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

  // 4. Tombol Utama Kasir: Konfirmasi Pembayaran Diterima (Lunas & Cetak Struk)
  const handleConfirmInflow = useCallback(async () => {
    if (isSubmittingRef.current || status === 'PAID') return;
    isSubmittingRef.current = true;
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
        isSubmittingRef.current = false;
        setIsVerifying(false);
      } else if (data.success && data.receiptData) {
        setStatus('PAID');
        playQrisConfirmationVoice(saleId, grandTotal);
        // Transisi instan ke modal cetak struk
        setTimeout(() => {
          onPaymentSuccess(data.receiptData);
        }, 200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengonfirmasi transaksi QRIS.');
      isSubmittingRef.current = false;
      setIsVerifying(false);
    }
  }, [status, saleId, grandTotal, onPaymentSuccess]);

  // 5. Dukungan Pintasan Keyboard Kasir (Enter = Konfirmasi Lunas, Esc = Tutup/Kembali)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'PENDING') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmInflow();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (activeTab === 'DYNAMIC') {
          setActiveTab('TABLE');
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, activeTab, handleConfirmInflow, onClose]);

  // Gambar QRIS Toko saat Pembayaran Kasir: WAJIB HANYA KODE QR MURNI (bukan poster)
  const qrisImageSrc = '/api/qris/image?view=pure';

  // =========================================================================
  // MODE 2: QRIS LAYAR KASIR (MODE LAYAR PENUH KHUSUS PEMBELI)
  // =========================================================================
  if (activeTab === 'DYNAMIC') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
        {/* Header Mode Layar Penuh */}
        <div className="w-full max-w-4xl mx-auto flex items-center justify-between py-2 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('TABLE')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-brand-400" />
            <span>Kembali ke Mode Meja</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              Layar Pembeli Aktif • {receiptNumber}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-rose-900/60 text-slate-300 hover:text-white transition-all border border-slate-700 cursor-pointer"
            aria-label="Tutup"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Utama Layar Penuh: Nominal Tagihan Besar + QR Code Murni */}
        <div className="flex-1 flex flex-col items-center justify-center py-4 my-auto w-full max-w-md mx-auto text-center space-y-4">
          {errorMessage && (
            <div className="w-full flex items-center gap-2 p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nominal Tagihan Besar & Jelas untuk Pembeli */}
          <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl py-3 px-6 shadow-xl">
            <span className="text-[11px] font-bold text-brand-300 uppercase tracking-widest block mb-1">
              Total Tagihan Belanja
            </span>
            <div className="text-4xl sm:text-5xl font-black text-white font-mono tabular-nums tracking-tight">
              {formatRupiah(grandTotal)}
            </div>
          </div>

          {/* Box Kode QR Murni Layar Penuh */}
          <div className="relative p-5 bg-white rounded-3xl shadow-2xl border-4 border-slate-800 flex flex-col items-center justify-center">
            <div className="w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center bg-white rounded-2xl overflow-hidden p-1">
              <canvas ref={canvasRef} className="max-w-full max-h-full rounded-xl" />
            </div>

            {/* Overlay Status Lunas */}
            {status === 'PAID' && (
              <div className="absolute inset-0 bg-emerald-600/98 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center text-white p-6 animate-in fade-in zoom-in duration-200">
                <CheckCircle2 className="w-20 h-20 text-white mb-3 animate-bounce" />
                <span className="text-2xl font-black tracking-wider">PEMBAYARAN LUNAS</span>
                <span className="text-sm text-emerald-100 mt-1">Struk otomatis tercetak</span>
                <span className="text-xs text-emerald-200 mt-4 flex items-center gap-1.5 bg-emerald-700/80 px-3 py-1.5 rounded-full font-medium">
                  <Volume2 className="w-4 h-4" /> Audio pelunasan berbunyi
                </span>
              </div>
            )}
          </div>

          <div className="text-center">
            <span className="text-[11px] text-slate-400 font-medium">
              Scan dengan aplikasi BCA, Mandiri, BRI, BNI, BSI, GoPay, Dana, OVO, ShopeePay
            </span>
          </div>
        </div>

        {/* Tombol Konfirmasi Biru (Sama Persis) */}
        <div className="w-full max-w-md mx-auto pt-2 pb-1 flex flex-col items-center gap-2">
          {status === 'PENDING' && (
            <button
              type="button"
              onClick={handleConfirmInflow}
              disabled={isVerifying || status === 'PAID'}
              className="w-full py-4 px-6 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-2xl text-base font-bold shadow-xl shadow-brand-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Memproses Pelunasan Transaksi...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>Konfirmasi Pembayaran Diterima (Lunas & Cetak Struk)</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center justify-between w-full px-2 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Deteksi otomatis aktif
            </span>
            <span className="text-slate-400 font-mono text-[10px]">Pintasan: [Enter] = Konfirmasi • [Esc] = Kembali</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODE 1: QRIS KERTAS MEJA (TAMPILAN MODAL STANDAR KASIR)
  // =========================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto text-center animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-brand-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold leading-tight">Pembayaran QRIS Kasir</h3>
              <p className="text-[11px] text-brand-100 font-mono">No. Invoice: {receiptNumber}</p>
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

        {/* Tab Pilihan Mode: QRIS Kertas Meja vs Layar Kasir */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('TABLE')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'TABLE'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Store className="w-4 h-4 text-brand-600" />
            <span>QRIS Kertas Meja (Stiker Toko)</span>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold uppercase">
              Aktif
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('DYNAMIC')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'DYNAMIC'
                ? 'bg-white text-brand-700 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4 text-brand-600" />
            <span>QRIS Layar Kasir</span>
            <span className="text-[9px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded font-extrabold uppercase">
              Mode Layar
            </span>
          </button>
        </div>

        <div className="p-5 flex flex-col items-center">
          {errorMessage && (
            <div className="w-full flex items-center gap-2 p-3 mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nominal Tagihan Pembayaran */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mb-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Tagihan Belanja
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono tabular-nums mt-0.5">
              {formatRupiah(grandTotal)}
            </div>
          </div>

          {/* TAMPILAN TAB 1: QRIS KERTAS MEJA (QR CODE MURNI) */}
          <div className="w-full flex flex-col items-center">
            {/* Box QR Code Murni */}
            <div className="relative p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center">
              <div className="w-60 h-60 sm:w-64 sm:h-64 flex items-center justify-center bg-white rounded-xl overflow-hidden p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrisImageSrc}
                  alt="Kode QRIS Toko"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.endsWith('/qris-pure.png')) {
                      target.src = '/qris-pure.png';
                    }
                  }}
                />
              </div>

              {/* Overlay Status Lunas */}
              {status === 'PAID' && (
                <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 animate-in fade-in zoom-in duration-200">
                  <CheckCircle2 className="w-16 h-16 text-white mb-2 animate-bounce" />
                  <span className="text-lg font-black tracking-wide">PEMBAYARAN QRIS LUNAS</span>
                  <span className="text-xs text-emerald-100 mt-1">Stok terpotong otomatis & struk siap dicetak</span>
                  <span className="text-[10px] text-emerald-200 mt-3 flex items-center gap-1.5 bg-emerald-700/60 px-2.5 py-1 rounded-full">
                    <Volume2 className="w-3.5 h-3.5" /> Audio pelunasan berbunyi
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* TOMBOL AKSI UTAMA KASIR */}
          {status === 'PENDING' && (
            <div className="mt-4 w-full flex flex-col gap-2.5">
              {/* Tombol Konfirmasi Pembayaran Kasir (Warna Biru Brand Senada) */}
              <button
                type="button"
                onClick={handleConfirmInflow}
                disabled={isVerifying || status === 'PAID'}
                className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                    <span>Memproses Pelunasan Transaksi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>Konfirmasi Pembayaran Diterima (Lunas & Cetak Struk)</span>
                  </>
                )}
              </button>

              {/* Status Monitoring Webhook & Pintasan Keyboard */}
              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  Pemantauan Otomatis Webhook Aktif
                </span>
                <span className="text-slate-400 font-mono text-[10px]">Pintasan: Tekan [Enter]</span>
              </div>

              {/* Tombol Batal Transaksi */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all border border-slate-200 mt-1"
              >
                Batalkan & Kembali ke Layar Kasir (Esc)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
