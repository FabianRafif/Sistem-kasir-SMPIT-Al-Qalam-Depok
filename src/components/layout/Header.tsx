'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Database, Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentDate(
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(now)
      );
      setCurrentTime(
        new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).format(now) + ' WIB'
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between select-none no-print gap-2 sm:gap-4">
      {/* Tombol Hamburger & Judul Halaman */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Buka Menu Navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-slate-800 leading-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden xs:block sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Bagian Kanan: Status Sistem & Jam */}
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        {/* Status Database */}
        <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] sm:text-xs font-semibold border border-emerald-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Sistem Siap (MySQL Terhubung)</span>
          <span className="md:hidden font-mono">MySQL</span>
        </div>

        {/* Jam & Tanggal Asia/Jakarta */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-600 bg-slate-100/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border border-slate-200 text-[11px] sm:text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden xl:inline">{currentDate}</span>
          <span className="hidden xl:inline text-slate-300">|</span>
          <span className="font-mono font-bold text-slate-800 tabular-nums">{currentTime}</span>
        </div>
      </div>
    </header>
  );
}
