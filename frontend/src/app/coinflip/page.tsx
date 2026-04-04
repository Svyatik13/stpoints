'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

interface CoinflipGame {
  id: string;
  amount: string;
  status: string;
  side: string;
  result: string | null;
  creatorId: string;
  joinerId: string | null;
  winnerId: string | null;
  createdAt: string;
  creator: { username: string };
  joiner?: { username: string } | null;
}

const WAGER_PRESETS = [1, 5, 10, 25, 50, 100];

export default function CoinflipPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [games, setGames] = useState<CoinflipGame[]>([]);
  const [history, setHistory] = useState<CoinflipGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [wagerAmount, setWagerAmount] = useState('10');
  const [chosenSide, setChosenSide] = useState<'heads' | 'tails'>('heads');
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'open' | 'history'>('open');

  // Animation state
  const [flipResult, setFlipResult] = useState<{
    game: CoinflipGame;
    result: string;
    winnerId: string;
    payout: string;
    fee: string;
  } | null>(null);
  const [flipAnimating, setFlipAnimating] = useState(false);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [gamesRes, historyRes] = await Promise.all([
        api.coinflip.games(),
        api.coinflip.history(),
      ]);
      setGames(gamesRes.games || []);
      setHistory(historyRes.games || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh open games every 5s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.coinflip.games();
        setGames(res.games || []);
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [user]);

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleCreate() {
    const amt = parseFloat(wagerAmount);
    if (!amt || amt < 0.5) { showMsg('error', 'Minimální sázka je 0.5 ST.'); return; }
    setCreating(true);
    try {
      await api.coinflip.create({ amount: amt, side: chosenSide });
      showMsg('success', `Hra vytvořena! Sázka: ${amt} ST`);
      setShowCreate(false);
      refreshUser();
      loadData();
    } catch (err: any) { showMsg('error', err.message || 'Chyba při vytváření hry.'); }
    finally { setCreating(false); }
  }

  async function handleJoin(gameId: string) {
    setJoining(gameId);
    try {
      const res = await api.coinflip.join(gameId);
      // Start coin flip animation
      setFlipAnimating(true);
      setFlipResult(res);

      setTimeout(() => {
        setFlipAnimating(false);
        refreshUser();
        loadData();
      }, 3000);
    } catch (err: any) {
      showMsg('error', err.message || 'Chyba při připojování.');
    } finally {
      setJoining(null);
    }
  }

  async function handleCancel(gameId: string) {
    try {
      await api.coinflip.cancel(gameId);
      showMsg('success', 'Hra zrušena, sázka vrácena.');
      refreshUser();
      loadData();
    } catch (err: any) { showMsg('error', err.message || 'Chyba.'); }
  }

  if (!user) return null;
  const balance = parseFloat(user.balance || '0');

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ textShadow: '0 0 20px rgba(234,179,8,0.3)' }}>
              🎰 Coinflip
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Vsaď ST proti jinému hráči. 50/50 šance. Vítěz bere vše!
            </p>
          </div>
          <div className="flex gap-3">
            <div className="glass-card-static px-4 py-2 text-center">
              <p className="text-text-muted text-xs">Zůstatek</p>
              <p className="text-st-cyan font-mono font-bold">{balance.toFixed(4)} ST</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary px-5 py-2 flex items-center gap-2"
            >
              <span>🪙</span> Vytvořit hru
            </button>
          </div>
        </div>

        {/* Toast */}
        {message && (
          <div className={`glass-card-static p-4 border ${message.type === 'success' ? 'border-st-emerald/30' : 'border-st-red/30'}`}>
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-st-emerald' : 'text-st-red'}`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab('open')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'open' ? 'bg-st-gold/20 text-st-gold' : 'text-text-muted hover:text-white'}`}
          >
            🎮 Otevřené hry ({games.length})
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'history' ? 'bg-st-purple/20 text-st-purple' : 'text-text-muted hover:text-white'}`}
          >
            📜 Historie
          </button>
        </div>

        {/* Open Games */}
        {tab === 'open' && (
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 rounded-2xl animate-shimmer" />
                ))}
              </div>
            ) : games.length === 0 ? (
              <div className="glass-card-static p-12 text-center">
                <p className="text-4xl mb-3 opacity-50">🪙</p>
                <p className="text-text-muted">Žádné otevřené hry. Buďte první!</p>
              </div>
            ) : (
              games.map(game => {
                const isOwner = game.creatorId === user.id;
                const wager = parseFloat(game.amount);
                return (
                  <div
                    key={game.id}
                    className="glass-card p-5 flex items-center justify-between gap-4 transition-all hover:bg-white/[0.03]"
                    style={{ borderColor: 'rgba(234,179,8,0.15)' }}
                  >
                    {/* Left: Creator info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-st-gold/10 border border-st-gold/20 flex items-center justify-center text-xl font-bold text-st-gold">
                        {game.creator.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-text-primary truncate">
                          {game.creator.username}
                          {isOwner && <span className="text-xs text-text-muted ml-2">(vy)</span>}
                        </p>
                        <p className="text-text-muted text-xs">
                          Strana: {game.side === 'heads' ? '🟡 Hlava' : '⚫ Orel'}
                        </p>
                      </div>
                    </div>

                    {/* Center: Wager */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-2xl font-black font-mono text-st-gold" style={{ textShadow: '0 0 15px rgba(234,179,8,0.4)' }}>
                        {wager} ST
                      </p>
                      <p className="text-text-muted text-[10px] uppercase tracking-wider">Sázka</p>
                    </div>

                    {/* Right: Action */}
                    <div className="flex-shrink-0">
                      {isOwner ? (
                        <button
                          onClick={() => handleCancel(game.id)}
                          className="px-4 py-2 rounded-xl text-sm font-medium bg-st-red/10 border border-st-red/20 text-st-red hover:bg-st-red/20 transition-all"
                        >
                          ✕ Zrušit
                        </button>
                      ) : (
                        <button
                          onClick={() => handleJoin(game.id)}
                          disabled={!!joining || balance < wager}
                          className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 bg-gradient-to-r from-st-gold/30 to-st-gold/15 border border-st-gold/40 text-st-gold hover:from-st-gold/40 hover:to-st-gold/25"
                        >
                          {joining === game.id ? '⏳ Připojuji...' : balance < wager ? 'Nedostatek ST' : `⚡ Hrát za ${wager} ST`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* History */}
        {tab === 'history' && (
          <div className="glass-card-static overflow-hidden">
            {history.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <span className="text-4xl block mb-3">📜</span>
                <p>Zatím žádná historie.</p>
              </div>
            ) : (
              <div className="divide-y divide-glass-border/50">
                {history.map(game => {
                  const isWinner = game.winnerId === user.id;
                  const wager = parseFloat(game.amount);
                  const opponent = game.creatorId === user.id ? game.joiner?.username : game.creator.username;
                  return (
                    <div key={game.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-xl ${isWinner ? '' : 'grayscale opacity-50'}`}>{isWinner ? '🏆' : '💀'}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            vs <span className="text-text-secondary">{opponent || '???'}</span>
                          </p>
                          <p className="text-text-muted text-[10px]">
                            {new Date(game.createdAt).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            {' • '}{game.result === 'heads' ? '🟡 Hlava' : '⚫ Orel'}
                          </p>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-sm ${isWinner ? 'text-st-emerald' : 'text-st-red'}`}>
                        {isWinner ? '+' : '-'}{wager} ST
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* How it works */}
        <div className="glass-card-static p-6">
          <h3 className="font-bold mb-4">🪙 Jak to funguje?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-text-secondary">
            <div>
              <p className="font-semibold text-text-primary mb-1">1. Vytvořte hru</p>
              <p>Zvolte sázku a stranu mince. Sázka se zamkne okamžitě.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">2. Soupeř se připojí</p>
              <p>Druhý hráč vsadí stejnou částku a mince se hodí.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">3. Výsledek</p>
              <p>Vítěz bere celý pot minus 2% poplatek. 50/50 šance!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Game Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="glass-card w-full max-w-md p-8 relative animate-fade-up z-10" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">🪙 Nová hra</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-white text-lg">✕</button>
            </div>

            <div className="space-y-5">
              {/* Side selection */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">Vaše strana</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setChosenSide('heads')}
                    className={`p-4 rounded-xl text-center transition-all border ${chosenSide === 'heads' ? 'bg-st-gold/15 border-st-gold/40 text-st-gold' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'}`}
                  >
                    <span className="text-3xl block mb-1">🟡</span>
                    <span className="text-sm font-bold">Hlava</span>
                  </button>
                  <button
                    onClick={() => setChosenSide('tails')}
                    className={`p-4 rounded-xl text-center transition-all border ${chosenSide === 'tails' ? 'bg-st-purple/15 border-st-purple/40 text-st-purple' : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'}`}
                  >
                    <span className="text-3xl block mb-1">⚫</span>
                    <span className="text-sm font-bold">Orel</span>
                  </button>
                </div>
              </div>

              {/* Wager amount */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">Sázka (ST)</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {WAGER_PRESETS.map(val => (
                    <button
                      key={val}
                      onClick={() => setWagerAmount(val.toString())}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${wagerAmount === val.toString() ? 'bg-st-gold text-black' : 'bg-white/5 text-text-secondary border border-white/5 hover:border-white/15'}`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={wagerAmount}
                  onChange={e => setWagerAmount(e.target.value)}
                  className="glass-input text-center font-mono font-bold text-st-gold"
                  placeholder="Vlastní částka..."
                  min="0.5"
                  step="0.1"
                />
              </div>

              {/* Fee breakdown */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-text-muted">Vaše sázka:</span>
                  <span className="text-text-secondary font-mono">{parseFloat(wagerAmount || '0').toFixed(2)} ST</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-text-muted">Pot (pokud vyhraje):</span>
                  <span className="text-st-gold font-mono">{(parseFloat(wagerAmount || '0') * 2 * 0.98).toFixed(4)} ST</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-text-muted">Poplatek (2%):</span>
                  <span className="text-text-muted font-mono">{(parseFloat(wagerAmount || '0') * 2 * 0.02).toFixed(4)} ST</span>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={creating || !wagerAmount || parseFloat(wagerAmount) < 0.5 || balance < parseFloat(wagerAmount || '0')}
                className="w-full btn-primary py-3 rounded-xl font-bold text-sm disabled:opacity-50"
              >
                {creating ? '⏳ Vytvářím...' : balance < parseFloat(wagerAmount || '0') ? 'Nedostatek ST' : `🎰 Vsadit ${wagerAmount} ST`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coin Flip Animation Overlay */}
      {flipResult && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="text-center animate-fade-up">
            {/* Coin */}
            <div
              className="w-32 h-32 mx-auto mb-8 rounded-full flex items-center justify-center text-6xl"
              style={{
                background: flipAnimating
                  ? 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(168,85,247,0.3))'
                  : flipResult.result === 'heads'
                    ? 'linear-gradient(135deg, rgba(234,179,8,0.4), rgba(234,179,8,0.15))'
                    : 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(168,85,247,0.15))',
                border: flipAnimating ? '2px solid rgba(255,255,255,0.3)' : flipResult.result === 'heads' ? '2px solid rgba(234,179,8,0.5)' : '2px solid rgba(168,85,247,0.5)',
                boxShadow: flipAnimating
                  ? '0 0 40px rgba(234,179,8,0.4)'
                  : flipResult.winnerId === user?.id
                    ? '0 0 60px rgba(16,185,129,0.5)'
                    : '0 0 60px rgba(239,68,68,0.5)',
                animation: flipAnimating ? 'coinSpin 0.4s linear infinite' : 'none',
                transition: 'all 0.5s ease',
              }}
            >
              {flipAnimating ? '🪙' : flipResult.result === 'heads' ? '🟡' : '⚫'}
            </div>

            {/* Result text */}
            {!flipAnimating && (
              <div className="animate-fade-up">
                <p className="text-text-muted text-xs uppercase tracking-widest mb-2">Výsledek</p>
                <p className="text-lg text-text-secondary mb-4">
                  {flipResult.result === 'heads' ? '🟡 Hlava' : '⚫ Orel'}
                </p>

                {flipResult.winnerId === user?.id ? (
                  <div>
                    <p className="text-3xl font-black text-st-emerald mb-2" style={{ textShadow: '0 0 30px rgba(16,185,129,0.6)' }}>
                      🏆 VÝHRA!
                    </p>
                    <p className="text-2xl font-bold font-mono text-st-gold" style={{ textShadow: '0 0 20px rgba(234,179,8,0.5)' }}>
                      +{parseFloat(flipResult.payout).toFixed(4)} ST
                    </p>
                    <p className="text-text-muted text-xs mt-1">Poplatek: {parseFloat(flipResult.fee).toFixed(4)} ST</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl font-black text-st-red mb-2" style={{ textShadow: '0 0 30px rgba(239,68,68,0.6)' }}>
                      💀 PROHRA
                    </p>
                    <p className="text-xl font-bold font-mono text-text-muted">
                      -{parseFloat(flipResult.game.amount).toFixed(4)} ST
                    </p>
                  </div>
                )}

                <button
                  onClick={() => setFlipResult(null)}
                  className="mt-8 px-8 py-3 rounded-xl font-bold text-sm bg-white/10 border border-white/15 text-text-primary hover:bg-white/15 transition-all"
                >
                  Zavřít
                </button>
              </div>
            )}

            {flipAnimating && (
              <div>
                <p className="text-xl font-bold text-text-primary animate-pulse">Hážeme mincí...</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes coinSpin {
          0%   { transform: rotateY(0deg) scale(1); }
          25%  { transform: rotateY(90deg) scale(0.85); }
          50%  { transform: rotateY(180deg) scale(1); }
          75%  { transform: rotateY(270deg) scale(0.85); }
          100% { transform: rotateY(360deg) scale(1); }
        }
      `}</style>
    </AppShell>
  );
}
