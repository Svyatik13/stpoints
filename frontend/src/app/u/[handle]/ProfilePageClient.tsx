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
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('1');
  const [tipMessage, setTipMessage] = useState('');
  const [tipping, setTipping] = useState(false);
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

  const handleTip = async () => {
    try {
      setTipping(true);
      const res = await api.users.tip(handle, tipAmount, tipMessage);
      toast('success', res.message);
      setShowTipModal(false);
      setTipMessage('');
      // Refresh profile to see balance update (if it's the current user)
      const r = await api.users.profile(handle);
      setProfile(r.profile);
    } catch (e: any) {
      toast('error', e.message || 'Chyba při posílání spropitného.');
    } finally {
      setTipping(false);
    }
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

                {/* Avatar */}
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-bold" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.3))', border: '2px solid rgba(168,85,247,0.4)' }}>
                  {profile.username[0].toUpperCase()}
                </div>

                <h1 className="text-2xl font-bold text-text-primary">{profile.username}</h1>


                <p className="text-xs text-text-muted mt-1">
                  Člen od {new Date(profile.joinedAt).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
                </p>

                {/* Balance */}
                <div className="mt-5 inline-block px-6 py-3 rounded-2xl" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)' }}>
                  <p className="text-3xl font-bold font-mono text-st-gold">{profile.balance}</p>
                  <p className="text-xs text-text-muted mt-0.5">ST Points</p>
                </div>

                <div className="mt-6 flex justify-center gap-3">
                  <button onClick={() => setShowTipModal(true)} className="btn-primary py-2 px-6 flex items-center gap-2 text-sm">
                    <span>🎁</span> Poslat tip
                  </button>
                  <button onClick={copyShare} className="btn-secondary py-2 px-6 flex items-center gap-2 text-sm">
                    <span>🔗</span> Sdílet
                  </button>
                </div>
              </div>
            </div>

            {/* Achievements */}
            {profile.achievements && profile.achievements.length > 0 && (
              <div className="glass-card-static p-6">
                <h2 className="font-bold text-text-primary mb-4 flex items-center gap-2">
                  <span className="text-st-gold">🏆</span> Síň slávy
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {profile.achievements.map((ua: any) => (
                    <div key={ua.id} className="bg-white/5 border border-white/5 p-3 rounded-xl flex items-center gap-3 group relative overflow-hidden">
                      {/* Highlight */}
                      <div className="absolute inset-0 bg-gradient-to-br from-st-gold/5 transparent pointer-events-none" />
                      
                      <span className="text-2xl drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">{ua.achievement.icon}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-text-primary leading-tight truncate">{ua.achievement.label}</p>
                        <p className="text-[9px] text-text-muted leading-tight mt-0.5">{ua.achievement.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

      {/* Tip Modal */}
      {showTipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTipModal(false)} />
          <div className="glass-card-static w-full max-w-sm p-6 relative animate-fade-up">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🎁</span> Poslat tip @{handle}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted mb-1 block">Částka (ST)</label>
                <div className="flex gap-2">
                  {['1', '5', '10', '50'].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setTipAmount(val)} 
                      className={`flex-1 py-2 text-xs rounded-lg transition-all ${tipAmount === val ? 'bg-st-gold text-black font-bold' : 'bg-white/5 text-text-secondary border border-white/5'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <input 
                  type="number" 
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  className="glass-input mt-2 text-center font-mono font-bold text-st-gold"
                  placeholder="Vlastní částka..."
                />
              </div>

              <div>
                <label className="text-xs text-text-muted mb-1 block">Zpráva (nepovinné)</label>
                <textarea 
                  value={tipMessage}
                  onChange={(e) => setTipMessage(e.target.value)}
                  className="glass-input h-20 text-sm resize-none"
                  placeholder="Napište něco hezkého..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowTipModal(false)} className="btn-secondary flex-1 py-3">Zrušit</button>
                <button onClick={handleTip} disabled={tipping} className="btn-primary flex-1 py-3 text-sm">
                  {tipping ? 'Posílám...' : `Poslat ${tipAmount} ST`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
