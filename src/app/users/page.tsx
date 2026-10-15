'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  UserX,
  KeyRound,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
} from 'lucide-react';
import { formatDateTime } from '@/lib/format';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<any | null>(null);

  // Form Tambah Pengguna
  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [role, setRole] = useState<'ADMIN' | 'CASHIER'>('CASHIER');
  const [submittingAdd, setSubmittingAdd] = useState<boolean>(false);
  const [addError, setAddError] = useState<string>('');

  // Form Reset Password
  const [newPassword, setNewPassword] = useState<string>('');
  const [submittingPassword, setSubmittingPassword] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');

  const [notification, setNotification] = useState<{ type: string; message: string } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotice = (type: string, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (password.length < 6) {
      setAddError('Password minimal 6 karakter.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          email: email.trim() || undefined,
          password,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || 'Gagal mendaftarkan pengguna.');
        return;
      }

      showNotice('success', `Pengguna "${name}" berhasil didaftarkan.`);
      setShowAddModal(false);
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setAddError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleToggleActive = async (user: any) => {
    const action = user.isActive ? 'menonaktifkan' : 'mengaktifkan';
    if (!window.confirm(`Yakin ingin ${action} akun "${user.name}"?`)) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
      });

      if (res.ok) {
        showNotice('success', `Status akun "${user.name}" berhasil diperbarui.`);
        fetchUsers();
      }
    } catch (err) {
      showNotice('error', 'Gagal memperbarui status akun.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;

    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }

    setSubmittingPassword(true);
    setPasswordError('');

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedUserForPassword.id, newPassword }),
      });

      if (res.ok) {
        showNotice('success', `Password untuk "${selectedUserForPassword.name}" berhasil diubah.`);
        setSelectedUserForPassword(null);
        setNewPassword('');
      } else {
        const err = await res.json();
        setPasswordError(err.error || 'Gagal mereset password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  return (
    <AppLayout
      title="Kelola Pengguna & Hak Akses"
      subtitle="Manajemen akun kasir minimarket dan administrator sekolah"
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

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-600" />
            <h3 className="text-sm font-bold text-slate-800">Daftar Akun Kasir & Admin</h3>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>

        {/* TABEL PENGGUNA */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-2" />
                <span className="text-xs font-semibold">Memuat daftar pengguna...</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Username / Email</th>
                    <th className="py-3 px-4">Role Akses</th>
                    <th className="py-3 px-4 text-center">Total Transaksi</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div>{u.username}</div>
                        {u.email && <div className="text-[10px] text-slate-400">{u.email}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-brand-100 text-brand-700'
                          }`}
                        >
                          {u.role === 'ADMIN' ? 'Administrator' : 'Kasir'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {u._count?.sales || 0} struk
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {u.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUserForPassword(u);
                              setNewPassword('');
                              setPasswordError('');
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              u.isActive
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          >
                            {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH PENGGUNA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden my-auto">
            <div className="px-5 py-4 bg-brand-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <h3 className="text-sm font-bold">Daftarkan Pengguna Baru</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-brand-600 rounded text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5">
              {addError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Kasir"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: kasir2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email (Opsional)</label>
                <input
                  type="email"
                  placeholder="kasir2@alqalam.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hak Akses (Role)</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('CASHIER')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      role === 'CASHIER'
                        ? 'bg-brand-500 text-white border-brand-500 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Kasir (POS Saja)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('ADMIN')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      role === 'ADMIN'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingAdd ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Daftarkan Akun</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESET PASSWORD */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden my-auto">
            <div className="px-5 py-4 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-sm font-bold">Reset Password Akun</h3>
              </div>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="p-1 hover:bg-amber-600 rounded text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              {passwordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <p className="text-xs text-slate-600">
                Atur password baru untuk akun <strong>{selectedUserForPassword.name}</strong> (
                {selectedUserForPassword.username}):
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingPassword}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submittingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Perbarui Password</span>
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
