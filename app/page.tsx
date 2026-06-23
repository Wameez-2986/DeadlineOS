'use client';

import { useAuth } from '@/context/AuthContext';
import LandingPage from '@/components/LandingPage';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-luxury-grid">
        <div className="flex flex-col items-center gap-4">
          {/* Animated logo mark */}
          <div className="relative w-16 h-16">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-2xl">D</span>
            </div>
            {/* Spinning ring */}
            <div
              className="absolute -inset-2 rounded-3xl border-2 border-transparent"
              style={{
                borderTopColor: 'rgba(99, 102, 241, 0.5)',
                borderRightColor: 'rgba(99, 102, 241, 0.2)',
                animation: 'spin-slow 1.5s linear infinite',
              }}
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-slate-700 tracking-wide">DeadlineOS</p>
            <p className="text-xs text-slate-400">Preparing your workspace…</p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return <LandingPage />;
}
