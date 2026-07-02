'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Sparkles, AlertCircle, BookOpen } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed: 'Authentication failed. Please try again.',
  no_code: 'Login was cancelled or expired. Please try again.',
  domain_not_allowed:
    'Your email domain is not authorised for this platform. Please contact your school administrator.',
};

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const errorKey = searchParams.get('error');
  const serverError = errorKey ? ERROR_MESSAGES[errorKey] ?? 'An error occurred.' : null;

  function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const nextVal = searchParams.get('next') ?? '/dashboard';
    window.location.href = `/api/auth/login?next=${encodeURIComponent(nextVal)}`;
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden grid-bg"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Glow orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6278f8, transparent)' }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Card */}
        <div className="glass-card p-10 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6278f8,#4a57ed)' }}
            >
              <span className="text-2xl font-bold text-white">AR</span>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Welcome to EduAR
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Sign in with your Google account to access the Teacher Portal
          </p>

          {/* Error from server redirect */}
          {(serverError || error) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 rounded-xl mb-6 text-left"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{serverError ?? error}</p>
            </motion.div>
          )}

          {/* Google Sign-In Button */}
          <button
            id="google-login-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 relative overflow-hidden group"
            style={{
              background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: loading ? 'var(--text-secondary)' : 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.13)';
                e.currentTarget.style.borderColor = 'rgba(98,120,248,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            }}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-5 h-5 text-indigo-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Signing in…</span>
              </>
            ) : (
              <>
                {/* Google G icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Teacher access only
            </span>
            <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
          </div>

          {/* Info blurb */}
          <div
            className="flex items-start gap-3 p-4 rounded-xl text-left"
            style={{ background: 'rgba(98,120,248,0.07)', border: '1px solid rgba(98,120,248,0.15)' }}
          >
            <BookOpen size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#8199fb' }} />
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: '#8199fb' }}>
                Educators only
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                EduAR is built for teachers. Sign in with your school or personal Google account to get started.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-1 mt-6">
          <Sparkles size={12} style={{ color: 'var(--text-secondary)' }} />
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            EduAR — Bringing history & science to life in your classroom
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white" style={{ background: 'var(--bg-primary)' }}>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
