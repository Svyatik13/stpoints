'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Transaction } from '@/types';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import TitleBadge from '@/components/common/TitleBadge';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [walletAddress, setWalletAddress] = useState<string>('');

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferFee, setTransferFee] = useState<string | null>(null);
  const [transferTotal, setTransferTotal] = useState<string | null>(null);
  const { toast } = useToast();

  // ── Titles State ──
  const [unlockedTitles, setUnlockedTitles] = useState<string[]>([]);
  const [allTitles, setAllTitles] = useState<any>({});
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [titlesLoading, setTitlesLoading] = useState(true);

  useEffect(() => {
    if (showTransfer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showTransfer]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      api.wallet.balance().then(data => {
        setWalletAddress(data.address);
      }).catch(() => {});
      
      // Fetch titles
      setTitlesLoading(true);
      api.rewards.titles().then(data => {
        setUnlockedTitles(data.unlockedTitles);
        setAllTitles(data.allTitles);
        setActiveTitle(data.activeTitle);
      }).catch(() => {}).finally(() => setTitlesLoading(false));
    }
  }, [user, page]);

  async function handleSelectTitle(title: string | null) {
    try {
      await api.rewards.setTitle(title);
      setActiveTitle(title);
      toast('success', title ? `Titul ${allTitles[title].label} aktivován!` : 'Titul odebrán.');
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const data = await api.wallet.transactions(page, 10);
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
    } catch {
    } finally {
      setTxLoading(false);
    }
  }

  useEffect(() => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferFee(null);
      setTransferTotal(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const data = await api.wallet.transferFee(transferAmount);
        setTransferFee(data.fee);
        setTransferTotal(data.total);
      } catch {
        setTransferFee(null);
        setTransferTotal(null);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [transferAmount]);

  async function handleTransfer() {
    if (!transferRecipient || !transferAmount) return;
    setTransferLoading(true);
    try {
      const result = await api.wallet.transfer({
        recipient: transferRecipient,
        amount: transferAmount,
        note: transferNote || undefined,
      });
      toast('success', `${result.amount} ST odesláno uživateli ${result.recipient}`);
      setShowTransfer(false);
      setTransferRecipient('');
      setTransferAmount('');
      setTransferNote('');
      fetchTransactions();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setTransferLoading(false);
    }
  }

  // ── Daily Streak State ──
  const [streakData, setStreakData] = useState<{ streak: number; canClaim: boolean; currentDay: number; nextReward: number; rewards: number[] } | null>(null);
  const [claimingStreak, setClaimingStreak] = useState(false);

  // ── USDT Price ──
  const [usdtRate, setUsdtRate] = useState<number | null>(null);

  useEffect(() => {
    api.rewards.streak().then(setStreakData).catch(() => {});
    api.wallet.price().then((data: any) => {
      setUsdtRate(data?.priceUsd ?? 0.01);
    }).catch(() => setUsdtRate(0.01));
  }, []);

  async function handleClaimStreak() {
    setClaimingStreak(true);
    try {
      const res = await api.rewards.claimDaily();
      setStreakData(prev => prev ? { ...prev, canClaim: false, streak: res.streak, currentDay: res.day } : prev);
      toast('success', `🔥 Streak den ${res.day}: +${res.reward} ST!`);
    } catch (err: any) {
      toast('error', err.message || 'Chyba při vyzvedávání odměny.');
    } finally {
      setClaimingStreak(false);
    }
  }

  if (!user) return null;

  const balance = parseFloat(user.balance);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">

        {/* Balance & Title Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Balance Card */}
          <div className="glass-card-static p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 -m-20 w-48 h-48 bg-st-cyan/8 rounded-full blur-3xl pointer-events-none"></div>
            <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase mb-3">Zůstatek</p>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-black font-mono tracking-tighter text-st-cyan drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {balance.toFixed(2)}
              </span>
              <span className="text-text-muted text-lg font-semibold tracking-wider">ST</span>
            </div>
            {usdtRate !== null && (
              <p className="text-text-muted text-xs font-mono mb-4">
                ≈ <span className="text-st-emerald font-semibold">${(balance * usdtRate).toFixed(3)}</span> USDT
              </p>
            )}
            <button onClick={() => setShowTransfer(true)} className="btn-primary w-full py-2 rounded-xl text-xs font-bold mt-2">
              Provést Převod
            </button>
          </div>

          {/* Active Title Card */}
          <div className="glass-card-static p-8 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 -m-20 w-48 h-48 bg-st-gold/8 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase mb-3">Aktivní Titul</p>
              <div className="h-10 flex items-center">
                {activeTitle ? (
                  <TitleBadge titleKey={activeTitle} label={allTitles[activeTitle]?.label} className="text-sm px-3 py-1" />
                ) : (
                  <span className="text-text-muted italic text-xs">Žádný aktivní titul</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-text-muted leading-tight mt-2 italic">
              Tento titul se zobrazuje všem v globálním chatu a na leaderboardu.
            </p>
          </div>
        </div>

        {/* Daily Streak */}
        {streakData && (
          <div className="glass-card p-6 border-st-gold/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 -m-16 w-40 h-40 bg-st-gold/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold flex items-center gap-2">🔥 Denní Streak</h3>
                <p className="text-text-muted text-[10px]">Přihlaste se každý den pro odměny!</p>
              </div>
              <button
                onClick={handleClaimStreak}
                disabled={!streakData.canClaim || claimingStreak}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                  streakData.canClaim
                    ? 'bg-gradient-to-r from-st-gold/30 to-st-gold/15 border border-st-gold/40 text-st-gold hover:from-st-gold/40 hover:to-st-gold/25'
                    : 'bg-white/5 border border-white/5 text-text-muted cursor-not-allowed'
                }`}
              >
                {claimingStreak ? '⏳...' : streakData.canClaim ? `🎁 +${streakData.nextReward} ST` : '✅ Vyzvednuto'}
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {streakData.rewards.map((reward, i) => {
                const dayNum = i + 1;
                const isCompleted = dayNum <= streakData.streak;
                const isCurrent = dayNum === streakData.streak + 1;
                return (
                  <div key={i} className={`text-center py-2 px-1 rounded-lg border text-xs transition-all ${
                    isCompleted ? 'bg-st-gold/15 border-st-gold/30 text-st-gold' : isCurrent ? 'bg-st-cyan/10 border-st-cyan/30 text-st-cyan' : 'bg-white/3 border-white/5 text-text-muted'
                  }`}>
                    <p className="font-bold">{isCompleted ? '✓' : `D${dayNum}`}</p>
                    <p className="font-mono text-[10px] mt-0.5">{reward}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Titles Selection */}
        <div className="glass-card-static p-6">
          <h3 className="text-sm font-bold tracking-widest uppercase text-text-muted mb-4 flex items-center gap-2">
            🏅 Moje Tituly
            <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded-full">{unlockedTitles.length} / {Object.keys(allTitles).length}</span>
          </h3>
          {titlesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-white/[0.02] animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.keys(allTitles).map((key) => {
                const isUnlocked = unlockedTitles.includes(key);
                const isActive = activeTitle === key;
                const title = allTitles[key];
                return (
                  <button
                    key={key}
                    disabled={!isUnlocked}
                    onClick={() => handleSelectTitle(isActive ? null : key)}
                    className={`relative p-3 rounded-xl border text-left transition-all group ${
                      isUnlocked 
                        ? isActive ? 'bg-white/10 border-st-cyan/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-white/5 border-white/5 hover:border-white/20'
                        : 'bg-black/20 border-white/5 opacity-40 grayscale cursor-not-allowed'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-lg">{title.icon}</span>
                        {isActive && <span className="text-[8px] bg-st-cyan text-white px-1.5 py-0.5 rounded uppercase font-black">Aktivní</span>}
                      </div>
                      <p className={`text-xs font-bold ${isUnlocked ? 'text-white' : 'text-text-muted'}`}>{title.label}</p>
                      <p className="text-[9px] text-text-muted leading-tight line-clamp-1">{title.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">📝 Poslední Transakce</h2>
          {txLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-white/[0.02] animate-pulse" />)}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <p className="text-3xl mb-2 opacity-50">📭</p>
              <p className="text-sm">Žádné transakce</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${tx.isIncoming ? 'bg-st-emerald' : 'bg-st-red'}`}></div>
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">{tx.description || 'Transakce'}</p>
                        <p className="text-[11px] text-text-muted">{new Date(tx.createdAt).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm shrink-0 ml-3 ${tx.isIncoming ? 'text-st-emerald' : 'text-st-red'}`}>
                      {tx.isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} ST
                    </span>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-glass-border/20">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="text-xs text-text-muted hover:text-white disabled:opacity-30 transition-colors">← Předchozí</button>
                  <span className="text-text-muted text-xs font-mono">{page}/{totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs text-text-muted hover:text-white disabled:opacity-30 transition-colors">Další →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransfer && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={() => setShowTransfer(false)}>
          <div className="glass-card w-full max-w-md p-8 shadow-2xl border-white/[0.05]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight">Převod ST</h2>
              <button onClick={() => setShowTransfer(false)} className="text-text-muted hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1.5">Příjemce</label>
                <input type="text" value={transferRecipient} onChange={e => setTransferRecipient(e.target.value)} className="glass-input" placeholder="@username nebo 0x..." />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1.5">Částka (ST)</label>
                <input type="number" step="0.000001" min="0.000001" max={user.balance} value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="glass-input font-mono text-lg" placeholder="0.00" />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1.5">Zpráva</label>
                <input type="text" value={transferNote} onChange={e => setTransferNote(e.target.value)} className="glass-input" placeholder="Důvod..." maxLength={100} />
              </div>
              {transferFee && transferTotal && (
                <div className="rounded-xl bg-st-cyan/5 border border-st-cyan/20 p-3">
                  <div className="flex justify-between text-xs text-text-secondary mb-1"><span>Poplatek</span><span className="font-mono">{transferFee} ST</span></div>
                  <div className="flex justify-between text-sm font-bold text-white border-t border-st-cyan/20 pt-2 mt-2"><span>Celkem</span><span className="font-mono text-st-cyan">{transferTotal} ST</span></div>
                </div>
              )}
              <button onClick={handleTransfer} disabled={transferLoading || !transferRecipient || !transferAmount} className="w-full btn-primary py-3 rounded-xl font-bold disabled:opacity-50 mt-2">{transferLoading ? 'Zpracování...' : 'Potvrdit Odeslání'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
}
