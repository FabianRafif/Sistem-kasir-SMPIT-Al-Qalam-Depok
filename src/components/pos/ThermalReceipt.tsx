'use client';

import React from 'react';
import Image from 'next/image';
import { ReceiptData } from '@/lib/types';
import { formatNumber } from '@/lib/format';
import { Printer, X } from 'lucide-react';

interface ThermalReceiptProps {
  receipt: ReceiptData;
  onClose?: () => void;
  autoPrint?: boolean;
}

export default function ThermalReceipt({ receipt, onClose, autoPrint = false }: ThermalReceiptProps) {
  React.useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  const handlePrint = () => {
    window.print();
  };

  const is80mm = receipt.paperSize === '80mm';
  const containerWidthClass = is80mm ? 'max-w-[360px]' : 'max-w-[280px]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
        {/* Modal Toolbar (Tidak dicetak) */}
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-brand-600" />
            <span className="text-xs font-bold text-slate-800">
              Pratinjau Struk Thermal ({receipt.paperSize || '58mm'})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Struk (Enter)</span>
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tampilan Fisik Struk Thermal */}
        <div className="p-4 bg-slate-200/50 flex justify-center overflow-y-auto flex-1">
          <div
            id="printable-receipt"
            className={`receipt-printable bg-white p-4 shadow-md font-mono text-[12px] text-black leading-tight border border-slate-200 ${containerWidthClass} w-full`}
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {/* Header Toko */}
            <div className="text-center mb-2">
              <div className="w-12 h-12 mx-auto mb-1 relative flex items-center justify-center">
                <Image
                  src="/logo-alqalam.png"
                  alt="Logo SMPIT Al Qalam"
                  width={80}
                  height={80}
                  unoptimized
                  className="w-full h-full object-contain filter grayscale contrast-200"
                />
              </div>
              <p className="font-bold text-[13px] tracking-wide">{receipt.schoolName.toUpperCase()}</p>
              <p className="font-bold text-[12px]">{receipt.storeName.toUpperCase()}</p>
              {receipt.address && <p className="text-[10px] text-slate-700 mt-0.5">{receipt.address}</p>}
              {receipt.phone && <p className="text-[10px] text-slate-700">Telp: {receipt.phone}</p>}
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Info Transaksi */}
            <div className="text-[11px] space-y-0.5 mb-2">
              <div className="flex justify-between">
                <span>No Struk :</span>
                <span className="font-bold">{receipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir :</span>
                <span>{receipt.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu :</span>
                <span>{receipt.date} {receipt.time}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Daftar Barang */}
            <div className="space-y-1.5 mb-2">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="flex justify-between text-slate-800 pl-2">
                    <span>
                      {item.quantity} x {formatNumber(item.unitPrice)}
                    </span>
                    <span className="font-bold">{formatNumber(item.lineTotal)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Ringkasan Biaya */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatNumber(receipt.subtotal)}</span>
              </div>
              {receipt.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span>-{formatNumber(receipt.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-[12px] pt-1 border-t border-dotted border-black">
                <span>TOTAL</span>
                <span>Rp {formatNumber(receipt.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>Metode</span>
                <span className="font-bold">{receipt.paymentMethod}</span>
              </div>

              {receipt.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span>Tunai</span>
                    <span>{formatNumber(receipt.cashReceived || receipt.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>Kembali</span>
                    <span>{formatNumber(receipt.changeAmount || 0)}</span>
                  </div>
                </>
              )}

              {receipt.paymentMethod === 'QRIS' && (
                <div className="flex justify-between text-[10px]">
                  <span>Status QRIS</span>
                  <span className="font-bold">LUNAS TERVERIFIKASI</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-black my-2"></div>

            {/* Footer Struk */}
            <div className="text-center text-[10px] space-y-1 pt-1">
              {receipt.footerNotes ? (
                <p className="whitespace-pre-line text-slate-800">{receipt.footerNotes}</p>
              ) : (
                <>
                  <p>Terima kasih telah berbelanja.</p>
                  <p>Barang yang dibeli tidak dapat ditukar.</p>
                </>
              )}
              <p className="text-[9px] text-slate-500 pt-1">
                {receipt.date} {receipt.time}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
