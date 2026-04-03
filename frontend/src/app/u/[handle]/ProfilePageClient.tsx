'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

import { useToast } from '@/components/ui/Toast';

export default function ProfilePageClient({ handle: staticHandle }: { handle: string }) {
  const pathname = usePathname(); // e.g. "/u/vial"
  // Try to get dynamic handle from URL, fallback to static if not on client
  const urlHandle = typeof window !== 'undefined' ? pathname.split('/')[2] : staticHandle;
  const handle = (urlHandle && urlHandle !== 'index') ? urlHandle : staticHandle;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!handle || handle === 'index') {
      setError('Uživatel nenalezen');
      setLoading(false);
      return;
    }
    api.users.profile(handle)
      .then(r => setProfile(r.profile))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [handle]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/${handle}` : `https://stpoints.fun/u/${handle}`;

  const copyShare = () => {
    navigator.clipboard?.writeText(shareUrl);
    toast('success', 'Odkaz byl zkopírován do schránky.');
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up max-w-lg mx-auto">
        {loading && (
          <div className="glass-card-static p-12 text-center text-text-muted">Načítám profil...</div>
        )}

        {error && (
          <div className="glass-card-static p-8 text-center">
            <p className="text-4xl mb-3">👻</p>
            <p className="text-text-primary font-semibold">Profil nenalezen</p>
            <p className="text-text-muted text-sm mt-1">@{handle}</p>
            <Link href="/wallet" className="btn-secondary text-sm px-4 py-2 mt-4 inline-block">← Zpět</Link>
          </div>
        )}

        {profile && !loading && (
          <>
            {/* Main card */}
            <div className="glass-card-static p-8 text-center relative overflow-hidden">
              {/* BG glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-st-purple/10 via-transparent to-st-cyan/10 pointer-events-none" />

              <div className="relative z-10">
                <div className="absolute top-4 right-4 z-20">
                  <button onClick={copyShare} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-glass-border tooltip-trigger" title="Sdílet profil">
                    <span className="text-xl">📤</span>
                  </button>
                </div>

                {/* Avatar */}
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.3))', border: '2px solid rgba(168,85,247,0.4)' }}>
                  {profile.username[0].toUpperCase()}
                </div>

                <h1 className="text-2xl font-bold text-text-primary">{profile.username}</h1>

                {profile.walletId && (
                  <p className="text-xs text-text-muted font-mono mt-1">ID: {profile.walletId}</p>
                )}

                <p className="text-xs text-text-muted mt-1">
                  Člen od {new Date(profile.joinedAt).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
                </p>

                {/* Balance */}
                <div className="mt-5 inline-block px-6 py-3 rounded-2xl" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                  <p className="text-3xl font-bold font-mono text-st-gold">{profile.balance}</p>
                  <p className="text-xs text-text-muted mt-0.5">ST Points</p>
                </div>
              </div>
            </div>

            {/* Handles */}
            <div className="glass-card-static p-5">
              <h2 className="font-semibold text-text-primary mb-3">🏷️ Handlery</h2>
              {profile.handles.length === 0 ? (
                <p className="text-text-muted text-sm">Žádné handlery</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.handles.map((h: any) => (
                    <span key={h.handle} className="px-3 py-1 rounded-full font-mono text-sm text-st-purple" style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)' }}>
                      @{h.handle}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Share */}
            <div className="glass-card-static p-5">
              <h2 className="font-semibold text-text-primary mb-3">🔗 Sdílet profil</h2>
              <div className="flex items-center gap-3">
                <code className="flex-1 bg-white/5 rounded-xl px-4 py-2.5 text-sm font-mono text-text-secondary border border-glass-border overflow-x-auto whitespace-nowrap">
                  {shareUrl}
                </code>
                <button onClick={copyShare} className="btn-secondary text-sm px-4 py-2 shrink-0">
                  Kopírovat
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
