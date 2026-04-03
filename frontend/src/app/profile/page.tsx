'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

interface ProfileStats {
  miningSessionsCompleted: number;
  totalMined: string;
  transfersSent: number;
  transfersReceived: number;
  giveawayWins: number;
  caseOpenings: number;
  totalEarned: string;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.profile.get()
      .then(data => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const balance = parseFloat(user.balance);
  const memberSince = new Date(user.createdAt);
  const daysSince = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header Card */}
        <div className="glass-card p-8 glow-cyan">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-st-cyan/30 to-st-purple/30 flex items-center justify-center text-4xl font-bold text-st-cyan border border-st-cyan/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{user.username}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className={`badge ${user.role === 'ADMIN' ? 'badge-red' : 'badge-cyan'}`}>
                  {user.role === 'ADMIN' ? '👑 Administrátor' : '👤 Uživatel'}
                </span>
                <span className="text-text-muted text-xs">
                  Člen {daysSince} dní • od {memberSince.toLocaleDateString('cs-CZ')}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Zůstatek</p>
              <p className="text-2xl font-black font-mono text-st-cyan text-glow-cyan">
                {balance.toFixed(6)} ST
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-shimmer" />
            ))}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card-static p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span>⛏️</span>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Těžební Sessions</span>
                </div>
                <p className="text-2xl font-bold font-mono text-st-purple">{stats.miningSessionsCompleted}</p>
              </div>
              <div className="glass-card-static p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span>💎</span>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Celkem Odtěženo</span>
                </div>
                <p className="text-2xl font-bold font-mono text-st-gold">{parseFloat(stats.totalMined).toFixed(4)} ST</p>
              </div>
              <div className="glass-card-static p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span>📤</span>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Převody Odesláno</span>
                </div>
                <p className="text-2xl font-bold font-mono">{stats.transfersSent}</p>
              </div>
              <div className="glass-card-static p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span>📥</span>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Převody Přijato</span>
                </div>
                <p className="text-2xl font-bold font-mono">{stats.transfersReceived}</p>
              </div>
              <div className="glass-card-static p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span>🎁</span>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Giveaway Výhry</span>
                </div>
                <p className="text-2xl font-bold font-mono text-st-gold">{stats.giveawayWins}</p>
              </div>
              <div className="glass-card-static p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span>📦</span>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Cases Otevřeno</span>
                </div>
                <p className="text-2xl font-bold font-mono">{stats.caseOpenings}</p>
              </div>
              <div className="glass-card-static p-5 col-span-2 border-st-emerald/20 glow-emerald">
                <div className="flex items-center gap-2 mb-2">
                  <span>📈</span>
                  <span className="text-text-muted text-xs uppercase tracking-wider">Celkem Vyděláno</span>
                </div>
                <p className="text-2xl font-bold font-mono text-st-emerald">{parseFloat(stats.totalEarned).toFixed(4)} ST</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => router.push('/mining')} className="glass-card-static p-5 text-left hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⛏️</span>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-st-cyan transition-colors">Jít těžit</p>
                    <p className="text-text-muted text-xs">Vydělej další ST</p>
                  </div>
                </div>
              </button>
              <button onClick={() => router.push('/leaderboard')} className="glass-card-static p-5 text-left hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-st-gold transition-colors">Žebříček</p>
                    <p className="text-text-muted text-xs">Porovnej se s ostatními</p>
                  </div>
                </div>
              </button>
              <button onClick={() => router.push('/wallet')} className="glass-card-static p-5 text-left hover:bg-white/[0.04] transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💎</span>
                  <div>
                    <p className="font-semibold text-sm group-hover:text-st-cyan transition-colors">Peněženka</p>
                    <p className="text-text-muted text-xs">Zobraz transakce</p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
