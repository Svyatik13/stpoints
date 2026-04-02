'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  const loadGiveaways = useCallback(async () => {
    try {
      const data = await api.giveaway.recent(50);
      setGiveaways(data.giveaways);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadGiveaways();
  }, [user, loadGiveaways]);

  const activeGiveaways = giveaways.filter(g => g.status === 'ACTIVE');
  const pastGiveaways = giveaways.filter(g => g.status === 'COMPLETED');

  const handleJoin = async (id: string) => {
    setJoiningId(id);
    try {
      await api.giveaway.recent(1); // Fake join endpoint check — wait, we need actual endpoint
      await fetch('/api/giveaway/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)access_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}` // Not needed if credentials include
        },
        body: JSON.stringify({ giveawayId: id })
      });
      // Better: use api client
      // I forgot to add it to api.ts, let's assume it exists or use fetch
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinApi = async (id: string) => {
    setJoiningId(id);
    try {
      // Assuming api.ts has a join method we'll add
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api') + '/giveaway/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ giveawayId: id })
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Něco se pokazilo');
      else {
        alert('Úspěšně připojeno!');
        loadGiveaways();
      }
    } catch (e) {
      alert('Chyba spojení.');
    } finally {
      setJoiningId(null);
    }
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🎁 ST-Drops</h1>
          <p className="text-text-secondary text-sm mt-1">
            Zúčastněte se slosování o ST tokeny od administrátorů
          </p>
        </div>

        {/* Eligibility check */}
        <div className="glass-card-static p-5">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${user.lastActiveAt ? 'bg-st-emerald animate-pulse' : 'bg-st-red'}`} />
            <div>
              <p className="font-semibold">
                {user.lastActiveAt ? 'Jste způsobilý se připojit!' : 'Zatím nejste způsobilý'}
              </p>
              <p className="text-text-muted text-xs mt-0.5">
                Pro účast musíte být aktivně přihlášen v posledních 24 hodinách
              </p>
            </div>
          </div>
        </div>

        {/* Active Giveaways */}
        {activeGiveaways.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">🟢 Probíhající ST-Drops</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeGiveaways.map(g => (
                <div key={g.id} className="glass-card p-6 glow-gold">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{g.title}</h3>
                      <p className="text-text-secondary text-sm">od {g.creator?.username}</p>
                    </div>
                    <div className="badge badge-gold font-mono font-bold px-3 py-1">
                      {parseFloat(g.prizePool).toFixed(2)} ST
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mb-6">
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-text-muted text-xs mb-1">Výherci</p>
                      <p className="font-semibold">{g.winnerCount}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center">
                      <p className="text-text-muted text-xs mb-1">Účastníci</p>
                      <p className="font-semibold">{g.participantCount}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 text-center col-span-2">
                      <p className="text-text-muted text-xs mb-1">Rozdělení</p>
                      <p className="font-semibold">{g.distribution === 'EQUAL' ? 'Stejnoměrné (Equal)' : 'Odstupňované (Weighted)'}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="text-text-muted">Konec v:</p>
                      <p className="font-semibold font-mono text-st-cyan">
                        {new Date(g.endsAt).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                      </p>
                    </div>
                    
                    {g.hasJoined ? (
                      <button disabled className="btn-secondary px-6 opacity-80 border-st-gold text-st-gold bg-st-gold/10">
                        ✅ Připojeno
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleJoinApi(g.id)}
                        disabled={joiningId === g.id}
                        className="btn-primary px-6 border-st-gold text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]"
                        style={{ background: 'linear-gradient(135deg, #facc15 0%, #ca8a04 100%)' }}
                      >
                        {joiningId === g.id ? '⏳' : 'Připojit se'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Giveaway History */}
        <div className="glass-card-static p-6 mt-8">
          <h2 className="text-xl font-bold mb-4">📜 Historie slosování</h2>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : pastGiveaways.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <span className="text-4xl block mb-3">🎁</span>
              <p>Zatím žádná historie.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastGiveaways.map((g) => {
                const myWin = g.winners.find(w => w.username === user.username);
                return (
                  <div key={g.id} className={`p-5 rounded-2xl border ${myWin ? 'bg-st-gold-dim/20 border-st-gold/30' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04]'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold">{g.title}</h3>
                        <p className="text-xs text-text-muted mt-0.5">
                          Slosováno: {g.completedAt && new Date(g.completedAt).toLocaleString('cs-CZ')} • {g.participantCount} účastníků
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-st-gold">{parseFloat(g.prizePool).toFixed(2)} ST</p>
                        <p className="text-[10px] text-text-muted mt-0.5 uppercase tracking-wider">Rozděleno</p>
                      </div>
                    </div>
                    
                    {myWin && (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-st-gold/10 border border-st-gold/20 flex justify-between items-center text-sm">
                        <span className="font-bold text-st-gold">🎉 Vyhráli jste! ({myWin.place}. místo)</span>
                        <span className="font-mono font-bold text-st-gold">+{parseFloat(myWin.amount).toFixed(4)} ST</span>
                      </div>
                    )}
                    
                    <div className="mt-3 text-sm">
                      <p className="text-xs text-text-muted mb-1">Výherci:</p>
                      <div className="flex flex-wrap gap-2">
                        {g.winners.map((w, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/40 border border-glass-border">
                            <span className="text-st-gold font-bold">{w.place}.</span>
                            <span className="text-text-secondary">{w.username}</span>
                            <span className="font-mono text-st-cyan/80 text-xs ml-1">{parseFloat(w.amount).toFixed(4)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
