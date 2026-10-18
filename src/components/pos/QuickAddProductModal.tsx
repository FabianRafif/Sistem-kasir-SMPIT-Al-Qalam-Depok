'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Loader2, Sparkles, Barcode, Edit2, Check } from 'lucide-react';
import { generateInternalBarcode } from '@/lib/security';

interface QuickAddProductModalProps {
  initialBarcode?: string;
  initialProduct?: any;
  onClose: () => void;
  onProductCreated?: (product: any) => void;
  onProductUpdated?: (product: any) => void;
}

export default function QuickAddProductModal({
  initialBarcode = '',
  initialProduct,
  onClose,
  onProductCreated,
  onProductUpdated,
}: QuickAddProductModalProps) {
  const isEdit = Boolean(initialProduct);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [name, setName] = useState<string>(initialProduct?.name || '');
  const [barcode, setBarcode] = useState<string>(initialProduct?.barcode || initialBarcode || '');
  const [sku, setSku] = useState<string>(initialProduct?.sku || '');
  const [categoryId, setCategoryId] = useState<string>(initialProduct?.categoryId || '');
  const [unit, setUnit] = useState<string>(initialProduct?.unit || 'pcs');
  const [costPrice, setCostPrice] = useState<string>(
    initialProduct ? String(initialProduct.costPrice ?? 0) : '0'
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    initialProduct ? String(initialProduct.sellingPrice ?? '') : ''
  );
  const [stockQty, setStockQty] = useState<string>(
    initialProduct ? String(initialProduct.stockQty ?? 0) : '10'
  );
  const [minimumStock, setMinimumStock] = useState<string>(
    initialProduct ? String(initialProduct.minimumStock ?? 5) : '5'
  );

  // State untuk penambahan kategori baru secara instan & tanpa delay
  const [showAddCategory, setShowAddCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [creatingCategory, setCreatingCategory] = useState<boolean>(false);
  const [categoryNotice, setCategoryNotice] = useState<string>('');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setCategories(data.data);
          // Bila belum ada categoryId terpilih, pilih kategori pertama
          if (!initialProduct && !categoryId) {
            setCategoryId(data.data[0].id);
          } else if (initialProduct?.categoryId) {
            setCategoryId(initialProduct.categoryId);
          }
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, [initialProduct]);

  const handleGenerateBarcode = () => {
    setBarcode(generateInternalBarcode());
  };

  const handleCreateCategoryInline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCategoryName.trim()) return;

    setCreatingCategory(true);
    setCategoryNotice('');

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const result = await res.json();
      if (!res.ok) {
        setCategoryNotice(result.error || 'Gagal menambahkan kategori baru.');
        return;
      }

      const created = result.data;
      // Perbarui daftar kategori lokal langsung
      setCategories((prev) => {
        if (prev.some((c) => c.id === created.id)) return prev;
        return [...prev, { id: created.id, name: created.name }];
      });

      // Otomatis pilih kategori baru secara instan tanpa delay
      setCategoryId(created.id);
      setNewCategoryName('');
      setShowAddCategory(false);
    } catch (err: any) {
      setCategoryNotice(err.message || 'Terjadi kesalahan sistem saat membuat kategori.');
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }

    if (!categoryId) {
      setError('Kategori produk wajib dipilih.');
      return;
    }

    const sPrice = parseFloat(sellingPrice);
    if (isNaN(sPrice) || sPrice < 0) {
      setError('Harga jual wajib diisi dan tidak boleh negatif.');
      return;
    }

    const cPrice = parseFloat(costPrice) || 0;
    const sQty = parseInt(stockQty, 10) || 0;
    const mStock = parseInt(minimumStock, 10) || 5;

    setSubmitting(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/products/${initialProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            barcode: barcode.trim() || null,
            sku: sku.trim() || undefined,
            categoryId,
            unit,
            costPrice: cPrice,
            sellingPrice: sPrice,
            minimumStock: mStock,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          setError(result.error || 'Gagal memperbarui data produk.');
          return;
        }

        if (onProductUpdated) onProductUpdated(result.data);
        onClose();
      } else {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            barcode: barcode.trim() || null,
            sku: sku.trim() || undefined,
            categoryId,
            unit,
            costPrice: cPrice,
            sellingPrice: sPrice,
            stockQty: sQty,
            minimumStock: mStock,
            isActive: true,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          setError(result.error || 'Gagal menyimpan produk baru.');
          return;
        }

        if (onProductCreated) onProductCreated(result.data);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="px-5 py-3.5 bg-brand-500 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {isEdit ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <div>
              <h3 className="text-sm font-bold leading-tight">
                {isEdit ? 'Edit Data Produk' : 'Tambah Produk Cepat'}
              </h3>
              <p className="text-[11px] text-brand-100">
                {isEdit
                  ? 'Perbarui barcode, kategori, dan harga produk'
                  : 'Daftarkan barang langsung ke database kasir'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-brand-600 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Isi */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Produk <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Susu Cokelat Kotak 200ml"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Barcode</label>
                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="text-[10px] text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" />
                  Auto Gen
                </button>
              </div>
              <input
                type="text"
                placeholder="Scan atau kosongkan"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Kategori <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(!showAddCategory);
                    setCategoryNotice('');
                  }}
                  className="text-[11px] text-brand-600 hover:text-brand-700 font-bold flex items-center gap-0.5 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showAddCategory ? 'Tutup' : '+ Kategori Baru'}</span>
                </button>
              </div>

              {/* Form Input Tambah Kategori Baru Secara Instan */}
              {showAddCategory && (
                <div className="mb-2.5 p-3 bg-brand-50/90 border border-brand-200 rounded-xl space-y-2.5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-brand-900 flex items-center gap-1">
                        <Plus className="w-3 h-3 text-brand-600" />
                        Tambah Kategori Baru
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddCategory(false);
                          setCategoryNotice('');
                          setNewCategoryName('');
                        }}
                        className="text-[10px] text-slate-400 hover:text-slate-600 font-semibold transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Ketik nama kategori baru..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateCategoryInline();
                        }
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium shadow-2xs"
                      autoFocus
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Otomatis tersimpan & dipilih
                    </span>
                    <button
                      type="button"
                      disabled={creatingCategory || !newCategoryName.trim()}
                      onClick={handleCreateCategoryInline}
                      className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-xs flex-shrink-0"
                    >
                      {creatingCategory ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Simpan</span>
                        </>
                      )}
                    </button>
                  </div>

                  {categoryNotice && (
                    <p className="text-[11px] text-rose-600 font-medium bg-rose-50 p-1.5 rounded border border-rose-200">
                      {categoryNotice}
                    </p>
                  )}
                </div>
              )}

              {loadingCategories ? (
                <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
              ) : categories.length === 0 ? (
                <div className="p-2 border border-dashed border-amber-300 bg-amber-50 rounded-lg text-amber-800 text-[11px]">
                  Belum ada kategori. Klik <strong>+ Kategori Baru</strong> di atas untuk membuat.
                </div>
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white font-medium"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Modal (Rp)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Jual (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0"
                placeholder="Contoh: 5000"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {!isEdit ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stok Awal</label>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SKU / Kode</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Opsional"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min. Stok</label>
              <input
                type="number"
                min="0"
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="pcs / botol"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Batal (Esc)
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : isEdit ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {onProductCreated ? 'Simpan & Tambah ke Keranjang' : 'Simpan Produk Baru'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
