'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Banknote, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { formatRupiah, formatNumber } from '@/lib/format';

interface CashPaymentModalProps {
  grandTotal: number;
  subtotal: number;
  discountAmount: number;
  totalItems: number;
  onClose: () => void;
  onConfirm: (cashReceived: number) => Promise<void>;
}

export default function CashPaymentModal({
  grandTotal,
  subtotal,
  discountAmount,
  totalItems,
  onClose,
  onConfirm,
}: CashPaymentModalProps) {
  const [cashInput, setCashInput] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Autofocus input uang diterima
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const cashReceived = parseFloat(cashInput) || 0;
  const changeAmount = cashReceived - grandTotal;
  const isSufficient = cashReceived >= grandTotal;

  // Preset pecahan uang rupiah umum
  const quickNominals = [grandTotal, 10000, 20000, 50000, 100000].filter(
    (val, idx, self) => val >= grandTotal && self.indexOf(val) === idx
  );

  const handleSelectNominal = (val: number) => {
    setCashInput(val.toString());
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSufficient) {
      setError(`Uang tunai kurang sebesar ${formatRupiah(grandTotal - cashReceived)}.`);
      return;
    }

    setProcessing(true);
    setError('');
    try {
      await onConfirm(cashReceived);
    } catch (err: any) {
      setError(err.message || 'Gagal memproses pembayaran tunai.');
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-[480px] overflow-hidden my-auto">
        {/* Header Modal */}
        <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-700/60 rounded-xl">
              <Banknote className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Pembayaran Tunai (Cash)</h3>
              <p className="text-xs text-emerald-100 font-medium">
                {totalItems} item belanja • No Struk Baru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-emerald-700 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tagihan Total */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Yang Harus Dibayar
            </span>
            <div className="text-3xl font-black text-slate-900 font-mono tabular-nums mt-1">
              {formatRupiah(grandTotal)}
            </div>
            {discountAmount > 0 && (
              <span className="inline-block mt-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Hemat {formatRupiah(discountAmount)}
              </span>
            )}
          </div>

          {/* Input Uang Diterima */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Uang Diterima dari Pembeli (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-base font-mono">
                Rp
              </span>
              <input
                ref={inputRef}
                type="number"
                min="0"
                step="500"
                required
                placeholder="Masukkan nominal uang"
                value={cashInput}
                onChange={(e) => {
                  setCashInput(e.target.value);
                  setError('');
                }}
                className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-300 focus:border-emerald-500 rounded-xl text-xl font-bold font-mono tabular-nums text-slate-900 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Tombol Pecahan Cepat */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Pilihan Cepat Uang Pas / Pecahan:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectNominal(grandTotal)}
                className="px-2.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg text-xs font-bold transition-all text-center"
              >
                Uang Pas
              </button>
              {quickNominals
                .filter((n) => n !== grandTotal)
                .slice(0, 5)
                .map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => handleSelectNominal(nom)}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-all font-mono"
                  >
                    {formatNumber(nom)}
                  </button>
                ))}
            </div>
          </div>

          {/* Kembalian */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              isSufficient
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-slate-100 border-slate-200 text-slate-500'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider">
                {isSufficient ? 'Kembalian' : 'Kekurangan Uang'}
              </span>
              <span
                className={`text-2xl font-black font-mono tabular-nums ${
                  isSufficient ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {isSufficient ? formatRupiah(changeAmount) : formatRupiah(grandTotal - cashReceived)}
              </span>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="w-32 py-3 px-4 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors text-center flex-shrink-0"
            >
              Batal (Esc)
            </button>
            <button
              type="submit"
              disabled={!isSufficient || processing}
              className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap min-w-0"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="truncate">Memproses...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-white" />
                  <span className="truncate">Selesaikan & Cetak (Enter)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
