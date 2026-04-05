'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import ChatSidebar from '@/components/chat/ChatSidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [broadcast, setBroadcast] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetch(`${window.location.origin}/api/broadcast`).then(r => r.json()).then(d => setBroadcast(d.message)).catch(() => {});
    }
  }, [user]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 relative">
            <div className="absolute inset-0 border-4 border-st-cyan/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 border-t-4 border-st-cyan rounded-full animate-spin"></div>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-st-cyan/50 text-[10px] uppercase tracking-[0.2em] font-black animate-pulse">Loading</p>
            <h1 className="text-2xl font-black tracking-tight text-white/90">ST-POINTS</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <ChatSidebar />
      {broadcast && (
        <div className="fixed top-[64px] md:top-[56px] left-0 right-0 z-40 bg-gradient-to-r from-st-gold/20 via-st-gold/10 to-st-gold/20 border-b border-st-gold/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-center gap-2">
            <span className="text-st-gold text-sm">📢</span>
            <p className="text-st-gold text-sm font-medium">{broadcast}</p>
            <button onClick={() => setBroadcast(null)} className="ml-2 text-st-gold/50 hover:text-st-gold text-xs">✕</button>
          </div>
        </div>
      )}
      <main className={user ? `${broadcast ? 'pt-[112px] md:pt-[100px]' : 'pt-[80px] md:pt-[72px]'} pb-8 px-4 sm:px-6 transition-all duration-300` : ''}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
