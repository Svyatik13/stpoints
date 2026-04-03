'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Transaction } from '@/types';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '@/lib/constants';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/lib/i18n';

type Tab = 'overview' | 'vault' | 'history';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [vaultStakes, setVaultStakes] = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeDuration, setStakeDuration] = useState<number>(7);
  const [stakeLoading, setStakeLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [networkTotal, setNetworkTotal] = useState<string>('0');
  const [price, setPrice] = useState<{ price: string; change24h: string; marketCap: string; volume24h: number; holders: number } | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferFee, setTransferFee] = useState<string | null>(null);
  const [transferTotal, setTransferTotal] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  // Lock body scroll when modal is open
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

  async function fetchNetworkStats() {
    try {
      const data = await api.mining.stats();
      setNetworkTotal(data.networkTotal || '0');
    } catch {}
  }

  useEffect(() => {
    if (user && activeTab === 'history') {
      fetchTransactions();
    }
    if (user && activeTab === 'vault') {
      fetchVaults();
    }
  }, [user, page, activeTab]);

  useEffect(() => {
    if (user) {
      fetchNetworkStats();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.wallet.price().then(setPrice).catch(() => {});
    api.wallet.balance().then(data => {
      setWalletAddress(data.address);
    }).catch(() => {});
  }, [user]);

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const data = await api.wallet.transactions(page, 15);
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
    } catch {
      // silent fail
    } finally {
      setTxLoading(false);
    }
  }

  async function fetchVaults() {
    setVaultLoading(true);
    try {
      const data = await api.vault.get();
      setVaultStakes(data.stakes);
    } catch {
      toast('error', 'Nepodařilo se načíst trezory.');
    } finally {
      setVaultLoading(false);
    }
  }

  async function handleStake() {
    if (!stakeAmount || Number(stakeAmount) <= 0) return;
    setStakeLoading(true);
    try {
      await api.vault.stake({ amount: stakeAmount, durationDays: stakeDuration });
      toast('success', `Úspěšně uzamčeno ${stakeAmount} ST na ${stakeDuration} dnů.`);
      setStakeAmount('');
      fetchVaults();
      // Refresh balance
      window.location.reload();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setStakeLoading(false);
    }
  }

  // Fetch fee when amount changes
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
      toast('success', `${result.amount} ST odesláno uživateli ${result.recipient} (poplatek: ${result.fee} ST)`);
      setShowTransfer(false);
      setTransferRecipient('');
      setTransferAmount('');
      setTransferNote('');
      if (activeTab === 'history') fetchTransactions();
      // Refresh user balance
      window.location.reload();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setTransferLoading(false);
    }
  }

  if (!user) return null;

  const balance = parseFloat(user.balance);

  const APY_RATES = { 7: 5, 30: 12, 90: 25 };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-glass-border/30">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              ZČU Private Wealth
            </h1>
            <p className="text-text-secondary text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-st-emerald animate-pulse"></span>
              {walletAddress ? `0x...${walletAddress.slice(-6)}` : 'Connecting Node...'}
            </p>
          </div>

          {/* Premium Segmented Tabs */}
          <div className="flex p-1 bg-white/[0.02] border border-glass-border/30 rounded-xl w-full sm:w-auto overflow-hidden">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 sm:px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-glass-card border border-glass-border/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              Přehled
            </button>
            <button
              onClick={() => setActiveTab('vault')}
              className={`flex-1 sm:px-6 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'vault'
                  ? 'bg-glass-card border border-glass-border/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              🏦 Trezor
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 sm:px-6 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'history'
                  ? 'bg-glass-card border border-glass-border/40 shadow-[0_0_15px_rgba(6,182,212,0.15)] text-white'
                  : 'text-text-muted hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              Historie
            </button>
          </div>
        </div>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in text-center sm:text-left">
            {/* Minimalist Premium Balance Card */}
            <div className="glass-card-static p-8 sm:p-12 border-t flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8 h-auto relative overflow-hidden bg-gradient-to-br from-[#0f172a] to-[#020617]">
              {/* Decorative subtle pulse */}
              <div className="absolute top-0 right-0 -m-32 w-64 h-64 bg-st-cyan/10 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="z-10 w-full">
                <p className="text-text-muted text-sm font-medium tracking-widest uppercase mb-4 flex items-center justify-center sm:justify-start gap-2">
                  Aktuální Zůstatek
                </p>
                <div className="flex flex-col sm:flex-row items-center sm:items-baseline gap-4 mb-8">
                  <span className="text-5xl sm:text-7xl font-black font-mono tracking-tighter text-st-cyan drop-shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                    {balance.toFixed(2)}
                  </span>
                  <span className="text-text-secondary text-2xl font-semibold tracking-widest text-[#a1a1aa]">ST</span>
                </div>
                
                <div className="flex justify-center sm:justify-start">
                  <button
                    onClick={() => setShowTransfer(true)}
                    className="btn-primary px-8 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                    </svg>
                    Provést Převod
                  </button>
                </div>
              </div>

              {/* Stats on the right side of the card */}
              <div className="z-10 hidden sm:flex flex-col items-end justify-center min-w-[200px] border-l border-white/[0.05] pl-8 space-y-6">
                <div className="text-right">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">ST/USD Hodnota</p>
                  <p className="text-xl font-bold font-mono text-st-gold">${price?.price || '...'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Síťový Statut</p>
                  <div className="badge badge-emerald font-mono">STABILNÍ</div>
                </div>
              </div>
            </div>

            {/* Network Bar */}
            <div className="glass-card-static px-6 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 text-sm border-t border-white/[0.02]">
              <span className="text-text-muted">MCap <span className="font-mono text-st-gold ml-1">${price?.marketCap || '–'}</span></span>
              <span className="text-text-muted">Supply <span className="font-mono text-st-cyan ml-1">{parseFloat(networkTotal).toFixed(0)} ST</span></span>
              <span className="text-text-muted">24h Vol <span className="font-mono text-text-primary ml-1">{price?.volume24h ?? '–'}</span></span>
              <span className="text-text-muted">Holders <span className="font-mono text-st-purple ml-1">{price?.holders ?? '–'}</span></span>
            </div>
          </div>
        )}

        {/* --- VAULT TAB --- */}
        {activeTab === 'vault' && (
          <div className="space-y-8 animate-fade-in">
            {/* Staking Form */}
            <div className="glass-card p-8 border border-white/[0.05] bg-gradient-to-br from-[#0c1222] to-[#020617] relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-st-gold/5 rounded-full blur-3xl pointer-events-none"></div>
               
               <div className="flex flex-col md:flex-row gap-8 items-center">
                 <div className="flex-1 w-full">
                    <h2 className="text-2xl font-bold text-st-gold mb-2">Nový Vklad do Trezoru</h2>
                    <p className="text-sm text-text-secondary mb-6">Zamkněte své ST a získejte garantovaný výnos.</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-2">Částka (ST)</label>
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={e => setStakeAmount(e.target.value)}
                          className="w-full bg-white/[0.02] border border-white/[0.1] rounded-xl px-4 py-3 text-white font-mono text-xl outline-none focus:border-st-gold/50 transition-all"
                          placeholder="0.00"
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-text-muted block mb-2">Doba Uzamčení</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[7, 30, 90].map(d => (
                            <button
                              key={d}
                              onClick={() => setStakeDuration(d)}
                              className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                                stakeDuration === d 
                                  ? 'bg-st-gold/10 border-st-gold text-st-gold' 
                                  : 'bg-white/[0.02] border-white/[0.1] text-text-muted hover:border-white/20'
                              }`}
                            >
                              {d} dnů <span className="block text-[10px] opacity-70">({APY_RATES[d as keyof typeof APY_RATES]}% APY)</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <button
                        onClick={handleStake}
                        disabled={stakeLoading || !stakeAmount}
                        className="w-full py-4 bg-st-gold text-black font-black rounded-xl hover:bg-[#eab308] transition-all disabled:opacity-50 mt-4 shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                      >
                        {stakeLoading ? 'Zpracování...' : 'UZAMKNOUT ST'}
                      </button>
                    </div>
                 </div>
                 
                 {/* Reward Preview */}
                 <div className="w-full md:w-64 bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-text-muted uppercase tracking-widest mb-2">Očekávaný Výnos</p>
                    <p className="text-3xl font-black font-mono text-st-gold mb-1">
                      {stakeAmount ? (Number(stakeAmount) * (APY_RATES[stakeDuration as keyof typeof APY_RATES] / 100) * (stakeDuration / 365)).toFixed(4) : '0.0000'}
                    </p>
                    <p className="text-xs text-text-muted font-medium">ST po {stakeDuration} dnech</p>
                    
                    <div className="w-full h-px bg-white/[0.05] my-6"></div>
                    
                    <div className="space-y-4 w-full">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Procentuální úrok</span>
                        <span className="text-st-gold font-bold">{APY_RATES[stakeDuration as keyof typeof APY_RATES]}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Datum uvolnění</span>
                        <span className="text-white">
                          {new Date(Date.now() + stakeDuration * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* Active Stakes */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-st-gold animate-pulse"></span>
                Vaše Aktivní Trezory
              </h3>
              
              {vaultLoading ? (
                <div className="h-32 rounded-2xl bg-white/[0.02] animate-shimmer"></div>
              ) : vaultStakes.length === 0 ? (
                <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl py-12 text-center">
                   <p className="text-text-muted">Nemáte žádné aktivní vklady v trezoru.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vaultStakes.map(s => (
                    <div key={s.id} className="glass-card p-6 border-l-4 border-l-st-gold">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-1">Vklad</p>
                          <p className="text-xl font-bold font-mono text-white">{parseFloat(s.amount).toFixed(2)} ST</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-text-muted uppercase font-bold tracking-widest mb-1">Status</p>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${s.status === 'ACTIVE' ? 'bg-st-gold/10 text-st-gold' : 'bg-st-emerald/10 text-st-emerald'}`}>
                            {s.status === 'ACTIVE' ? 'UZAMČENO' : 'ODEMČENO'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                         <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Úrok ({s.apy}%)</span>
                            <span className="text-st-gold font-mono">+{parseFloat(s.expectedYield).toFixed(4)} ST</span>
                         </div>
                         <div className="flex justify-between text-sm">
                            <span className="text-text-muted">Uvolní se za</span>
                            <span className="text-white font-medium">
                              {Math.max(0, Math.ceil((new Date(s.unlocksAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} dnů
                            </span>
                         </div>
                         
                         {/* Progress Bar */}
                         <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-4">
                            <div 
                              className="h-full bg-st-gold shadow-[0_0_10px_rgba(234,179,8,0.5)]" 
                              style={{ width: `${Math.min(100, Math.max(0, ((Date.now() - new Date(s.lockedAt).getTime()) / (new Date(s.unlocksAt).getTime() - new Date(s.lockedAt).getTime())) * 100))}%` }}
                            ></div>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === 'history' && (
          <div className="glass-card-static p-6 animate-fade-in border-t border-white/[0.02]">
            <h2 className="text-lg font-semibold tracking-wide mb-4 text-text-secondary uppercase text-sm">📝 Historie Transakcí</h2>

            {txLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <p className="text-4xl mb-3 opacity-50">📭</p>
                <p>Žádné transakce nebyly nalezeny.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {transactions.map((tx, i) => (
                    <div
                      key={tx.id}
                      className="flex border-b border-white/[0.02] last:border-0 pb-3 mb-3 last:mb-0 last:pb-0 items-center justify-between p-2 hover:bg-white/[0.01] transition-colors rounded"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${TRANSACTION_TYPE_COLORS[tx.type]?.includes('cyan') ? 'bg-st-cyan' : TRANSACTION_TYPE_COLORS[tx.type]?.includes('emerald') ? 'bg-st-emerald' : 'bg-st-purple'}`}></div>
                        <div>
                          <p className="text-sm font-medium text-text-primary flex items-center gap-2">
                            {tx.description || 'Transakce'}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${TRANSACTION_TYPE_COLORS[tx.type] || 'bg-white/10 text-white/70'}`}>
                              {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                            </span>
                          </p>
                          <div className="flex items-center gap-2 text-xs text-text-muted/70 mt-1">
                            <span>{new Date(tx.createdAt).toLocaleString('cs-CZ')}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold ${tx.isIncoming ? 'text-st-emerald' : 'text-st-red'}`}>
                          {tx.isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} ST
                        </p>
                        <p className="text-xs text-text-muted/50 font-mono tracking-tighter">
                          Zůstatek: {parseFloat(tx.balanceAfter).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8 pt-4 border-t border-glass-border/30">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="text-sm px-3 py-1 text-text-muted hover:text-white disabled:opacity-30 transition-colors"
                    >
                      ← Předchozí
                    </button>
                    <span className="text-text-muted text-xs font-mono">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="text-sm px-3 py-1 text-text-muted hover:text-white disabled:opacity-30 transition-colors"
                    >
                      Další →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Transfer Modal — portaled */}
        {showTransfer && createPortal(
          <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-md z-[999] flex items-center justify-center p-4 min-h-[100dvh]" onClick={() => setShowTransfer(false)}>
            <div className="glass-card w-full max-w-md p-8 shadow-2xl border-white/[0.05]" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Odeslat Protokol</h2>
                <button onClick={() => setShowTransfer(false)} className="text-text-muted hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">Příjemce</label>
                  <input
                    type="text"
                    value={transferRecipient}
                    onChange={e => setTransferRecipient(e.target.value)}
                    className="w-full bg-[#0c1222] border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:border-st-cyan/50 focus:ring-1 focus:ring-st-cyan/50 outline-none transition-all placeholder:text-text-muted/30"
                    placeholder="@username nebo 0x..."
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">Částka (ST)</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    max={user.balance}
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="w-full bg-[#0c1222] border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:border-st-cyan/50 focus:ring-1 focus:ring-st-cyan/50 outline-none font-mono text-xl transition-all placeholder:text-text-muted/30"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-2">Zpráva (Volitelné)</label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={e => setTransferNote(e.target.value)}
                    className="w-full bg-[#0c1222] border border-white/[0.1] rounded-xl px-4 py-3 text-white focus:border-st-cyan/50 focus:ring-1 focus:ring-st-cyan/50 outline-none transition-all placeholder:text-text-muted/30"
                    placeholder="Důvod převodu..."
                    maxLength={100}
                  />
                </div>

                {/* Fee preview */}
                {transferFee && transferTotal && (
                  <div className="rounded-xl bg-st-cyan/5 border border-st-cyan/20 p-4 mt-2">
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                      <span>Síťový poplatek (2%)</span>
                      <span className="font-mono">{transferFee} ST</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-white border-t border-st-cyan/20 pt-2 mt-2">
                      <span>Strženo celkem</span>
                      <span className="font-mono text-st-cyan">{transferTotal} ST</span>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button
                    onClick={handleTransfer}
                    disabled={transferLoading || !transferRecipient || !transferAmount}
                    className="w-full btn-primary py-3 rounded-xl font-bold tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {transferLoading ? 'Zpracování...' : 'Potvrdit Odeslání'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </AppShell>
  );
}
