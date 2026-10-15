'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Loader2, Sparkles, Barcode } from 'lucide-react';
import { generateInternalBarcode } from '@/lib/security';

interface QuickAddProductModalProps {
  initialBarcode?: string;
  onClose: () => void;
  onProductCreated: (product: any) => void;
}

export default function QuickAddProductModal({
  initialBarcode = '',
  onClose,
  onProductCreated,
}: QuickAddProductModalProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const [name, setName] = useState<string>('');
  const [barcode, setBarcode] = useState<string>(initialBarcode);
  const [sku, setSku] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [unit, setUnit] = useState<string>('pcs');
  const [costPrice, setCostPrice] = useState<string>('0');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [stockQty, setStockQty] = useState<string>('10');
  const [minimumStock, setMinimumStock] = useState<string>('5');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setCategories(data.data);
          setCategoryId(data.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  const handleGenerateBarcode = () => {
    setBarcode(generateInternalBarcode());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nama produk wajib diisi.');
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

      onProductCreated(result.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto">
        <div className="px-5 py-3.5 bg-brand-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold leading-tight">Tambah Produk Cepat</h3>
              <p className="text-[11px] text-brand-100">Daftarkan barang langsung ke database kasir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-brand-600 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
              {loadingCategories ? (
                <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Modal (Rp)</label>
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
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan & Tambah ke Keranjang</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
