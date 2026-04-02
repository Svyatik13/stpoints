'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Giveaway } from '@/types';
import AppShell from '@/components/layout/AppShell';

export default function GiveawaysPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadGiveaways();
  }, [user]);

  async function loadGiveaways() {
    try {
      const data = await api.giveaway.recent(50);
      setGiveaways(data.giveaways);
    } catch {} finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🎁 ST-Drops</h1>
          <p className="text-text-secondary text-sm mt-1">
            Automatické giveaway — každých 6 hodin vyhrává náhodný aktivní uživatel
          </p>
        </div>

        {/* How it works */}
        <div className="glass-card p-6 glow-gold">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-st-gold-dim flex items-center justify-center text-3xl shrink-0">
              🎰
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold mb-1">Jak ST-Drops fungují</h2>
              <p className="text-text-secondary text-sm">
                Každých <span className="text-st-gold font-semibold">6 hodin</span> ZČU Central Node vybere 
                náhodného aktivního uživatele a přidělí mu <span className="text-st-gold font-mono font-semibold">0.5 ST</span>.
                Stačí být přihlášen a aktivní v posledních 24 hodinách.
              </p>
            </div>
            <div className="text-center p-4 rounded-xl bg-st-gold-dim/50 border border-st-gold/10">
              <p className="text-3xl font-bold font-mono text-st-gold text-glow-gold">0.5</p>
              <p className="text-xs text-text-muted mt-1">ST / drop</p>
            </div>
          </div>
        </div>

        {/* Eligibility check */}
        <div className="glass-card-static p-5">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${user.lastActiveAt ? 'bg-st-emerald animate-pulse' : 'bg-st-red'}`} />
            <div>
              <p className="font-semibold">
                {user.lastActiveAt ? 'Jste způsobilý pro další ST-Drop!' : 'Zatím nejste způsobilý'}
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                Pro účast buďte aktivní (těžba, transakce) v posledních 24 hodinách
              </p>
            </div>
          </div>
        </div>

        {/* Giveaway History */}
        <div className="glass-card-static p-6">
          <h2 className="text-xl font-bold mb-4">📜 Historie ST-Drops</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : giveaways.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <span className="text-4xl block mb-3">🎁</span>
              <p>Zatím žádné ST-Drops. První přijde brzy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {giveaways.map((g, i) => (
                <div
                  key={g.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                    g.winner.username === user.username
                      ? 'bg-st-gold-dim/30 border border-st-gold/20'
                      : 'bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-st-gold-dim flex items-center justify-center text-lg font-bold font-mono text-st-gold">
                    #{giveaways.length - i}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {g.winner.username}
                      </span>
                      {g.winner.username === user.username && (
                        <span className="badge badge-gold text-[10px]">VY</span>
                      )}
                    </div>
                    <p className="text-text-muted text-xs mt-0.5">
                      {g.reason} • {g.pool} kandidátů
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono text-st-gold">+{parseFloat(g.amount).toFixed(4)} ST</p>
                    <p className="text-text-muted text-[10px] mt-0.5">
                      {new Date(g.createdAt).toLocaleString('cs-CZ', { 
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
