'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Login gagal. Periksa kembali username dan password Anda.');
        return;
      }

      // Login berhasil -> Arahkan ke kasir atau dashboard
      if (data.user?.role === 'CASHIER') {
        router.push('/pos');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan koneksi ke server.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Visual Identitas SMPIT Al Qalam */}
        <div className="bg-brand-500 pt-8 pb-7 px-6 text-center text-white relative">
          <div className="w-24 h-24 mx-auto bg-white rounded-2xl p-2.5 shadow-lg flex items-center justify-center border-2 border-brand-200 mb-3 overflow-hidden">
            <Image
              src="/logo-alqalam.png"
              alt="Logo Resmi SMPIT Al Qalam"
              width={240}
              height={240}
              unoptimized
              priority
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-black tracking-tight leading-snug">
            POS MINIMARKET
          </h1>
          <p className="text-xs font-semibold text-brand-100 tracking-wide uppercase mt-0.5">
            SMPIT AL QALAM
          </p>
          <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold bg-brand-600/60 px-2 py-0.5 rounded-full text-brand-100">
            <ShieldCheck className="w-3 h-3 text-brand-200" />
            <span>Akses Terenkripsi</span>
          </div>
        </div>

        {/* Form Login */}
        <div className="p-6 md:p-8">
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username / Email
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Masukkan username kasir atau admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 focus:border-brand-500 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="Masukkan password akun Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 focus:border-brand-500 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akses...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem Kasir</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Akun Demo Pengujian untuk Pihak Sekolah */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Akun Pengujian Demo Sekolah
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill('admin', 'AdminAlQalam2026!')}
                className="p-2 bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 hover:border-brand-200 rounded-lg text-left transition-colors font-medium"
              >
                <div className="font-bold text-slate-900">Administrator</div>
                <div className="text-[10px] text-slate-500 font-mono">admin</div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('kasir1', 'KasirAlQalam2026!')}
                className="p-2 bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-700 border border-slate-200 hover:border-brand-200 rounded-lg text-left transition-colors font-medium"
              >
                <div className="font-bold text-slate-900">Kasir Toko 1</div>
                <div className="text-[10px] text-slate-500 font-mono">kasir1</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
          Sistem Point of Sale Resmi SMPIT Al Qalam • Versi 1.0
        </div>
      </div>
    </div>
  );
}
