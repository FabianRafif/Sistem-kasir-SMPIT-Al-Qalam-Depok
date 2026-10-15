'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  Receipt,
  Search,
  Filter,
  Calendar,
  Printer,
  Ban,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { formatRupiah, formatNumber, formatDateTime, formatDateOnly, formatTimeOnly } from '@/lib/format';
import ThermalReceipt from '@/components/pos/ThermalReceipt';
import { ReceiptData } from '@/lib/types';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchReceipt, setSearchReceipt] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals
  const [selectedTxDetail, setSelectedTxDetail] = useState<any | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [submittingCancel, setSubmittingCancel] = useState<boolean>(false);

  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (searchReceipt.trim()) params.append('receiptNumber', searchReceipt.trim());
      if (paymentMethod) params.append('paymentMethod', paymentMethod);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchReceipt, paymentMethod, paymentStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const showNotice = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Cetak Ulang Struk
  const handleReprintReceipt = async (sale: any) => {
    try {
      const res = await fetch(`/api/transactions/${sale.id}`);
      const data = await res.json();
      if (data.success && data.data?.receiptData) {
        setActiveReceipt(data.data.receiptData);
      }
    } catch (err) {
      showNotice('error', 'Gagal memuat struk untuk dicetak.');
    }
  };

  // Pembatalan Transaksi dengan Pengembalian Stok
  const handleCancelTransaction = async () => {
    if (!cancellingId || !cancelReason.trim()) return;

    setSubmittingCancel(true);
    try {
      const res = await fetch(`/api/transactions/${cancellingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        showNotice('error', data.error || 'Gagal membatalkan transaksi.');
        return;
      }

      showNotice('success', data.message || 'Transaksi berhasil dibatalkan dan stok telah dikembalikan.');
      setCancellingId(null);
      setCancelReason('');
      fetchTransactions();
    } catch (err: any) {
      showNotice('error', err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <AppLayout
      title="Riwayat Transaksi Penjualan"
      subtitle="Daftar nomor struk, waktu kasir, metode pembayaran, cetak ulang, dan pembatalan sah"
    >
      <div className="space-y-4 select-none">
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

        {/* FILTER & PENCARIAN */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Cari No Struk */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nomor struk..."
              value={searchReceipt}
              onChange={(e) => {
                setSearchReceipt(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filter Metode Pembayaran */}
          <div>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Semua Metode Pembayaran</option>
              <option value="CASH">Tunai (Cash)</option>
              <option value="QRIS">QRIS Dinamis</option>
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Semua Status</option>
              <option value="PAID">Lunas (Paid)</option>
              <option value="PENDING">Menunggu (Pending)</option>
              <option value="CANCELLED">Dibatalkan (Cancelled)</option>
            </select>
          </div>

          {/* Tanggal Dari */}
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>

          {/* Tanggal Sampai */}
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500 bg-white"
            />
          </div>
        </div>

        {/* TABEL TRANSAKSI */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
                <span className="text-xs font-semibold">Memuat riwayat transaksi...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <span className="text-xs font-semibold">Tidak ada transaksi ditemukan.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No Struk</th>
                    <th className="py-3 px-4">Waktu (WIB)</th>
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-4 text-center">Item</th>
                    <th className="py-3 px-4 text-right">Total Akhir</th>
                    <th className="py-3 px-4 text-center">Metode</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {t.receiptNumber}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {formatDateTime(t.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{t.user?.name || '-'}</td>
                      <td className="py-3 px-4 text-center font-mono">
                        {t.items?.length || 0} barang
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(t.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
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
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Cetak Ulang Struk */}
                          <button
                            type="button"
                            onClick={() => handleReprintReceipt(t)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Cetak Ulang Struk Kasir"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Detail Transaksi */}
                          <button
                            type="button"
                            onClick={() => setSelectedTxDetail(t)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Lihat Detail Belanja"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Batalkan Transaksi (Hanya jika belum batal) */}
                          {t.paymentStatus === 'PAID' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancellingId(t.id);
                                setCancelReason('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Batalkan & Kembalikan Stok"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginasi Bawah */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Halaman {page} dari {totalPages} ({totalCount} total transaksi)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded text-slate-700 disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DETAIL TRANSAKSI */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Detail Struk #{selectedTxDetail.receiptNumber}</h3>
                <p className="text-[11px] text-slate-400">
                  {formatDateTime(selectedTxDetail.createdAt)} • Kasir: {selectedTxDetail.user?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedTxDetail(null)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Produk</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Harga</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedTxDetail.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {item.productName}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {formatRupiah(item.unitPrice)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {formatRupiah(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs text-slate-700">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold">{formatRupiah(selectedTxDetail.subtotal)}</span>
                </div>
                {selectedTxDetail.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon:</span>
                    <span className="font-mono font-bold">-{formatRupiah(selectedTxDetail.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1.5">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-slate-900">{formatRupiah(selectedTxDetail.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Metode Pembayaran:</span>
                  <span className="font-bold uppercase">{selectedTxDetail.paymentMethod}</span>
                </div>
                {selectedTxDetail.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Uang Diterima:</span>
                      <span className="font-mono">{formatRupiah(selectedTxDetail.cashReceived || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span>Kembalian:</span>
                      <span className="font-mono">{formatRupiah(selectedTxDetail.changeAmount || 0)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTxDetail(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleReprintReceipt(selectedTxDetail);
                    setSelectedTxDetail(null);
                  }}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Ulang Struk</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI PEMBATALAN TRANSAKSI */}
      {cancellingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
            <div className="px-5 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5" />
                <h3 className="text-sm font-bold">Batalkan Transaksi & Retur Stok</h3>
              </div>
              <button
                onClick={() => setCancellingId(null)}
                className="p-1 hover:bg-rose-700 rounded text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Aksi ini akan menandai transaksi sebagai <strong>DIBATALKAN</strong> dan secara otomatis
                mengembalikan seluruh kuantitas stok barang ke dalam database.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Pembatalan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Pembeli keliru memilih varian / Transaksi dibatalkan sebelum pembayaran selesai"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancellingId(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!cancelReason.trim() || submittingCancel}
                  onClick={handleCancelTransaction}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingCancel ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Konfirmasi Pembatalan</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CETAK STRUK THERMAL */}
      {activeReceipt && (
        <ThermalReceipt receipt={activeReceipt} onClose={() => setActiveReceipt(null)} />
      )}
    </AppLayout>
  );
}
