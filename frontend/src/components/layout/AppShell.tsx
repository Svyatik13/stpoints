'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Navbar from '@/components/layout/Navbar';
import ActivityTicker from '@/components/layout/ActivityTicker';
import ChatSidebar from '@/components/chat/ChatSidebar';
import { api } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
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
      <main className={user ? 'pt-[80px] md:pt-[72px] pb-8 px-4 sm:px-6 transition-all duration-300' : ''}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </>
  );
}
