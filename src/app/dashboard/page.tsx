'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingCart,
  Banknote,
  QrCode,
  Package,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Receipt,
  Loader2,
  Boxes,
} from 'lucide-react';
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/format';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchDashboard(silent = false) {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to load dashboard stats:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    }

    fetchDashboard();

    // Real-time synchronization: polling otomatis setiap 4 detik dari semua kasir/device
    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 4000);

    const handleFocus = () => fetchDashboard(true);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (loading) {
    return (
      <AppLayout title="Dashboard Operasional" subtitle="Ringkasan penjualan dan inventaris hari ini">
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-2" />
          <p className="text-sm text-slate-500 font-medium">Memuat data operasional real-time...</p>
        </div>
      </AppLayout>
    );
  }

  const summary = data?.summary || {};
  const topProducts = data?.topSellingProducts || [];
  const recentTransactions = data?.recentTransactions || [];
  const lowStockList = data?.lowStockList || [];

  return (
    <AppLayout
      title="Dashboard Operasional Minimarket"
      subtitle="Ringkasan transaksi hari ini berdasarkan database real-time SMPIT Al Qalam"
    >
      <div className="space-y-6">
        {/* KARTU STATISTIK UTAMA HARI INI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Omzet Penjualan Hari Ini */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Omzet Bersih Hari Ini
              </span>
              <div className="p-2 bg-brand-50 text-brand-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                {formatRupiah(summary.todayNetSales || 0)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <span>{summary.todayPaidTransactionsCount || 0} transaksi lunas</span>
                {summary.todayDiscountTotal > 0 && (
                  <span className="text-emerald-600 font-medium">
                    (Diskon {formatRupiah(summary.todayDiscountTotal)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Pembayaran Tunai */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Tunai (Cash)
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                {formatRupiah(summary.todayCashTotal || 0)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Uang fisik kasir hari ini
              </span>
            </div>
          </div>

          {/* Pembayaran QRIS */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total QRIS Digital
              </span>
              <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                <QrCode className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-sky-700 font-mono tabular-nums">
                {formatRupiah(summary.todayQrisTotal || 0)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Rekonsiliasi rekening sekolah
              </span>
            </div>
          </div>

          {/* Kondisi Stok Produk */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Kesehatan Inventaris
              </span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Boxes className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {summary.activeProducts || 0}
                </span>
                <span className="text-xs text-slate-500">produk aktif</span>
              </div>
              <div className="text-[11px] mt-1 flex items-center gap-2">
                <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {summary.lowStockCount || 0} menipis
                </span>
                {summary.outOfStockCount > 0 && (
                  <span className="text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    {summary.outOfStockCount} habis
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: TOMBOL AKSI CEPAT KASIR */}
        <div className="p-4 bg-gradient-to-r from-brand-500 to-brand-600 rounded-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div>
            <h3 className="text-base font-extrabold">Buka Kasir Sekarang</h3>
            <p className="text-xs text-brand-100 mt-0.5">
              Siap memindai barcode transaksi pembeli minimarket sekolah dengan barcode scanner USB.
            </p>
          </div>
          <Link
            href="/pos"
            className="px-5 py-2.5 bg-white text-brand-700 hover:bg-brand-50 rounded-lg text-xs font-black shadow-sm transition-all flex items-center gap-2 flex-shrink-0"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Masuk Layar Kasir (POS)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* DUA KOLOM: TRANSAKSI TERAKHIR & PRODUK TERLARIS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tabel Transaksi Terakhir (2 Kolom) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-brand-600" />
                <h3 className="text-sm font-bold text-slate-800">Transaksi Kasir Terakhir</h3>
              </div>
              <Link
                href="/transactions"
                className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex-1 overflow-x-auto">
              {recentTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada transaksi yang tercatat hari ini.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs min-w-[500px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-4">No Struk</th>
                      <th className="py-2.5 px-4">Kasir</th>
                      <th className="py-2.5 px-4">Metode</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-800">
                          {t.receiptNumber}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 truncate max-w-[120px]">
                          {t.cashierName}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.paymentMethod === 'QRIS'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {t.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              t.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : t.paymentStatus === 'PENDING'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {t.paymentStatus === 'PAID' ? 'Lunas' : t.paymentStatus}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(t.grandTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Kolom Kanan: Top Produk Terlaris & Peringatan Stok */}
          <div className="space-y-6">
            {/* Top 5 Produk Terlaris */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Produk Terlaris</h3>
              </div>

              {topProducts.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Belum ada data penjualan.</p>
              ) : (
                <div className="space-y-2.5">
                  {topProducts.map((p: any, idx: number) => (
                    <div key={p.productId || idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800 truncate">{p.name}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.totalQuantity} terjual
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Peringatan Stok Menipis */}
            {lowStockList.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 shadow-xs p-4">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold">Perlu Restock</h3>
                </div>
                <div className="space-y-2 text-xs">
                  {lowStockList.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0"
                    >
                      <span className="text-slate-700 truncate pr-2">{item.name}</span>
                      <span className="font-mono font-bold text-amber-700 whitespace-nowrap bg-amber-50 px-1.5 py-0.5 rounded">
                        Sisa {item.stockQty} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/inventory"
                  className="mt-3 block text-center text-xs font-semibold text-brand-600 hover:text-brand-700 pt-1"
                >
                  Kelola Stok di Inventaris &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
