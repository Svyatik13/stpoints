'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useI18n } from '@/lib/i18n';

interface LeaderboardEntry {
  rank: number;
  username: string;
  value: string;
  createdAt?: string;
}

export default function LeaderboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.leaderboard.get('balance', 50)
      .then(data => setEntries(data.leaderboard))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const myRank = entries.findIndex(e => e.username === user.username) + 1;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">🏆 {t.leaderboard.title}</h1>
            <p className="text-text-secondary text-sm mt-1">
              {t.leaderboard.subtitle}
            </p>
          </div>
          {myRank > 0 && (
            <div className="glass-card-static px-4 py-2 text-center">
              <p className="text-text-muted text-xs">{t.leaderboard.yourRank}</p>
              <p className="text-st-gold font-mono font-bold text-lg">#{myRank}</p>
            </div>
          )}
        </div>


        {/* Leaderboard Table */}
        <div className="glass-card-static overflow-hidden">
          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <span className="text-4xl block mb-3">🏆</span>
              <p>{t.leaderboard.empty}</p>
            </div>
          ) : (
            <div>
              {/* Top 3 podium */}
              {entries.length >= 3 && (
                <div className="grid grid-cols-3 gap-4 p-6 pb-2">
                  {[1, 0, 2].map(idx => {
                    const e = entries[idx];
                    if (!e) return null;
                    const isMe = e.username === user.username;
                    const colors = [
                      'text-st-gold border-st-gold/30 glow-gold',
                      'text-gray-300 border-gray-400/30',
                      'text-orange-400 border-orange-400/30',
                    ];
                    const sizes = ['text-2xl', 'text-xl', 'text-xl'];
                    return (
                      <div
                        key={e.rank}
                        className={`glass-card-static p-4 text-center border ${colors[idx]} ${idx === 0 ? 'row-start-1 -mt-4' : ''}`}
                      >
                        <span className="text-3xl block mb-2">{medals[idx]}</span>
                        <p className={`font-bold ${sizes[idx]} ${isMe ? 'text-st-cyan' : ''}`}>
                          {e.username}
                        </p>
                        <p className="font-mono font-bold text-sm mt-1" style={{ color: '#00e8ff' }}>
                          {parseFloat(e.value).toFixed(4)} ST
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Full list */}
              <div className="divide-y divide-glass-border/50">
                {entries.map(e => {
                  const isMe = e.username === user.username;
                  return (
                    <div
                      key={e.rank}
                      className={`flex items-center justify-between px-6 py-3 transition-colors hover:bg-white/[0.02] ${isMe ? 'bg-st-cyan-dim/20' : ''}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 text-center font-bold font-mono text-sm ${e.rank <= 3 ? 'text-st-gold' : 'text-text-muted'}`}>
                          {e.rank <= 3 ? medals[e.rank - 1] : `#${e.rank}`}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs font-bold text-text-secondary">
                          {e.username.charAt(0).toUpperCase()}
                        </div>
                        <span className={`font-semibold text-sm ${isMe ? 'text-st-cyan' : 'text-text-primary'}`}>
                          {e.username} {isMe && <span className="text-xs text-text-muted">{t.leaderboard.you}</span>}
                        </span>
                      </div>
                      <span className="font-mono font-semibold text-sm" style={{ color: '#00e8ff' }}>
                        {parseFloat(e.value).toFixed(4)} ST
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
