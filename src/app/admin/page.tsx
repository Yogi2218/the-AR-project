'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, CheckCircle2, XCircle, ShieldAlert,
  Search, Eye, Edit2, Loader2, Sparkles, BookOpen, GraduationCap
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';

const ALL_CHARACTERS = [
  { id: 'einstein',  name: 'Albert Einstein' },
  { id: 'gandhi',    name: 'Mahatma Gandhi'  },
  { id: 'curie',     name: 'Marie Curie'     },
  { id: 'kalam',     name: 'APJ Abdul Kalam' },
  { id: 'cleopatra', name: 'Cleopatra'       },
  { id: 'davinci',   name: 'Leonardo da Vinci' }
];

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to load users');
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function handleUpdateUser(payload: {
    userId: string;
    role: string;
    status: string;
    visible_characters: string[];
  }) {
    setUpdating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to update user');
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === payload.userId
            ? { ...u, role: payload.role, status: payload.status, visible_characters: payload.visible_characters }
            : u
        )
      );
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    } finally {
      setUpdating(false);
    }
  }

  const filteredUsers = users.filter((user) => {
    const q = search.toLowerCase();
    return (
      (user.full_name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      (user.school_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl mx-auto min-h-screen relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Admin Control</span>
              <Sparkles size={12} className="text-indigo-400" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white">Users & Approval Center</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Manage teacher access, approve accounts, and customize visible classroom characters.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search teachers, emails..."
              className="input-field w-full pl-10 py-2.5"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading user registry…</p>
          </div>
        ) : error ? (
          <div className="glass-card p-6 text-center text-red-300 max-w-md mx-auto">
            <ShieldAlert size={32} className="mx-auto mb-3 text-red-400" />
            <h3 className="font-bold mb-1">Access Denied</h3>
            <p className="text-sm mb-4">{error}</p>
            <button onClick={fetchUsers} className="btn-primary py-2 px-4 text-xs mx-auto">Retry</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="glass-card p-12 text-center" style={{ color: 'var(--text-secondary)' }}>
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No teachers found matching your search.</p>
          </div>
        ) : (
          /* Users Table */
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th className="p-4 text-xs font-semibold text-white">Teacher</th>
                    <th className="p-4 text-xs font-semibold text-white">School</th>
                    <th className="p-4 text-xs font-semibold text-white">Role</th>
                    <th className="p-4 text-xs font-semibold text-white">Status</th>
                    <th className="p-4 text-xs font-semibold text-white">Visible Characters</th>
                    <th className="p-4 text-xs font-semibold text-white text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => {
                    const initials = user.full_name
                      ? user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                      : 'T';

                    return (
                      <tr key={user.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.avatar_url ? (
                              <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                   style={{ background: 'linear-gradient(135deg,#6278f8,#4a57ed)' }}>
                                {initials}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-white">{user.full_name || 'Pending Onboarding'}</div>
                              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-white">{user.school_name || '—'}</div>
                          <div className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                            <GraduationCap size={12} /> {user.class_level || '—'}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                                style={{
                                  background: user.role === 'super_admin' ? 'rgba(98,120,248,0.15)' : 'rgba(255,255,255,0.05)',
                                  color: user.role === 'super_admin' ? '#8199fb' : '#9196b8',
                                  border: user.role === 'super_admin' ? '1px solid rgba(98,120,248,0.25)' : '1px solid rgba(255,255,255,0.06)'
                                }}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 w-fit"
                                style={{
                                  background: user.status === 'approved' ? 'rgba(34,197,94,0.1)' : user.status === 'pending' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                                  color: user.status === 'approved' ? '#4ade80' : user.status === 'pending' ? '#facc15' : '#f87171',
                                }}>
                            {user.status === 'approved' ? <CheckCircle2 size={12} /> : user.status === 'pending' ? <Eye size={12} /> : <XCircle size={12} />}
                            {user.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {user.visible_characters && user.visible_characters.length > 0 ? (
                              user.visible_characters.map((c: string) => (
                                <span key={c} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-white font-medium capitalize">
                                  {c}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>None (dashboard blank)</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="btn-secondary py-1.5 px-3.5 text-xs flex items-center gap-1.5 ml-auto"
                          >
                            <Edit2 size={12} /> Edit Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit User Modal Drawer */}
        <AnimatePresence>
          {editingUser && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                exit={{ opacity: 0 }}
                onClick={() => setEditingUser(null)}
                className="fixed inset-0 bg-black z-40"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 glass-dark p-8 flex flex-col justify-between"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', height: '100vh', overflowY: 'auto' }}
              >
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Edit Access Rights</h3>
                  <p className="text-xs mb-6" style={{ color: 'var(--text-secondary)' }}>
                    Configure role, active permission status, and dashboard characters for {editingUser.full_name || editingUser.email}
                  </p>

                  <div className="space-y-6">
                    {/* Status selection */}
                    <div>
                      <label className="block text-xs font-semibold text-white mb-2 uppercase tracking-wider">Access Status</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['pending', 'approved', 'suspended'].map((st) => (
                          <button
                            key={st}
                            onClick={() => setEditingUser((u: any) => ({ ...u, status: st }))}
                            className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                            style={{
                              background: editingUser.status === st
                                ? st === 'approved' ? 'rgba(34,197,94,0.2)' : st === 'pending' ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)'
                                : 'rgba(255,255,255,0.04)',
                              color: editingUser.status === st
                                ? st === 'approved' ? '#4ade80' : st === 'pending' ? '#facc15' : '#f87171'
                                : 'var(--text-secondary)',
                              border: editingUser.status === st
                                ? st === 'approved' ? '1px solid rgba(34,197,94,0.4)' : st === 'pending' ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(239,68,68,0.4)'
                                : '1px solid transparent'
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Role Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-white mb-2 uppercase tracking-wider">Platform Role</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['teacher', 'super_admin'].map((rl) => (
                          <button
                            key={rl}
                            onClick={() => setEditingUser((u: any) => ({ ...u, role: rl }))}
                            className="py-2 rounded-xl text-xs font-semibold capitalize transition-all"
                            style={{
                              background: editingUser.role === rl ? 'rgba(98,120,248,0.2)' : 'rgba(255,255,255,0.04)',
                              color: editingUser.role === rl ? '#8199fb' : 'var(--text-secondary)',
                              border: editingUser.role === rl ? '1px solid rgba(98,120,248,0.4)' : '1px solid transparent'
                            }}
                          >
                            {rl === 'super_admin' ? 'Super Admin' : 'Teacher'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visible Characters Checkbox */}
                    <div>
                      <label className="block text-xs font-semibold text-white mb-2 uppercase tracking-wider">Visible Characters</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto p-1.5 rounded-xl border border-white/5 bg-black/20">
                        {ALL_CHARACTERS.map((char) => {
                          const list = editingUser.visible_characters || [];
                          const checked = list.includes(char.id);

                          function handleToggle() {
                            const updated = checked
                              ? list.filter((id: string) => id !== char.id)
                              : [...list, char.id];
                            setEditingUser((u: any) => ({ ...u, visible_characters: updated }));
                          }

                          return (
                            <label
                              key={char.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-white/[0.02]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={handleToggle}
                                className="rounded text-indigo-600 focus:ring-indigo-500 bg-white/5 border-white/10"
                              />
                              <span className="text-xs font-medium text-white">{char.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-8 border-t border-white/5 pt-4">
                  <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1 py-2.5 text-xs">
                    Cancel
                  </button>
                  <button
                    disabled={updating}
                    onClick={() =>
                      handleUpdateUser({
                        userId: editingUser.id,
                        role: editingUser.role,
                        status: editingUser.status,
                        visible_characters: editingUser.visible_characters || [],
                      })
                    }
                    className="btn-primary flex-1 py-2.5 text-xs flex items-center justify-center gap-1.5"
                  >
                    {updating && <Loader2 size={12} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
