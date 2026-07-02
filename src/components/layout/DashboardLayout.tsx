'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, UserPlus, Video,
  Settings, SaveAll, ChevronRight, BrainCircuit, LogOut, ChevronDown
} from 'lucide-react';
import type { Database } from '@/lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const NAV_ITEMS = [
  { href: '/dashboard',            icon: LayoutDashboard, label: 'Dashboard'            },
  { href: '/characters',           icon: Users,           label: 'Characters'           },
  { href: '/characters/create-ai', icon: BrainCircuit,    label: 'AI Character Builder' },
  { href: '/characters/create',    icon: UserPlus,        label: 'Manual Create'        },
  { href: '/recordings',           icon: Video,           label: 'Sessions'             },
  { href: '/templates',            icon: SaveAll,         label: 'Templates'            },
  { href: '/settings',             icon: Settings,        label: 'Settings'             },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const body = await res.json();
          setProfile(body.profile);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
      }
    }
    loadProfile();
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    window.location.href = '/api/auth/logout';
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'T';

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 glass-dark flex flex-col py-6"
             style={{ borderRight: '1px solid rgba(98,120,248,0.15)', minHeight: '100vh' }}>

        {/* Logo */}
        <div className="px-6 mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#6278f8,#4a57ed)' }}>
              <span className="text-base font-bold text-white">AR</span>
            </div>
            <div>
              <div className="font-display font-bold text-white text-lg leading-none">EduAR</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Teacher Portal</div>
            </div>
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}>
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: active ? 'rgba(98,120,248,0.2)' : 'transparent',
                    color: active ? '#ffffff' : '#9196b8',
                    borderLeft: active ? '3px solid #6278f8' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(98,120,248,0.1)';
                    (e.currentTarget as HTMLDivElement).style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = active ? 'rgba(98,120,248,0.2)' : 'transparent';
                    (e.currentTarget as HTMLDivElement).style.color = active ? '#ffffff' : '#9196b8';
                  }}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{label}</span>
                  {active && <ChevronRight size={14} className="ml-auto" />}
                </div>
              </Link>
            );
          })}

          {/* Admin Section */}
          {profile?.role === 'super_admin' && (
            <>
              <div className="px-3 pt-4 pb-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                Admin Settings
              </div>
              <Link href="/admin">
                <div
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: pathname === '/admin' ? 'rgba(98,120,248,0.2)' : 'transparent',
                    color: pathname === '/admin' ? '#ffffff' : '#9196b8',
                    borderLeft: pathname === '/admin' ? '3px solid #6278f8' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = 'rgba(98,120,248,0.1)';
                    (e.currentTarget as HTMLDivElement).style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background = pathname === '/admin' ? 'rgba(98,120,248,0.2)' : 'transparent';
                    (e.currentTarget as HTMLDivElement).style.color = pathname === '/admin' ? '#ffffff' : '#9196b8';
                  }}
                >
                  <Users size={18} />
                  <span className="text-sm font-medium">Admin Center</span>
                  {pathname === '/admin' && <ChevronRight size={14} className="ml-auto" />}
                </div>
              </Link>
            </>
          )}
        </nav>

        {/* ── User Section ── */}
        <div className="px-3 pt-4 border-t" style={{ borderColor: 'rgba(98,120,248,0.15)' }}>
          <div className="relative">
            <button
              id="user-menu-btn"
              onClick={() => setUserMenuOpen((o) => !o)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left"
              style={{ background: 'rgba(0,0,0,0.2)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(98,120,248,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
            >
              {/* Avatar */}
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? 'Teacher'}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6278f8,#4a57ed)', color: 'white' }}
                >
                  {initials}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">
                  {profile?.full_name ?? 'Teacher'}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {profile?.role === 'school_admin'
                    ? 'School Admin'
                    : profile?.role === 'super_admin'
                    ? 'Super Admin'
                    : profile?.school_name ?? 'Free Plan'}
                </div>
              </div>
              <ChevronDown
                size={14}
                style={{
                  color: 'var(--text-secondary)',
                  transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden"
                style={{ background: 'rgba(15,15,30,0.98)', border: '1px solid rgba(98,120,248,0.2)', zIndex: 50 }}
              >
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'white')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                >
                  <Settings size={15} />
                  Settings
                </Link>
                <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                <button
                  id="sign-out-btn"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
                  style={{ color: signingOut ? 'var(--text-secondary)' : '#f87171' }}
                  onMouseEnter={(e) => { if (!signingOut) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  {signingOut ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                  ) : (
                    <LogOut size={15} />
                  )}
                  {signingOut ? 'Signing out…' : 'Sign Out'}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
