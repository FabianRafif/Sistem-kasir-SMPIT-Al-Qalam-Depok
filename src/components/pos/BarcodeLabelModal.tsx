'use client';

import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer } from 'lucide-react';
import { formatRupiah } from '@/lib/format';

interface BarcodeLabelModalProps {
  product: {
    name: string;
    barcode?: string | null;
    sku: string;
    sellingPrice: number;
  };
  onClose: () => void;
}

export default function BarcodeLabelModal({ product, onClose }: BarcodeLabelModalProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const codeToRender = product.barcode || product.sku;

  useEffect(() => {
    if (svgRef.current && codeToRender) {
      try {
        JsBarcode(svgRef.current, codeToRender, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: true,
          font: 'monospace',
          fontSize: 12,
          textMargin: 2,
        });
      } catch (err) {
        console.error('Error generating barcode label:', err);
      }
    }
  }, [codeToRender]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden my-auto">
        <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between no-print">
          <span className="text-xs font-bold text-slate-800">Cetak Label Barcode</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          {/* Label Fisik */}
          <div
            id="printable-barcode"
            className="receipt-printable bg-white p-4 border border-dashed border-slate-400 rounded-lg flex flex-col items-center w-64 shadow-xs"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              SMPIT AL QALAM MINIMARKET
            </span>
            <span className="text-xs font-bold text-slate-900 mt-1 truncate max-w-full">
              {product.name}
            </span>
            <div className="my-2">
              <svg ref={svgRef} className="max-w-full"></svg>
            </div>
            <span className="text-sm font-black font-mono text-slate-900">
              {formatRupiah(product.sellingPrice)}
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 no-print">
            Tempelkan label ini pada kemasan barang fisik yang tidak memiliki barcode bawaan pabrik.
          </p>

          <div className="mt-5 w-full flex items-center gap-2 no-print">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Label</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
