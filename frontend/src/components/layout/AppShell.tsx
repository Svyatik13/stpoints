'use client';

import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-st-cyan to-st-purple flex items-center justify-center text-black font-bold text-xl mx-auto mb-4 animate-pulse">
            ST
          </div>
          <p className="text-text-secondary text-sm">Načítání systému...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className={user ? 'pt-24 md:pt-16 pb-8 px-4 sm:px-6' : ''}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
