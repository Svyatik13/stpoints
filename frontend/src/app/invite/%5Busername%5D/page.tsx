'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function InviteRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  useEffect(() => {
    if (username) {
      // Small delay just to show a nice loading state (optional)
      const timeout = setTimeout(() => {
        router.replace(`/auth/register?ref=${username}`);
      }, 800);
      return () => clearTimeout(timeout);
    } else {
      router.replace('/auth/register');
    }
  }, [username, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b14] overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-st-cyan/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-st-purple/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 glass-card p-12 text-center space-y-6 max-w-sm w-full mx-4 shadow-2xl border-white/5">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-3xl bg-st-cyan/10 flex items-center justify-center text-4xl animate-bounce">
            🎁
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-st-gold flex items-center justify-center text-[10px] font-bold text-black border-2 border-[#070b14]">
            +
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-white">Přijímáme pozvánku...</h1>
          <p className="text-text-muted text-sm px-4 leading-relaxed">
            Od: <span className="text-text-primary font-bold">@{username}</span>
            <br />
            Při registraci získáte <span className="text-st-emerald font-bold">10.000 ST</span> jako vstupní bonus!
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 pt-4">
          <div className="w-full h-1 bg-white/[0.05] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-st-cyan to-st-purple animate-shimmer" style={{ width: '100%' }} />
          </div>
          <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">Načítání Registrace</p>
        </div>
      </div>
    </div>
  );
}
