'use client';

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X, QrCode, CheckCircle2, Loader2, Volume2, AlertCircle, Sparkles } from 'lucide-react';
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
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 1. Render QR Code pada Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const qrString =
        qrCodeData ||
        `00020101021226600016ID.CO.QRIS.WWW011893600000000000000052045499530336054${grandTotal}5802ID5914SMPIT AL QALAM6007JAKARTA62190715${receiptNumber}6304ABCD`;

      QRCode.toCanvas(canvasRef.current, qrString, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      }).catch((err) => {
        console.error('Error rendering QR code canvas:', err);
      });
    }
  }, [qrCodeData, grandTotal, receiptNumber]);

  // 2. Polling Status Pembayaran QRIS setiap 2 detik
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

              // Beri jeda 1 detik agar animasi sukses terlihat, lalu callback
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

  // 3. Tombol Simulasi Pembayaran QRIS (Sandbox Testing)
  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch('/api/qris/simulate-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Simulasi pembayaran gagal.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimulasikan QRIS.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden my-auto text-center">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-brand-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            <div className="text-left">
              <h3 className="text-sm font-bold leading-tight">Pembayaran QRIS Dinamis</h3>
              <p className="text-[11px] text-brand-100">{receiptNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-brand-600 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          {errorMessage && (
            <div className="w-full flex items-center gap-2 p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-left">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nominal QRIS */}
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Pembayaran
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-0.5 mb-4">
            {formatRupiah(grandTotal)}
          </div>

          {/* Kontainer QR Code */}
          <div className="relative p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-sm flex items-center justify-center">
            <canvas ref={canvasRef} className="rounded-lg" />

            {/* Overlay Status Lunas */}
            {status === 'PAID' && (
              <div className="absolute inset-0 bg-emerald-600/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 animate-in fade-in zoom-in duration-200">
                <CheckCircle2 className="w-16 h-16 text-white mb-2 animate-bounce" />
                <span className="text-base font-black">PEMBAYARAN LUNAS</span>
                <span className="text-xs text-emerald-100 mt-1">Stok telah dikurangi otomatis</span>
                <span className="text-[10px] text-emerald-200 mt-2 flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Audio konfirmasi diputar
                </span>
              </div>
            )}
          </div>

          {/* Indikator Menunggu */}
          {status === 'PENDING' && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menunggu Pembeli Scan QRIS...</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Sistem akan memverifikasi pembayaran secara otomatis
              </p>
            </div>
          )}

          {/* Tombol Simulasi Pembayaran untuk Demo / UAT Sekolah */}
          {status === 'PENDING' && (
            <div className="mt-5 w-full pt-4 border-t border-slate-100 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isSimulating}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-300"
              >
                {isSimulating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>Simulasi Bayar QRIS (Uji Demo)</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-slate-500 hover:text-slate-700 py-1"
              >
                Batalkan & Kembali ke Kasir (Esc)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
