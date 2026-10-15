'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Database, Wifi } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);

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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between select-none no-print">
      <div>
        <h1 className="text-lg font-bold text-slate-800 leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        {/* Status Sistem & Database */}
        <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem Siap (MySQL Terhubung)</span>
        </div>

        {/* Jam & Tanggal Asia/Jakarta */}
        <div className="flex items-center gap-2 text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{currentDate}</span>
          <span className="text-slate-300">|</span>
          <span className="font-mono font-bold text-slate-800 tabular-nums">{currentTime}</span>
        </div>
      </div>
    </header>
  );
}
