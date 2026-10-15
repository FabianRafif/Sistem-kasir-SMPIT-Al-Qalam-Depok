'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  BarChart3,
  Users,
  Settings,
  LogOut,
  User as UserIcon,
  X,
} from 'lucide-react';
import { UserSession } from '@/lib/types';

interface SidebarProps {
  user: UserSession | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ user, isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navItems = [
    {
      label: 'Kasir (POS)',
      href: '/pos',
      icon: ShoppingCart,
      roles: ['ADMIN', 'CASHIER'],
      highlight: true,
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN', 'CASHIER'],
    },
    {
      label: 'Data Produk',
      href: '/products',
      icon: Package,
      roles: ['ADMIN', 'CASHIER'],
    },
    {
      label: 'Inventaris & Stok',
      href: '/inventory',
      icon: Boxes,
      roles: ['ADMIN'],
    },
    {
      label: 'Riwayat Transaksi',
      href: '/transactions',
      icon: Receipt,
      roles: ['ADMIN', 'CASHIER'],
    },
    {
      label: 'Laporan Penjualan',
      href: '/reports',
      icon: BarChart3,
      roles: ['ADMIN'],
    },
    {
      label: 'Kelola Pengguna',
      href: '/users',
      icon: Users,
      roles: ['ADMIN'],
    },
    {
      label: 'Pengaturan Toko',
      href: '/settings',
      icon: Settings,
      roles: ['ADMIN'],
    },
  ];

  return (
    <>
      {/* Backdrop Gelap untuk Layar Mobile / Tablet (< lg) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer / Sidebar Utama */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-[100dvh] max-h-[100dvh] select-none no-print transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand & Logo Resmi SMPIT Al Qalam */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative w-11 h-11 flex-shrink-0 bg-white rounded-lg p-1 shadow-sm border border-slate-200 flex items-center justify-center">
              <Image
                src="/logo-alqalam.png"
                alt="Logo SMPIT Al Qalam"
                width={40}
                height={40}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 truncate">
                SMPIT AL QALAM
              </span>
              <span className="text-sm font-extrabold text-slate-800 tracking-tight leading-tight truncate">
                POS MINIMARKET
              </span>
              <span className="text-[10px] text-slate-500 font-medium truncate">Sistem Kasir Sekolah</span>
            </div>
          </div>

          {/* Tombol Tutup Sidebar pada Layar Kecil (Mobile/Tablet) */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors flex-shrink-0"
              aria-label="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigasi Utama */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            if (user && !item.roles.includes(user.role)) return null;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (onClose) onClose();
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? item.highlight
                      ? 'bg-brand-500 text-white shadow-sm font-semibold'
                      : 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive
                      ? item.highlight
                        ? 'text-white'
                        : 'text-brand-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[10px] uppercase font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded">
                    POS
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Info Kasir / Profil & Logout */}
        <div className="p-3.5 pb-12 sm:pb-3.5 border-t border-slate-200 bg-slate-50/95 flex-shrink-0">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 border border-brand-200">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-5 h-5" />}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-slate-800 truncate">
                {user?.name || 'Kasir'}
              </span>
              <span className="text-[11px] text-slate-500 capitalize flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {user?.role === 'ADMIN' ? 'Administrator' : 'Kasir Aktif'}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              if (onClose) onClose();
              handleLogout();
            }}
            className="mt-2.5 w-full flex items-center justify-center gap-2 px-3.5 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors border border-rose-200 bg-white shadow-xs active:bg-rose-100"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>
    </>
  );
}
