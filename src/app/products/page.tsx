'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/layout/AppLayout';
import {
  Package,
  Search,
  Plus,
  FolderTree,
  FileSpreadsheet,
  Download,
  Barcode as BarcodeIcon,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Filter,
} from 'lucide-react';
import { formatRupiah, formatNumber } from '@/lib/format';
import QuickAddProductModal from '@/components/pos/QuickAddProductModal';
import BarcodeLabelModal from '@/components/pos/BarcodeLabelModal';
import ImportProductsModal from '@/components/products/ImportProductsModal';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [selectedProductForLabel, setSelectedProductForLabel] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  const fetchProducts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        status: statusFilter,
      });

      if (search.trim()) params.append('search', search.trim());
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (stockFilter !== 'all') params.append('stock', stockFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.data);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, selectedCategory, stockFilter, statusFilter]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    // Sinkronisasi realtime multi-perangkat kasir secara silent (6 detik & on focus)
    const interval = setInterval(() => {
      fetchProducts(true);
    }, 6000);
    const handleFocus = () => fetchProducts(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchProducts]);

  const showNotice = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Toggle Aktif / Nonaktifkan Produk
  const handleToggleActive = async (product: any) => {
    const actionName = product.isActive ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (!window.confirm(`Yakin ingin ${actionName} produk "${product.name}"?`)) return;

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !product.isActive }),
      });

      if (res.ok) {
        showNotice('success', `Status produk "${product.name}" berhasil diubah.`);
        fetchProducts();
      } else {
        const err = await res.json();
        showNotice('error', err.error || 'Gagal mengubah status produk.');
      }
    } catch (err) {
      showNotice('error', 'Gagal memproses perubahan status.');
    }
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    window.open('/api/products/export', '_blank');
  };

  return (
    <AppLayout
      title="Manajemen Data Produk"
      subtitle="Kelola barcode, harga modal, harga jual, dan stok barang fisik minimarket"
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

        {/* TOOLBAR AKSI ATAS */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Produk Baru</span>
            </button>
            <Link
              href="/categories"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-bold border border-brand-200 transition-colors"
            >
              <FolderTree className="w-4 h-4" />
              <span>Kelola Kategori</span>
            </Link>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <Download className="w-4 h-4 text-brand-600" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium text-right sm:text-left">
            Total Terdaftar: <strong className="text-slate-800 font-bold">{totalCount}</strong> produk
          </div>
        </div>

        {/* FILTER & PENCARIAN */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Cari Nama / Barcode / SKU */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, barcode, SKU..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Filter Kategori */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Stok */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="all">Semua Kondisi Stok</option>
              <option value="available">Stok Tersedia (&gt; 0)</option>
              <option value="out">Stok Habis (0)</option>
            </select>
          </div>

          {/* Filter Status Aktif */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="active">Produk Aktif</option>
              <option value="inactive">Produk Nonaktif</option>
              <option value="all">Semua Status</option>
            </select>
          </div>
        </div>

        {/* TABEL DAFTAR PRODUK */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
                <span className="text-xs font-semibold">Memuat data produk...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Tidak ada produk ditemukan</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Ubah kata kunci pencarian atau daftarkan produk baru melalui tombol di atas.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Produk</th>
                    <th className="py-3 px-4">Barcode / SKU</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-right">Harga Modal</th>
                    <th className="py-3 px-4 text-right">Harga Jual</th>
                    <th className="py-3 px-4 text-center">Stok</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !p.isActive ? 'opacity-50 bg-slate-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{p.name}</div>
                        <div className="text-[10px] text-slate-400">Satuan: {p.unit}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <div className="text-slate-800 font-medium">{p.barcode || '-'}</div>
                        <div className="text-[10px] text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.category?.name || '-'}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {formatRupiah(p.costPrice)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(p.sellingPrice)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.stockQty <= 0
                              ? 'bg-rose-100 text-rose-700'
                              : p.stockQty <= p.minimumStock
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          {p.stockQty} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Cetak Barcode Label */}
                          <button
                            type="button"
                            onClick={() => setSelectedProductForLabel(p)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Cetak Label Barcode"
                          >
                            <BarcodeIcon className="w-4 h-4" />
                          </button>

                          {/* Edit Produk & Kategori */}
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Edit Data & Kategori Produk"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Toggle Aktif / Nonaktif */}
                          <button
                            type="button"
                            onClick={() => handleToggleActive(p)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={p.isActive ? 'Nonaktifkan Produk' : 'Aktifkan Kembali'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                Halaman {page} dari {totalPages}
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

      {/* MODAL TAMBAH PRODUK BARU */}
      {showAddModal && (
        <QuickAddProductModal
          onClose={() => setShowAddModal(false)}
          onProductCreated={(newProd) => {
            showNotice('success', `Produk "${newProd.name}" berhasil ditambahkan.`);
            fetchProducts();
            fetchCategories();
          }}
        />
      )}

      {/* MODAL EDIT DATA & KATEGORI PRODUK */}
      {editingProduct && (
        <QuickAddProductModal
          initialProduct={editingProduct}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={(updatedProd) => {
            showNotice('success', `Produk "${updatedProd.name}" berhasil diperbarui.`);
            fetchProducts();
            fetchCategories();
          }}
        />
      )}

      {/* MODAL IMPORT EXCEL/CSV */}
      {showImportModal && (
        <ImportProductsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            fetchProducts();
            showNotice('success', 'Import produk berhasil diselesaikan.');
          }}
        />
      )}

      {/* MODAL CETAK LABEL BARCODE */}
      {selectedProductForLabel && (
        <BarcodeLabelModal
          product={selectedProductForLabel}
          onClose={() => setSelectedProductForLabel(null)}
        />
      )}
    </AppLayout>
  );
}
