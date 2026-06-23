'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, formatAuthError } from '@/context/AuthContext';
import { AuthError } from 'firebase/auth';
import { Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, Zap } from 'lucide-react';

/* Google 'G' logo SVG */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  );
}

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName);
      } else {
        await signIn(email, password);
      }
      setSuccess(true);
      setTimeout(() => router.replace('/'), 800);
    } catch (err) {
      setError(formatAuthError(err as AuthError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      setSuccess(true);
      setTimeout(() => router.replace('/'), 600);
    } catch (err) {
      const msg = formatAuthError(err as AuthError);
      if (msg) setError(msg); // empty string = cancelled popup, skip
    } finally {
      setGoogleLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError('');
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-hero-radial flex items-center justify-center px-4 py-16">
      {/* Decorative blobs */}
      <div
        className="fixed top-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="fixed bottom-1/4 left-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center mb-10"
        >
          <Link href="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}
            >
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">DeadlineOS</span>
          </Link>
        </motion.div>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel p-8"
        >
          {/* Header */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-1">
                  {mode === 'signin' ? 'Welcome back' : 'Create your account'}
                </h1>
                <p className="text-slate-500 text-sm">
                  {mode === 'signin'
                    ? 'Sign in to access your AI Chief of Staff'
                    : 'Start achieving your goals with AI guidance'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Google button */}
          <motion.button
            id="auth-google"
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || submitting || success}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm text-slate-700 transition-all duration-200 mb-5"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(203,213,225,0.8)',
              boxShadow: '0 1px 4px rgba(30,41,59,0.06)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(30,41,59,0.1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(30,41,59,0.06)'; }}
          >
            {googleLoading
              ? <Loader2 size={18} className="animate-spin text-slate-400" />
              : <GoogleIcon />}
            <span>Continue with Google</span>
          </motion.button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Mode Tabs */}
          <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: 'rgba(241, 245, 249, 0.8)' }}>
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                id={`auth-tab-${m}`}
                onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#4F46E5' : '#64748B',
                  boxShadow: mode === m ? '0 1px 4px rgba(30,41,59,0.08)' : 'none',
                }}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AnimatePresence>
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide uppercase">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Johnson"
                    required={mode === 'signup'}
                    className="glass-input w-full px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide uppercase">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="glass-input w-full px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 tracking-wide uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                  required
                  className="glass-input w-full px-4 py-3 pr-12 text-sm text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  id="auth-toggle-password"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="px-4 py-3 rounded-lg text-sm text-rose-600 font-medium"
                  style={{ background: 'rgba(244, 63, 94, 0.06)', border: '1px solid rgba(244, 63, 94, 0.15)' }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              id="auth-submit"
              type="submit"
              disabled={submitting || success}
              whileTap={{ scale: 0.98 }}
              className="btn-primary mt-2"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {success ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Redirecting…</span>
                </>
              ) : submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{mode === 'signup' ? 'Creating account…' : 'Signing in…'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                id="auth-mode-toggle"
                onClick={toggleMode}
                className="font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {mode === 'signin' ? 'Sign up free' : 'Sign in'}
              </button>
            </p>
          </div>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-6 mt-6 text-xs text-slate-400"
        >
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Secured by Firebase
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            AI by Gemini
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Free to start
          </span>
        </motion.div>
      </div>
    </div>
  );
}
