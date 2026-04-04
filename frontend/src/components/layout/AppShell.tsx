'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import ActivityTicker from '@/components/layout/ActivityTicker';
import { api } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="ST-Points Logo" className="w-16 h-16 object-contain mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          <p className="text-text-secondary text-sm">Načítání systému...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      {user && <div className="fixed top-[60px] md:top-[52px] left-0 right-0 z-40"><ActivityTicker /></div>}
      <main className={user ? 'pt-[120px] md:pt-[88px] pb-8 px-4 sm:px-6' : ''}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
