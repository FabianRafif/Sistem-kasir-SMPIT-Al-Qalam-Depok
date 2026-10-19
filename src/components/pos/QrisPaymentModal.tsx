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
  CreditCard,
  Check,
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

  // 2. Render QR Code Dinamis pada Canvas (apabila tab DYNAMIC dipilih)
  useEffect(() => {
    if (activeTab === 'DYNAMIC' && canvasRef.current) {
      const qrString =
        qrCodeData ||
        `00020101021226600016ID.CO.QRIS.WWW011893600000000000000052045499530336054${grandTotal}5802ID5914SMPIT AL QALAM6007JAKARTA62190715${receiptNumber}6304ABCD`;

      QRCode.toCanvas(canvasRef.current, qrString, {
        width: 230,
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

              // Callback untuk cetak struk thermal otomatis
              setTimeout(() => {
                onPaymentSuccess(data.receiptData);
              }, 1000);
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
    if (isVerifying || status === 'PAID') return;
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
      } else if (data.success && data.receiptData) {
        setStatus('PAID');
        playQrisConfirmationVoice(saleId, grandTotal);
        setTimeout(() => {
          onPaymentSuccess(data.receiptData);
        }, 900);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengonfirmasi transaksi QRIS.');
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, status, saleId, grandTotal, onPaymentSuccess]);

  // 5. Dukungan Pintasan Keyboard Kasir (Enter = Konfirmasi Lunas, Esc = Tutup)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== 'PENDING') return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmInflow();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleConfirmInflow, onClose]);

  // Gambar QRIS Toko: Gunakan stream handal /api/qris/image jika database kosong
  const qrisImageSrc = storeSettings?.qrisStaticImage || '/api/qris/image';

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
            <Smartphone className="w-4 h-4 text-brand-600" />
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

          {/* Nominal Tagihan Pembayaran */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mb-3.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Tagihan Belanja
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono tabular-nums mt-0.5">
              {formatRupiah(grandTotal)}
            </div>
          </div>

          {/* TAMPILAN TAB 1: QRIS KERTAS MEJA (FOTO RESMI STIKER KASIR TOKO) */}
          {activeTab === 'TABLE' && (
            <div className="w-full flex flex-col items-center">
              {/* Box Stiker Meja Kasir */}
              <div className="relative w-full max-w-[340px] p-3 bg-white border-2 border-brand-500 rounded-2xl shadow-sm flex flex-col items-center overflow-hidden">
                <div className="w-full bg-brand-50 border-b border-brand-100 py-1.5 px-3 mb-2 rounded-t-lg flex items-center justify-between text-brand-800">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-brand-600" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wide">
                      QRIS SMPIT AL QALAM
                    </span>
                  </div>
                  <span className="text-[9px] bg-brand-200/80 text-brand-900 px-1.5 py-0.5 rounded font-extrabold">
                    RESMI
                  </span>
                </div>

                {/* Tampilan Gambar QRIS Toko */}
                <div className="w-full min-h-[220px] max-h-[300px] bg-slate-50 border border-slate-100 rounded-xl p-2 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisImageSrc}
                    alt="Stiker QRIS Meja Toko"
                    className="max-h-[280px] w-auto max-w-full object-contain rounded-lg shadow-2xs"
                    onError={(e) => {
                      // Fallback jika path utama bermasalah
                      const target = e.currentTarget;
                      if (!target.src.endsWith('/qris-store.jpg')) {
                        target.src = '/qris-store.jpg';
                      }
                    }}
                  />
                </div>

                <div className="mt-2 text-center w-full">
                  <span className="text-[10px] font-bold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-full inline-block">
                    Semua Bank (BCA, Mandiri, BRI, BNI, BSI) & E-Wallet (GoPay, Dana, OVO, ShopeePay)
                  </span>
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

              {/* Panduan Singkat Kasir */}
              <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-left w-full text-xs text-amber-950">
                <span className="font-bold flex items-center gap-1.5 text-amber-900 mb-1">
                  <Check className="w-4 h-4 text-amber-600" />
                  Alur Pembayaran Kasir:
                </span>
                <p className="text-[11px] text-slate-700 leading-relaxed">
                  1. Minta pembeli memindai QRIS di meja / layar & mentransfer nominal <strong>{formatRupiah(grandTotal)}</strong>.<br/>
                  2. Begitu pembeli menunjukkan bukti bayar berhasil di HP, klik tombol hijau <strong>"Konfirmasi Pembayaran Diterima"</strong> di bawah (atau tekan <strong>Enter</strong>) untuk mencetak struk.
                </p>
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
                    <span className="text-lg font-black">PEMBAYARAN QRIS LUNAS</span>
                    <span className="text-xs text-emerald-100 mt-1">Stok dikurangi otomatis</span>
                    <span className="text-[10px] text-emerald-200 mt-2 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Audio pelunasan diputar
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TOMBOL AKSI UTAMA KASIR */}
          {status === 'PENDING' && (
            <div className="mt-4 w-full flex flex-col gap-2.5">
              {/* Tombol Konfirmasi Pembayaran Kasir */}
              <button
                type="button"
                onClick={handleConfirmInflow}
                disabled={isVerifying}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-75 disabled:pointer-events-none cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Memproses Pelunasan Transaksi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
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
