'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  Boxes,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  History,
  X,
} from 'lucide-react';
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/format';

export default function InventoryPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [totalValuation, setTotalValuation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filter
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>('');

  // Modal Penyesuaian Stok
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustQty, setAdjustQty] = useState<string>('1');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [submittingAdjust, setSubmittingAdjust] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
      });
      if (movementTypeFilter) params.append('movementType', movementTypeFilter);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMovements(data.data);
        setTotalValuation(data.totalInventoryValue || 0);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  }, [page, movementTypeFilter]);

  const fetchProductsList = async () => {
    try {
      const res = await fetch('/api/products?limit=100');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setProducts(data.data);
        setSelectedProductId(data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load products list:', err);
    }
  };

  useEffect(() => {
    fetchProductsList();
  }, []);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const showNotice = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!selectedProductId) {
      setModalError('Silakan pilih produk.');
      return;
    }
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      setModalError('Jumlah harus angka bulat positif lebih dari 0.');
      return;
    }
    if (!adjustReason.trim() || adjustReason.trim().length < 3) {
      setModalError('Alasan penyesuaian stok wajib diisi minimal 3 karakter.');
      return;
    }

    setSubmittingAdjust(true);
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          movementType: adjustType,
          quantity: qty,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || 'Gagal menyesuaikan stok.');
        return;
      }

      showNotice('success', data.message || 'Stok berhasil disesuaikan.');
      setShowAdjustModal(false);
      setAdjustReason('');
      setAdjustQty('1');
      fetchMovements();
      fetchProductsList();
    } catch (err: any) {
      setModalError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <AppLayout
      title="Manajemen Inventaris & Audit Stok"
      subtitle="Pencatatan mutasi stok, stok masuk, stok keluar, dan penyesuaian wajib alasan"
    >
      <div className="space-y-5 select-none">
        {/* NOTIFIKASI */}
        {notification && (
          <div
            className={`p-3 text-xs font-semibold rounded-xl flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* KARTU NILAI PERSEDIAAN & AKSI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between sm:col-span-2">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Estimasi Nilai Persediaan
              </span>
              <div className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-1">
                {formatRupiah(totalValuation)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Dihitung berdasarkan (Kuantitas Stok × Harga Modal / HPP) seluruh barang aktif
              </p>
            </div>
            <div className="p-3 bg-brand-50 text-brand-600 rounded-xl">
              <Boxes className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-center">
            <button
              onClick={() => setShowAdjustModal(true)}
              className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Input Penyesuaian / Stok Masuk</span>
            </button>
          </div>
        </div>

        {/* FILTER MUTASI STOK */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-slate-800">Riwayat Mutasi Stok (Audit Trail)</h3>
          </div>

          <div className="w-56">
            <select
              value={movementTypeFilter}
              onChange={(e) => {
                setMovementTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Semua Jenis Mutasi</option>
              <option value="IN">Stok Masuk (IN)</option>
              <option value="OUT">Stok Keluar (OUT)</option>
              <option value="SALE">Penjualan Kasir (SALE)</option>
              <option value="RETURN">Retur / Pembatalan (RETURN)</option>
              <option value="ADJUSTMENT">Penyesuaian (ADJUSTMENT)</option>
              <option value="INITIAL">Stok Awal (INITIAL)</option>
            </select>
          </div>
        </div>

        {/* TABEL MUTASI STOK */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
                <span className="text-xs font-semibold">Memuat riwayat mutasi...</span>
              </div>
            ) : movements.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <History className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <span className="text-xs font-semibold">Belum ada mutasi stok tercatat.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Waktu (WIB)</th>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4">Jenis Mutasi</th>
                    <th className="py-3 px-4 text-center">Perubahan</th>
                    <th className="py-3 px-4">Petugas</th>
                    <th className="py-3 px-4">Alasan & Referensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {formatDateTime(m.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{m.product?.name || 'Produk'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.product?.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.movementType === 'IN' || m.movementType === 'INITIAL' || m.movementType === 'RETURN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.movementType === 'SALE'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}
                        >
                          {m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange} {m.product?.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{m.user?.name || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{m.reason || '-'}</div>
                        {m.referenceId && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Ref: {m.referenceId}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL PENYESUAIAN STOK */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
            <div className="px-5 py-4 bg-brand-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5" />
                <h3 className="text-sm font-bold">Penyesuaian Stok (Audit Mandatori)</h3>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1 hover:bg-brand-600 rounded text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Produk</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stok Saat Ini: {p.stockQty} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Operasi</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('IN')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      adjustType === 'IN'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Stok Masuk (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('OUT')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      adjustType === 'OUT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Stok Keluar (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADJUSTMENT')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      adjustType === 'ADJUSTMENT'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Opname / Set
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {adjustType === 'ADJUSTMENT' ? 'Jumlah Fisik Baru' : 'Jumlah Perubahan'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Perubahan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Barang masuk dari supplier ABC / Barang rusak kemasan"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingAdjust ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Penyesuaian</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
