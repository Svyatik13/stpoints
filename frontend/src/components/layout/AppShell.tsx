'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import { api } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  // Universal Redirect Engine for Static Export
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/invite/') && path.length > 8) {
        const username = path.substring(8).replace(/\/$/, ''); // Remove /invite/ and trailing slash
        if (username) {
          // Track click
          api.users.recordReferralClick(username).catch(() => {});
          // Redirect to register with ref
          window.location.href = `/auth/register?ref=${username}`;
        }
      }
    }
  }, []);

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
      <main className={user ? 'pt-28 md:pt-20 pb-8 px-4 sm:px-6' : ''}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
