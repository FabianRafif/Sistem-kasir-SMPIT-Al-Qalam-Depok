'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  DollarSign,
  Banknote,
  QrCode,
  Package,
  Loader2,
  PieChart,
} from 'lucide-react';
import { formatRupiah, formatNumber, formatDateTime, formatDateOnly } from '@/lib/format';

export default function ReportsPage() {
  const [period, setPeriod] = useState<string>('today');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (period === 'custom' && dateFrom && dateTo) {
        params.append('dateFrom', dateFrom);
        params.append('dateTo', dateTo);
      }

      const res = await fetch(`/api/reports?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({ period, format: 'csv' });
    if (period === 'custom' && dateFrom && dateTo) {
      params.append('dateFrom', dateFrom);
      params.append('dateTo', dateTo);
    }
    window.open(`/api/reports?${params.toString()}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const summary = reportData?.summary || {};
  const topProducts = reportData?.topSellingProducts || [];

  return (
    <AppLayout
      title="Laporan Penjualan & Keuangan"
      subtitle="Analisis omzet kotor, omzet bersih, metode bayar, estimasi laba kotor, dan ekspor CSV"
    >
      <div className="space-y-6 select-none">
        {/* TOOLBAR FILTER PERIODE & EKSPOR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {['today', 'week', 'month', 'year'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {p === 'today'
                  ? 'Hari Ini'
                  : p === 'week'
                  ? '7 Hari Terakhir'
                  : p === 'month'
                  ? 'Bulan Ini'
                  : 'Tahun Ini'}
              </button>
            ))}

            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === 'custom'
                  ? 'bg-brand-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Rentang Khusus
            </button>

            {period === 'custom' && (
              <div className="flex items-center gap-2 pl-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2 py-1 text-xs border rounded bg-white"
                />
                <span className="text-xs text-slate-400">s/d</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2 py-1 text-xs border rounded bg-white"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export CSV (Aman Formula)</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4 text-brand-600" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* KONTEN LAPORAN */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
            <span className="text-xs font-semibold">Menghitung agregasi data laporan keuangan...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* GRID METRIK KEUANGAN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Omzet Kotor */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Omzet Kotor Penjualan
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                  {formatRupiah(summary.omzetKotor || 0)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Sebelum potongan diskon kasir
                </div>
              </div>

              {/* Omzet Bersih */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Omzet Bersih (Net Sales)
                </span>
                <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums mt-1">
                  {formatRupiah(summary.omzetBersih || 0)}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                  {summary.totalDiskon > 0
                    ? `Diskon terpotong: ${formatRupiah(summary.totalDiskon)}`
                    : 'Tidak ada diskon'}
                </div>
              </div>

              {/* Estimasi Laba Kotor (Gross Margin) */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-brand-700 uppercase tracking-wider block">
                  Perkiraan Laba Kotor (Gross Profit)
                </span>
                <div className="text-2xl font-black text-brand-700 font-mono tabular-nums mt-1">
                  {formatRupiah(summary.estimasiLabaKotor || 0)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Omzet Bersih dikurangi Total HPP
                </div>
              </div>

              {/* Jumlah Transaksi Lunas */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Transaksi Lunas & Barang
                </span>
                <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                  {summary.jumlahTransaksiLunas || 0} struk
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Total {formatNumber(summary.totalItemTerjual || 0)} unit barang terjual
                </div>
              </div>
            </div>

            {/* BREAKDOWN METODE PEMBAYARAN: TUNAI VS QRIS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
                    Total Transaksi Tunai (Cash)
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                    {formatRupiah(summary.totalTunai || 0)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Uang kas masuk ke laci fisik kasir sekolah
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Banknote className="w-8 h-8" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-700 uppercase tracking-wider block">
                    Total Transaksi QRIS Digital
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                    {formatRupiah(summary.totalQris || 0)}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Dana masuk langsung ke rekening bank/QRIS sekolah
                  </p>
                </div>
                <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                  <QrCode className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* TABEL PRODUK PALING LAKU */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-brand-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Peringkat Produk Terlaris Periode Ini
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">Berdasarkan kuantitas terjual</span>
              </div>

              {topProducts.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Tidak ada data penjualan pada rentang periode ini.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">No</th>
                      <th className="py-2.5 px-4">Nama Produk</th>
                      <th className="py-2.5 px-4 text-center">Jumlah Terjual</th>
                      <th className="py-2.5 px-4 text-right">Kontribusi Omzet</th>
                      <th className="py-2.5 px-4 text-right">Estimasi Laba Kotor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topProducts.map((p: any, idx: number) => {
                      const grossMargin = p.revenue - p.cogs;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-800">{p.name}</td>
                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                            {p.quantity} unit
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                            {formatRupiah(p.revenue)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatRupiah(grossMargin)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
