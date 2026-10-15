'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileSpreadsheet, CheckCircle, AlertTriangle, AlertCircle, Loader2, Download } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface ImportProductsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportProductsModal({ onClose, onSuccess }: ImportProductsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [importing, setImporting] = useState<boolean>(false);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'preview' | 'finished'>('upload');

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Produk': 'Susu Cokelat Kotak 200ml',
        'Barcode': '8991234567890',
        'SKU': 'PRD-SUSU-01',
        'Kategori': 'Minuman',
        'Satuan': 'kotak',
        'Harga Modal': 4500,
        'Harga Jual': 6000,
        'Stok Awal': 24,
        'Stok Minimum': 6,
      },
      {
        'Nama Produk': 'Biskuit Gandum Cokelat 100g',
        'Barcode': '8999876543210',
        'SKU': 'PRD-BSK-01',
        'Kategori': 'Makanan Ringan',
        'Satuan': 'bungkus',
        'Harga Modal': 7000,
        'Harga Jual': 9000,
        'Stok Awal': 30,
        'Stok Minimum': 8,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Produk');
    XLSX.writeFile(wb, 'template-import-produk-alqalam.xlsx');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setAnalyzing(true);
    setErrorMessage('');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(sheet) as any[];

      if (rawJson.length === 0) {
        setErrorMessage('File spreadsheet kosong atau tidak ada data yang terbaca.');
        setAnalyzing(false);
        return;
      }

      // Normalisasi kolom fleksibel
      const normalized = rawJson.map((r) => ({
        name: r['Nama Produk'] || r['name'] || r['Nama'] || '',
        barcode: r['Barcode'] || r['barcode'] ? String(r['Barcode'] || r['barcode']).trim() : null,
        sku: r['SKU'] || r['sku'] ? String(r['SKU'] || r['sku']).trim() : '',
        category: r['Kategori'] || r['category'] || 'Produk Lainnya',
        unit: r['Satuan'] || r['unit'] || 'pcs',
        costPrice: parseFloat(r['Harga Modal'] || r['cost_price'] || r['costPrice'] || 0),
        sellingPrice: parseFloat(r['Harga Jual'] || r['selling_price'] || r['sellingPrice'] || 0),
        stockQty: parseInt(r['Stok Awal'] || r['stock_qty'] || r['stockQty'] || 0, 10),
        minimumStock: parseInt(r['Stok Minimum'] || r['minimum_stock'] || r['minimumStock'] || 5, 10),
      }));

      setParsedRows(normalized);

      // Jalankan validasi awal (dry-run) ke backend
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: normalized, dryRun: true }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMessage(result.error || 'Gagal memvalidasi data import.');
      } else {
        setPreviewResult(result);
        setStep('preview');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membaca file spreadsheet.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteImport = async () => {
    setImporting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedRows, dryRun: false }),
      });

      const result = await res.json();
      if (!res.ok) {
        setErrorMessage(result.error || 'Import gagal.');
        return;
      }

      setStep('finished');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem saat proses import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold leading-tight">Import Produk Massal (Excel / CSV)</h3>
              <p className="text-[11px] text-slate-400">
                Pendaftaran seluruh barang fisik minimarket sekaligus
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Gunakan Template Resmi</h4>
                  <p className="text-[11px] text-slate-500">
                    Format kolom standar: Nama Produk, Barcode, SKU, Kategori, Harga Modal, Harga Jual, Stok.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template</span>
                </button>
              </div>

              {/* Area Drag / Upload File */}
              <label className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-brand-50/30 transition-all text-center">
                <Upload className="w-10 h-10 text-brand-500 mb-2" />
                <span className="text-sm font-bold text-slate-800">
                  Pilih file spreadsheet (.xlsx, .xls, .csv)
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Maksimal 1.000 produk per file
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {analyzing && (
                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-brand-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memeriksa dan memvalidasi baris data...</span>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && previewResult && (
            <div className="space-y-4">
              {/* Ringkasan Validasi */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Total Baris</span>
                  <div className="text-lg font-black text-slate-800">
                    {previewResult.summary.totalRows}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Valid & Siap</span>
                  <div className="text-lg font-black text-emerald-700">
                    {previewResult.summary.validCount}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-rose-700">Bermasalah</span>
                  <div className="text-lg font-black text-rose-700">
                    {previewResult.summary.invalidCount}
                  </div>
                </div>
              </div>

              {/* Laporan Baris Gagal Jika Ada */}
              {previewResult.invalidRows?.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl max-h-40 overflow-y-auto space-y-1.5 text-xs text-rose-800">
                  <span className="font-bold block">Peringatan Validasi (Baris Gagal):</span>
                  {previewResult.invalidRows.map((inv: any, idx: number) => (
                    <div key={idx} className="border-b border-rose-100 pb-1 last:border-0">
                      Baris #{inv.rowNumber} ({inv.data?.name || 'Tanpa Nama'}):{' '}
                      <span className="font-semibold text-rose-900">{inv.errors.join(', ')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabel Pratinjau 5 Baris Valid */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Nama</th>
                      <th className="py-2 px-3">Barcode</th>
                      <th className="py-2 px-3">Kategori</th>
                      <th className="py-2 px-3 text-right">Harga Jual</th>
                      <th className="py-2 px-3 text-center">Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResult.previewValid?.map((row: any, i: number) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-medium text-slate-800">{row.name}</td>
                        <td className="py-2 px-3 font-mono text-slate-500">{row.barcode || '-'}</td>
                        <td className="py-2 px-3">{row.categoryName}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {formatNumber(row.sellingPrice)}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{row.stockQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tombol Eksekusi */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Pilih File Lain
                </button>
                <button
                  type="button"
                  disabled={previewResult.summary.validCount === 0 || importing}
                  onClick={handleExecuteImport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ke Database...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Impor {previewResult.summary.validCount} Produk Sah</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'finished' && (
            <div className="text-center py-6 space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Import Produk Berhasil!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Seluruh produk yang sah telah disimpan ke dalam database MySQL dan langsung siap dipindai di kasir.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Tutup & Kembali ke Daftar Produk
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
