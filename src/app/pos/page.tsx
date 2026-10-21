'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  Scan,
  Search,
  Plus,
  Trash2,
  Minus,
  Banknote,
  QrCode,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Printer,
  PackagePlus,
  Loader2,
  Tag,
} from 'lucide-react';
import { formatRupiah, formatNumber } from '@/lib/format';
import { playScanSuccessSound, playScanErrorSound } from '@/lib/sound';
import { CartItem, ReceiptData } from '@/lib/types';
import CashPaymentModal from '@/components/pos/CashPaymentModal';
import QrisPaymentModal from '@/components/pos/QrisPaymentModal';
import QuickAddProductModal from '@/components/pos/QuickAddProductModal';
import ThermalReceipt from '@/components/pos/ThermalReceipt';

export default function PosPage() {
  // State Keranjang Belanja
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<string>('0');

  // Input Barcode Scanner
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Pencarian Manual Produk
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Notifikasi Feedback
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);

  // Modals
  const [showCashModal, setShowCashModal] = useState<boolean>(false);
  const [showQrisModal, setShowQrisModal] = useState<boolean>(false);
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [unregisteredBarcode, setUnregisteredBarcode] = useState<string>('');

  // Data QRIS & Struk Aktif
  const [pendingQrisSale, setPendingQrisSale] = useState<{
    saleId: string;
    receiptNumber: string;
    grandTotal: number;
    qrCodeData?: string | null;
  } | null>(null);

  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  // Focus Kembali ke Input Barcode
  const refocusBarcode = useCallback(() => {
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  }, []);

  useEffect(() => {
    refocusBarcode();
  }, [refocusBarcode]);

  // Perhitungan Subtotal & Grand Total
  const subtotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);
  const validDiscount = Math.min(discountAmount, subtotal);
  const grandTotal = Math.max(0, subtotal - validDiscount);
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Tampilkan Notifikasi dengan auto-dismiss
  const showNotice = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Tambahkan Produk ke Keranjang
  const addToCart = (product: any, qty = 1) => {
    const existingIndex = cart.findIndex((i) => i.productId === product.id);

    if (existingIndex > -1) {
      const existing = cart[existingIndex];
      const newQty = existing.quantity + qty;

      if (newQty > product.stockQty) {
        playScanErrorSound();
        showNotice(
          'warning',
          `Stok produk "${product.name}" terbatas (Maksimal: ${product.stockQty} ${product.unit}).`
        );
        return;
      }

      const updated = [...cart];
      updated[existingIndex] = {
        ...existing,
        quantity: newQty,
        lineTotal: newQty * existing.unitPrice,
      };
      setCart(updated);
    } else {
      if (product.stockQty < qty) {
        playScanErrorSound();
        showNotice(
          'warning',
          `Stok produk "${product.name}" tidak mencukupi (Tersedia: ${product.stockQty} ${product.unit}).`
        );
        return;
      }

      const newItem: CartItem = {
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        categoryName: product.category?.name || 'Umum',
        unit: product.unit || 'pcs',
        unitPrice: Number(product.sellingPrice),
        costPrice: Number(product.costPrice),
        quantity: qty,
        stockQty: product.stockQty,
        lineTotal: Number(product.sellingPrice) * qty,
      };
      setCart([...cart, newItem]);
    }

    playScanSuccessSound();
    showNotice('success', `"${product.name}" ditambahkan ke keranjang.`);
    refocusBarcode();
  };

  // Update Kuantitas Item di Keranjang
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const item = cart.find((i) => i.productId === productId);
    if (!item) return;

    if (newQty > item.stockQty) {
      playScanErrorSound();
      showNotice(
        'warning',
        `Kuantitas melebihi sisa stok "${item.name}" (Maksimal: ${item.stockQty} ${item.unit}).`
      );
      return;
    }

    setCart(
      cart.map((i) =>
        i.productId === productId
          ? { ...i, quantity: newQty, lineTotal: newQty * i.unitPrice }
          : i
      )
    );
    refocusBarcode();
  };

  // Hapus Item dari Keranjang
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.productId !== productId));
    refocusBarcode();
  };

  // Kosongkan Keranjang Belanja
  const handleResetCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Batalkan transaksi dan kosongkan keranjang belanja kasir?')) {
      setCart([]);
      setDiscountAmount(0);
      setDiscountInput('0');
      showNotice('warning', 'Keranjang transaksi telah dikosongkan.');
      refocusBarcode();
    }
  };

  // Handler Submit Scan Barcode
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setScanning(true);
    setBarcodeInput('');

    try {
      const res = await fetch('/api/products/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok || !data.found) {
        playScanErrorSound();
        if (data.reason === 'NOT_FOUND') {
          showNotice('error', `Barcode "${code}" tidak ditemukan di database.`);
          setUnregisteredBarcode(code);
        } else if (data.reason === 'INACTIVE') {
          showNotice('error', data.message || 'Produk sedang nonaktif.');
        } else {
          showNotice('error', data.message || 'Scan gagal.');
        }
        return;
      }

      if (data.reason === 'OUT_OF_STOCK') {
        playScanErrorSound();
        showNotice('warning', `Stok "${data.product.name}" habis (0 ${data.product.unit}).`);
        return;
      }

      addToCart(data.product, 1);
    } catch (err: any) {
      playScanErrorSound();
      showNotice('error', 'Gagal memproses pemindaian barcode.');
    } finally {
      setScanning(false);
      refocusBarcode();
    }
  };

  // Handler Debounce Pencarian Manual Produk
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data || []);
          setIsSearchOpen(true);
          setSelectedSearchIndex(0);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Navigasi Keyboard pada Hasil Pencarian Manual
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!isSearchOpen || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = searchResults[selectedSearchIndex];
      if (selected) {
        addToCart(selected);
        setSearchQuery('');
        setIsSearchOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsSearchOpen(false);
      refocusBarcode();
    }
  };

  // Keyboard Shortcuts Global untuk Kasir (F2 = Cari, F4 = Bayar Tunai, F9 = QRIS, Esc = Batal)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Jika modal sedang terbuka, biarkan modal menangani Esc/Enter
      if (showCashModal || showQrisModal || showAddProductModal || activeReceipt) return;

      if (e.key === 'F1') {
        e.preventDefault();
        refocusBarcode();
      } else if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('manual-search-input');
        if (searchInput) searchInput.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) setShowCashModal(true);
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) handleInitiateQris();
      } else if (e.key === 'Escape') {
        refocusBarcode();
      } else {
        // Smart Scanner Autofocus: Jika kasir/scanner mengetik di luar input, otomatis arahkan ke input barcode
        const activeTag = document.activeElement?.tagName;
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            barcodeInputRef.current?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, showCashModal, showQrisModal, showAddProductModal, activeReceipt, refocusBarcode]);

  // Eksekusi Transaksi Tunai
  const handleConfirmCashPayment = async (cashReceived: number) => {
    const payload = {
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      discountAmount: validDiscount,
      paymentMethod: 'CASH',
      cashReceived,
      idempotencyKey: `IDEMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    };

    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Gagal menyimpan transaksi tunai.');
    }

    // Bersihkan keranjang dan tampilkan struk thermal
    setCart([]);
    setDiscountAmount(0);
    setDiscountInput('0');
    setShowCashModal(false);
    setActiveReceipt(result.receiptData);
    showNotice('success', `Transaksi No ${result.receiptNumber} selesai.`);
  };

  // Inisiasi Transaksi QRIS Dinamis
  const handleInitiateQris = async () => {
    if (cart.length === 0) return;

    const payload = {
      items: cart.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      discountAmount: validDiscount,
      paymentMethod: 'QRIS',
      idempotencyKey: `IDEMP-QR-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        showNotice('error', result.error || 'Gagal membuat invoice QRIS.');
        return;
      }

      setPendingQrisSale({
        saleId: result.saleId,
        receiptNumber: result.receiptNumber,
        grandTotal: result.payment.amount,
        qrCodeData: result.payment.qrCodeData,
      });

      setShowQrisModal(true);
    } catch (err: any) {
      showNotice('error', 'Gagal memproses inisiasi QRIS.');
    }
  };

  // Transaksi QRIS Berhasil Diverifikasi
  const handleQrisSuccess = (receiptData: any) => {
    setCart([]);
    setDiscountAmount(0);
    setDiscountInput('0');
    setShowQrisModal(false);
    setPendingQrisSale(null);
    setActiveReceipt(receiptData);
    showNotice('success', 'Pembayaran QRIS terverifikasi dan struk siap dicetak.');
  };

  return (
    <AppLayout
      title="Point of Sale (POS) Minimarket"
      subtitle="Scanner aktif otomatis (F1) • Cari produk (F2) • Bayar Tunai (F4) • Bayar QRIS (F9)"
    >
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 min-h-0 lg:h-[calc(100vh-5.5rem)] select-none pb-20 lg:pb-0">
        {/* KOLOM KIRI: SCANNER, PENCARIAN & DAFTAR KERANJANG */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Bar Input Scanner & Pencarian */}
          <div className="p-3 sm:p-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch">
            {/* Input Barcode Scanner USB (Auto-focus & Flex layout anti-tabrakan) */}
            <form
              onSubmit={handleBarcodeSubmit}
              onClick={() => barcodeInputRef.current?.focus()}
              className="flex-1 flex items-center bg-white border-2 border-brand-500 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-200 rounded-lg px-3 py-2 shadow-xs transition-all cursor-text min-h-[44px]"
            >
              <div className="flex items-center text-brand-600 flex-shrink-0 mr-2.5">
                <Scan className="w-5 h-5 text-brand-600" />
              </div>
              <input
                ref={barcodeInputRef}
                type="text"
                placeholder="Scan barcode di sini (F1)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                disabled={scanning}
                className="flex-1 bg-transparent text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none min-w-0"
              />
              <div className="flex-shrink-0 ml-2 flex items-center">
                {scanning ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mencari...</span>
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md shadow-2xs select-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>SCANNER USB</span>
                  </span>
                )}
              </div>
            </form>

            {/* Input Pencarian Manual */}
            <div className="w-full sm:w-72 relative">
              <div className="flex items-center bg-white border border-slate-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 rounded-lg px-3 py-2 transition-all min-h-[44px]">
                <Search className="w-4 h-4 text-slate-400 flex-shrink-0 mr-2" />
                <input
                  id="manual-search-input"
                  type="text"
                  placeholder="Cari nama / SKU (F2)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => searchQuery.trim() && setIsSearchOpen(true)}
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none min-w-0"
                />
                {searching && (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0 ml-2" />
                )}
              </div>

              {/* Dropdown Hasil Pencarian Manual */}
              {isSearchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        addToCart(item);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className={`p-3 cursor-pointer flex items-center justify-between transition-colors ${
                        idx === selectedSearchIndex ? 'bg-brand-50 text-brand-900 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.barcode || item.sku} • Stok: {item.stockQty} {item.unit}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-900 font-mono whitespace-nowrap">
                        {formatRupiah(item.sellingPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tombol Tambah Barang Belum Terdaftar */}
            <button
              onClick={() => {
                setUnregisteredBarcode('');
                setShowAddProductModal(true);
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap border border-slate-200 transition-colors w-full sm:w-auto"
              title="Daftarkan produk baru yang belum tercatat di sistem"
            >
              <PackagePlus className="w-4 h-4 text-brand-600" />
              <span>+ Produk Baru</span>
            </button>
          </div>

          {/* Banner Notifikasi Feedback Kasir */}
          {notification && (
            <div
              className={`px-4 py-2 text-xs font-semibold flex items-center justify-between border-b ${
                notification.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : notification.type === 'warning'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {notification.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              {notification.type === 'error' && unregisteredBarcode && (
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="underline text-[11px] font-bold text-rose-900 hover:text-black ml-2"
                >
                  Daftarkan Barcode Sekarang &rarr;
                </button>
              )}
            </div>
          )}

          {/* Tabel Keranjang Belanja */}
          <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[50vh] lg:max-h-none overflow-x-auto">
            {cart.length === 0 ? (
              <div className="h-full min-h-[220px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                  <Scan className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-sm font-bold text-slate-600">Keranjang Kasir Masih Kosong</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Arahkan scanner USB ke barcode kemasan barang, atau tekan F2 untuk mencari produk secara manual.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px] sm:min-w-0">
                <thead className="bg-slate-100/90 text-slate-600 text-[11px] uppercase tracking-wider font-semibold sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 sm:px-4 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 sm:px-4">Nama Produk</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Harga</th>
                    <th className="py-2.5 px-3 sm:px-4 text-center w-36">Jumlah</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Subtotal</th>
                    <th className="py-2.5 px-2 sm:px-3 w-10 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {cart.map((item, index) => (
                    <tr key={item.productId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4 text-center font-mono text-slate-400">{index + 1}</td>
                      <td className="py-2.5 px-3 sm:px-4">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.barcode || item.sku} • {item.categoryName}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right font-mono font-medium text-slate-700">
                        {formatRupiah(item.unitPrice)}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="w-7 h-7 hover:bg-slate-100 text-slate-600 transition-colors flex items-center justify-center flex-shrink-0"
                            title="Kurang 1"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.stockQty}
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.productId, parseInt(e.target.value) || 1)
                            }
                            className="w-11 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none py-1"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="w-7 h-7 hover:bg-slate-100 text-slate-600 transition-colors flex items-center justify-center flex-shrink-0"
                            title="Tambah 1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-right font-mono font-bold text-slate-900">
                        {formatRupiah(item.lineTotal)}
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus barang"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Baris Tombol Cepat Bawah Keranjang */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Total Item: <strong className="text-slate-800">{totalItemsCount}</strong> ({cart.length} jenis)
              </span>
              <span className="text-slate-300">|</span>
              <span className="hidden sm:inline">
                Pintasan: <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono text-[10px]">F2: Cari</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono text-[10px]">F4: Tunai</kbd>{' '}
                <kbd className="px-1.5 py-0.5 bg-white border rounded font-mono text-[10px]">F9: QRIS</kbd>
              </span>
            </div>

            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleResetCart}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold text-xs transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kosongkan Keranjang</span>
              </button>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: PANEL PEMBAYARAN DAN TOTAL AKHIR */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between flex-1">
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                Ringkasan Transaksi
              </h2>

              {/* Subtotal */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Subtotal</span>
                <span className="font-mono font-bold text-slate-800">{formatRupiah(subtotal)}</span>
              </div>

              {/* Input Diskon Transaksi */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    Potongan / Diskon (Rp)
                  </span>
                  {validDiscount > 0 && (
                    <span className="text-[11px] font-bold text-emerald-600 font-mono">
                      -{formatRupiah(validDiscount)}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDiscountInput(val);
                    setDiscountAmount(parseFloat(val) || 0);
                  }}
                  placeholder="0"
                  className="w-full px-3 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* TOTAL AKHIR (TABULAR ANGKA BESAR) */}
              <div className="bg-gradient-to-br from-brand-900 to-[#075985] text-white rounded-xl p-4 text-center mt-3 shadow-md border border-brand-700/50">
                <span className="text-[11px] font-bold uppercase tracking-widest text-brand-200">
                  Total Tagihan Kasir
                </span>
                <div className="text-3xl font-black font-mono tabular-nums text-white mt-1">
                  {formatRupiah(grandTotal)}
                </div>
              </div>
            </div>

            {/* Tombol Metode Pembayaran */}
            <div className="mt-6 space-y-3">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Pilih Metode Pembayaran:
              </span>

              {/* Pembayaran Tunai (F4) */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setShowCashModal(true)}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-700/60 rounded-lg group-hover:scale-105 transition-transform">
                    <Banknote className="w-5 h-5 text-emerald-100" />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-white">TUNAI (CASH)</div>
                    <div className="text-[11px] text-emerald-200">Kalkulasi uang & kembalian otomatis</div>
                  </div>
                </div>
                <kbd className="px-2 py-1 bg-emerald-800 text-[10px] font-mono rounded text-emerald-200 font-bold">
                  F4
                </kbd>
              </button>

              {/* Pembayaran QRIS (F9) */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleInitiateQris}
                className="w-full py-3.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-600/70 rounded-lg group-hover:scale-105 transition-transform">
                    <QrCode className="w-5 h-5 text-brand-100" />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-white">QRIS DINAMIS</div>
                    <div className="text-[11px] text-brand-100">Verifikasi otomatis & suara nominal</div>
                  </div>
                </div>
                <kbd className="px-2 py-1 bg-brand-700 text-[10px] font-mono rounded text-brand-200 font-bold">
                  F9
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BAR PEMBAYARAN MENGAMBANG UNTUK TABLET & HP (< lg) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-xl flex items-center justify-between gap-3 select-none">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-500 block truncate">
              Total ({totalItemsCount} item)
            </span>
            <span className="text-lg font-black font-mono text-slate-900 tracking-tight">
              {formatRupiah(grandTotal)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowCashModal(true)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
            >
              <Banknote className="w-4 h-4" />
              <span>Tunai</span>
            </button>
            <button
              type="button"
              onClick={handleInitiateQris}
              className="px-3.5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>QRIS</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL PEMBAYARAN TUNAI */}
      {showCashModal && (
        <CashPaymentModal
          grandTotal={grandTotal}
          subtotal={subtotal}
          discountAmount={validDiscount}
          totalItems={totalItemsCount}
          onClose={() => {
            setShowCashModal(false);
            refocusBarcode();
          }}
          onConfirm={handleConfirmCashPayment}
        />
      )}

      {/* MODAL PEMBAYARAN QRIS */}
      {showQrisModal && pendingQrisSale && (
        <QrisPaymentModal
          saleId={pendingQrisSale.saleId}
          receiptNumber={pendingQrisSale.receiptNumber}
          grandTotal={pendingQrisSale.grandTotal}
          qrCodeData={pendingQrisSale.qrCodeData}
          onClose={() => {
            setShowQrisModal(false);
            refocusBarcode();
          }}
          onPaymentSuccess={handleQrisSuccess}
        />
      )}

      {/* MODAL TAMBAH PRODUK CEPAT */}
      {showAddProductModal && (
        <QuickAddProductModal
          initialBarcode={unregisteredBarcode}
          onClose={() => {
            setShowAddProductModal(false);
            setUnregisteredBarcode('');
            refocusBarcode();
          }}
          onProductCreated={(product) => {
            addToCart(product);
            showNotice('success', `Produk baru "${product.name}" berhasil didaftarkan dan masuk keranjang.`);
            refocusBarcode();
          }}
        />
      )}

      {/* MODAL CETAK STRUK THERMAL */}
      {activeReceipt && (
        <ThermalReceipt
          receipt={activeReceipt}
          autoPrint={true}
          onClose={() => {
            setActiveReceipt(null);
            refocusBarcode();
          }}
        />
      )}
    </AppLayout>
  );
}
