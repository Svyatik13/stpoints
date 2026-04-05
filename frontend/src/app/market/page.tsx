'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { cs } from 'date-fns/locale/cs';

type MarketTab = 'invest' | 'browse';

function CandlestickChart({ history }: { history: any[] }) {
  const bars = useMemo(() => {
    if (!history || history.length === 0) return [];
    // History from API is desc (newest first).
    const chronPoints = [...history].reverse();
    const groupSize = 10;
    const computedBars = [];
    
    for (let i = 0; i < chronPoints.length; i += groupSize) {
      const chunk = chronPoints.slice(i, i + groupSize);
      if (chunk.length === 0) continue;
      const prices = chunk.map(c => parseFloat(c.price));
      computedBars.push({
        open: prices[0],
        high: Math.max(...prices),
        low: Math.min(...prices),
        close: prices[prices.length - 1],
        isUp: prices[prices.length - 1] >= prices[0]
      });
    }
    return computedBars;
  }, [history]);

  if (bars.length === 0) return <div className="h-full w-full flex items-center justify-center text-text-muted">Čekající na data...</div>;

  const min = Math.min(...bars.map(b => b.low));
  const max = Math.max(...bars.map(b => b.high));
  const range = max - min || 1;
  const pad = range * 0.1;
  const absMin = min - pad;
  const absMax = max + pad;
  const absRange = absMax - absMin;

  return (
    <svg className="w-full h-full animate-fade-in" viewBox="0 0 800 300" preserveAspectRatio="none">
      {/* Grid lines */}
      <line x1="0" y1="75" x2="800" y2="75" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
      <line x1="0" y1="150" x2="800" y2="150" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
      <line x1="0" y1="225" x2="800" y2="225" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
      
      {bars.map((bar, i) => {
        const barWidth = 800 / bars.length;
        const xOffset = i * barWidth;
        const candeWidth = barWidth * 0.6;
        const cx = xOffset + barWidth / 2;
        
        const getY = (val: number) => 300 - ((val - absMin) / absRange) * 300;
        
        const yHigh = getY(bar.high);
        const yLow = getY(bar.low);
        const yOpen = getY(bar.open);
        const yClose = getY(bar.close);
        
        const bodyTop = Math.min(yOpen, yClose);
        const bodyBottom = Math.max(yOpen, yClose);
        const bodyHeight = Math.max(bodyBottom - bodyTop, 1);
        const color = bar.isUp ? '#10b981' : '#ef4444'; // emerald vs red
        
        return (
          <g key={i} className="transition-all duration-300">
            {/* Wick */}
            <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth="1.5" className="opacity-80" />
            {/* Body */}
            <rect x={cx - candeWidth/2} y={bodyTop} width={candeWidth} height={bodyHeight} fill={color} stroke={color} strokeWidth="1" className="opacity-90 hover:opacity-100" />
          </g>
        );
      })}
    </svg>
  );
}

export default function MarketPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<MarketTab>('invest');
  const [filterType, setFilterType] = useState<'ALL' | 'USERNAME' | 'MYTHIC_PASS'>('ALL');
  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'AUCTION' | 'DIRECT' | 'SOLD'>('ACTIVE');
  const [sort, setSort] = useState<'RECENT' | 'PRICE_ASC' | 'PRICE_DESC' | 'ENDING_SOON'>('RECENT');
  
  const [listings, setListings] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [myHandles, setMyHandles] = useState<any[]>([]);
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modals / Selection
  const [showSell, setShowSell] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [sellNote, setSellNote] = useState('');
  const [sellItemId, setSellItemId] = useState('');
  const [sellItemType, setSellItemType] = useState<'MYTHIC_PASS' | 'USERNAME'>('MYTHIC_PASS');
  const [isAuctionSell, setIsAuctionSell] = useState(false);
  const [auctionDuration, setAuctionDuration] = useState(24);

  // Invest State
  const [activeStockId, setActiveStockId] = useState<string | null>(null);
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [investAmount, setInvestAmount] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [stockSelectorOpen, setStockSelectorOpen] = useState(false);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      if (activeTab === 'invest') {
        const res = await api.invest.stocks();
        setStocks(res.stocks);
        if (!activeStockId && res.stocks.length > 0) setActiveStockId(res.stocks[0].id);
      } else {
        const type = filterType === 'ALL' ? undefined : filterType;
        const [listRes, handleRes, passRes] = await Promise.all([
          api.market.list(type, filterMode, sort === 'RECENT' ? undefined : sort),
          api.usernames.me().catch(() => ({ usernames: [] })),
          api.cases.passes().catch(() => ({ passes: [] })),
        ]);
        setListings(listRes.listings);
        setMyHandles(handleRes.usernames);
        setMyPasses(passRes.passes ?? []);
      }
    } catch (e: any) {
      if (!e.message?.includes('401')) setError(e.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [activeTab, filterType, filterMode, sort, activeStockId]);

  useEffect(() => { 
    loadData(true); 

    // Polling interval: 3 seconds for a "Live" experience
    const interval = setInterval(() => {
      loadData(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [loadData]);

  // Toast helper
  const toast = (msg: string, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleCreateListing = async () => {
    if (!sellPrice) return toast('Zadejte cenu.', true);
    if (!sellItemId) return toast('Vyberte předmět k prodeji.', true);
    try {
      await api.market.create({ 
        type: sellItemType, 
        price: sellPrice, 
        passId: sellItemType === 'MYTHIC_PASS' ? sellItemId : undefined,
        usernameId: sellItemType === 'USERNAME' ? sellItemId : undefined,
        isAuction: isAuctionSell,
        durationHours: isAuctionSell ? auctionDuration : undefined,
        note: sellNote || undefined
      });
      toast('Inzerce vytvořena!');
      setShowSell(false);
      setSellPrice(''); setSellItemId(''); setSellNote('');
      loadData();
    } catch (e: any) { toast(e.message, true); }
  };

  const handleStockTrade = async () => {
    if (!activeStockId) return;
    setLoading(true);
    try {
      if (tradeMode === 'buy') {
        await api.invest.buy(activeStockId, investAmount);
        toast('Akcie nakoupeny!');
        setInvestAmount('');
      } else {
        await api.invest.sell(activeStockId, sellShares);
        toast('Akcie prodány!');
        setSellShares('');
      }
      loadData();
      refreshUser().catch(() => {});
    } catch (e: any) { toast(e.message, true); }
    finally { setLoading(false); }
  };

  function TimeLeft({ endsAt }: { endsAt: string | null }) {
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
      if (!endsAt) return;
      const update = () => {
        const diff = new Date(endsAt).getTime() - Date.now();
        if (diff <= 0) setTimeLeft('Skončilo');
        else setTimeLeft(formatDistanceToNowStrict(new Date(endsAt), { locale: cs }));
      };
      update();
      const t = setInterval(update, 1000);
      return () => clearInterval(t);
    }, [endsAt]);
    if (!endsAt) return <span className="text-text-muted">—</span>;
    return <span className={timeLeft === 'Skončilo' ? 'text-st-red' : 'text-st-gold font-mono'}>{timeLeft}</span>;
  }

  const activeStock = useMemo(() => stocks.find(s => s.id === activeStockId), [stocks, activeStockId]);
  const availPasses = myPasses.filter((p: any) => !p.isUsed);
  const sellableHandles = myHandles.filter((h: any) => new Date() >= new Date(h.canSellAt));

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header & Tabs */}
        <div className="glass-card-static p-6 pb-0 shadow-lg relative z-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black tracking-tight text-white space-x-2">
                  <span>Tržiště & Investice</span>
                </h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-st-emerald/10 border border-st-emerald/20 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 bg-st-emerald rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-[10px] font-black text-st-emerald uppercase tracking-wider">Live</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm">Obchoduj s itemy nebo analyzuj a investuj do akcií.</p>
            </div>
            <button onClick={() => setShowSell(true)} className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <span>+</span> Vystavit
            </button>
          </div>

          <div className="flex gap-2 border-b border-white/5">
            <button 
              onClick={() => setActiveTab('invest')} 
              className={`px-6 py-3 text-sm font-black transition-all relative ${activeTab === 'invest' ? 'text-st-gold' : 'text-text-secondary hover:text-white'}`}
            >
              📈 TRADING TERMINAL
              {activeTab === 'invest' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-st-gold shadow-[0_0_10px_rgba(251,191,36,0.8)]" />}
            </button>
            <button 
              onClick={() => setActiveTab('browse')} 
              className={`px-6 py-3 text-sm font-black transition-all relative ${activeTab === 'browse' ? 'text-st-cyan' : 'text-text-secondary hover:text-white'}`}
            >
              🔎 ITEM MARKET
              {activeTab === 'browse' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-st-cyan shadow-[0_0_10px_rgba(6,182,212,0.8)]" />}
            </button>
          </div>
        </div>

        {error && <div className="glass-card-static p-4 border-red-500/30 border text-red-400 text-sm mx-6 z-10 relative">{error}</div>}
        {success && <div className="glass-card-static p-4 border-emerald-500/30 border text-emerald-400 text-sm mx-6 z-10 relative">✅ {success}</div>}

        {activeTab === 'invest' ? (
          /* TRADING TERMINAL TAB */
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 px-1 relative z-10">
            <div className="xl:col-span-3 flex flex-col">
              
              {activeStock ? (
                <div className="glass-card-static flex-1 flex flex-col border-white/5 overflow-visible">
                  {/* Top Bar with Stock Selector */}
                  <div className="p-5 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-white/[0.01]">
                    <div className="relative">
                       <button onClick={() => setStockSelectorOpen(!stockSelectorOpen)} className="flex items-center gap-4 px-4 py-2 rounded-xl hover:bg-white/5 transition-colors group">
                         <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center font-black text-lg text-st-gold shadow-lg shadow-black/20 group-hover:scale-105 transition-transform">
                           {activeStock.symbol[0]}
                         </div>
                         <div className="text-left">
                           <div className="flex items-center gap-2">
                             <h2 className="text-3xl font-black text-white tracking-tighter">{activeStock.symbol}</h2>
                             <svg className={`w-5 h-5 text-text-muted transition-transform ${stockSelectorOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                           </div>
                           <p className="text-xs font-black text-text-muted uppercase tracking-widest mt-0.5">{activeStock.name}</p>
                         </div>
                       </button>

                       {stockSelectorOpen && (
                         <div className="absolute top-full left-0 mt-3 w-72 rounded-2xl border border-white/10 bg-[#0F172A]/95 backdrop-blur-xl shadow-2xl z-[60] overflow-hidden animate-fade-down">
                            {stocks.map(s => {
                              const change = parseFloat(s.currentPrice) - parseFloat(s.lastPrice);
                              const isUp = change >= 0;
                              return (
                                <div key={s.id} onClick={() => { setActiveStockId(s.id); setStockSelectorOpen(false); }} className={`p-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.06] transition-colors ${activeStockId === s.id ? 'bg-st-gold/10 border-l-4 border-st-gold' : 'border-l-4 border-transparent'}`}>
                                  <div className="flex flex-col">
                                    <span className="font-black text-white text-base">{s.symbol}</span>
                                    <span className="text-[10px] font-bold text-text-muted uppercase">{s.name}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="block font-mono font-black text-sm">{parseFloat(s.currentPrice).toFixed(2)} ST</span>
                                    <span className={`text-[10px] font-black uppercase ${isUp ? 'text-emerald-400' : 'text-st-red'}`}>{isUp ? '▲' : '▼'} {change >= 0 ? '+' : ''}{change.toFixed(2)}</span>
                                  </div>
                                </div>
                              );
                            })}
                         </div>
                       )}
                    </div>

                    <div className="flex items-end gap-8 px-4">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Objem (24h)</p>
                        <p className="text-sm font-mono font-black text-white leading-none">
                          {(Math.random() * 5000 + 1000).toLocaleString('cs-CZ', { maximumFractionDigits: 0 })} <span className="text-[10px] text-text-muted">ks</span>
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Cena Poslední Tř.</p>
                        <p className={`text-sm font-mono font-black leading-none ${(parseFloat(activeStock.currentPrice)-parseFloat(activeStock.lastPrice)) >= 0 ? 'text-emerald-400' : 'text-st-red'}`}>
                          {(parseFloat(activeStock.currentPrice)-parseFloat(activeStock.lastPrice)) >= 0 ? '+' : ''}
                          {(parseFloat(activeStock.currentPrice)-parseFloat(activeStock.lastPrice)).toFixed(4)} <span className="text-[10px] text-text-muted">ST</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Aktuální Cena</p>
                        <p className="text-3xl font-mono font-black text-st-gold leading-none">
                          {parseFloat(activeStock.currentPrice).toLocaleString('cs-CZ', { minimumFractionDigits: 4 })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="relative p-6 pt-10 h-[500px] flex-1 bg-gradient-to-b from-black/0 to-black/40 group overflow-hidden">
                    <div className="absolute top-4 left-6 z-10 flex gap-6 pointer-events-none">
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">High</span>
                           <span className="text-sm font-mono font-bold text-emerald-400">
                             {Math.max(...(activeStock.history?.map((h: any) => parseFloat(h.price)) || [parseFloat(activeStock.currentPrice)])).toFixed(2)}
                           </span>
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Low</span>
                           <span className="text-sm font-mono font-bold text-st-red">
                             {Math.min(...(activeStock.history?.map((h: any) => parseFloat(h.price)) || [parseFloat(activeStock.currentPrice)])).toFixed(2)}
                           </span>
                        </div>
                    </div>

                    <div className="w-full h-[400px]">
                      {activeStock.history && <CandlestickChart history={activeStock.history} />}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-3 glass-card-static flex-1 flex flex-col items-center justify-center shadow-lg">
                  <div className="text-4xl animate-bounce">📊</div>
                  <p className="text-text-muted text-xs font-black uppercase tracking-[0.2em]">Načítám terminál</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-card-static p-6 border-white/10 shadow-lg">
                <div className="flex gap-1 bg-black/60 p-1.5 rounded-2xl mb-8 border border-white/5">
                  <button onClick={() => setTradeMode('buy')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${tradeMode === 'buy' ? 'bg-st-emerald text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-text-muted hover:text-white'}`}>Koupit</button>
                  <button onClick={() => setTradeMode('sell')} className={`flex-1 py-3 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${tradeMode === 'sell' ? 'bg-st-red text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-text-muted hover:text-white'}`}>Prodat</button>
                </div>

                {activeStock ? (
                  <div className="space-y-6">
                    <div className="p-5 bg-white/[0.02] rounded-2xl border border-white/5">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">Tržní Cena:</span>
                        <span className="font-mono text-white font-black text-lg">{parseFloat(activeStock.currentPrice).toFixed(2)} ST</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-text-muted font-black uppercase tracking-widest">Volný Zůstatek:</span>
                        <span className="font-mono text-st-cyan/80 font-bold text-sm">{parseFloat(user.balance).toLocaleString()} ST</span>
                      </div>
                    </div>

                    {tradeMode === 'buy' ? (
                      <div className="space-y-3">
                        <label className="text-[10px] text-text-muted font-black uppercase tracking-widest block px-1">Částka k investici ({'ST'})</label>
                        <div className="relative">
                           <input type="number" min="0" step="1" value={investAmount} onChange={e => setInvestAmount(e.target.value)} className="glass-input text-2xl font-mono p-4 pr-16 bg-black/40 focus:border-st-emerald" placeholder="0.00" />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">ST</span>
                        </div>
                        <div className="flex justify-between px-2 pt-1 border-t border-white/5">
                           <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Odhad nákupu:</p>
                           <p className="text-[11px] text-white font-black uppercase">{(parseFloat(investAmount) / parseFloat(activeStock.currentPrice) || 0).toFixed(6)} <span className="text-text-muted text-[10px]">{activeStock.symbol}</span></p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-[10px] text-text-muted font-black uppercase tracking-widest block px-1">Množství k prodeji ({activeStock.symbol})</label>
                        <div className="relative">
                           <input type="number" min="0" step="0.1" value={sellShares} onChange={e => setSellShares(e.target.value)} className="glass-input text-2xl font-mono p-4 pr-16 bg-black/40 focus:border-st-red" placeholder="0.0" />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">{activeStock.symbol}</span>
                        </div>
                        <div className="flex justify-between px-2 pt-1 border-t border-white/5">
                           <p className="text-[10px] text-text-muted font-bold tracking-wider uppercase">Odhad výnosu:</p>
                           <p className="text-[11px] text-white font-black uppercase">{(parseFloat(sellShares) * parseFloat(activeStock.currentPrice) || 0).toFixed(2)} <span className="text-text-muted text-[10px]">ST</span></p>
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={handleStockTrade} 
                      disabled={loading || (tradeMode === 'buy' ? !investAmount : !sellShares)}
                      className={`w-full py-5 rounded-2xl font-black text-sm tracking-widest transition-all ${tradeMode === 'buy' ? 'bg-st-emerald text-white shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]' : 'bg-st-red text-white shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]'} disabled:opacity-50 disabled:scale-100 disabled:shadow-none uppercase`}
                    >
                      {loading ? 'Spracovávám...' : tradeMode === 'buy' ? `Koupit ${activeStock.symbol}` : `Prodat ${activeStock.symbol}`}
                    </button>
                  </div>
                ) : <div className="py-12 text-center text-text-muted text-[10px] font-black uppercase">Vyber aktívum v terminálu</div>}
              </div>

              <div className="glass-card-static p-6 bg-gradient-to-br from-[#0c1222] to-transparent border-white/10 shadow-lg">
                <h3 className="font-black text-[10px] uppercase tracking-widest mb-6 text-text-muted flex items-center justify-between">
                  <span>Otevřená pozice</span>
                  <span className="text-white bg-white/10 px-2 py-0.5 rounded">{activeStock?.symbol || '—'}</span>
                </h3>
                {activeStock?.investments?.[0] ? (
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Vlastněno</span>
                      <span className="font-mono text-white font-black text-sm">{parseFloat(activeStock.investments[0].shares).toFixed(4)} ks</span>
                    </div>
                    <div className="flex justify-between text-xs items-center border-t border-white/5 pt-3">
                      <span className="text-text-muted font-bold uppercase tracking-wider text-[10px]">Průměrný Nákup</span>
                      <span className="font-mono text-white font-bold">{parseFloat(activeStock.investments[0].avgPrice).toLocaleString()} ST</span>
                    </div>
                    {(() => {
                      const value = parseFloat(activeStock.investments[0].shares) * parseFloat(activeStock.currentPrice);
                      const cost = parseFloat(activeStock.investments[0].amount);
                      const profit = value - cost;
                      const profitPercent = (profit / cost) * 100;
                      
                      return (
                        <div className={`p-4 rounded-2xl border-2 mt-6 relative overflow-hidden ${profit >= 0 ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]' : 'bg-st-red/5 border-st-red/20 text-st-red'}`}>
                          {profit >= 0 && <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl -mr-10 -mt-10 pointer-events-none" />}
                          <div className="flex justify-between items-center mb-1 relative z-10">
                             <p className="text-[10px] font-black uppercase text-text-muted tracking-widest">Zisk / Ztráta (P/L)</p>
                             <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${profit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-st-red/20 text-st-red'}`}>
                               {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                             </span>
                          </div>
                          <p className={`text-2xl font-mono font-black relative z-10 ${profit >= 0 ? 'text-emerald-400' : 'text-st-red'} tracking-tighter`}>
                            {profit >= 0 ? '+' : ''}{profit.toFixed(4)} <span className="text-xs opacity-70">ST</span>
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : <div className="py-6 text-center">
                      <div className="text-2xl mb-2 opacity-30">📦</div>
                      <p className="text-text-muted text-[10px] font-black uppercase tracking-wider">Aktuálně nedržíte žádnou pozici.</p>
                    </div>}
              </div>
            </div>
          </div>
        ) : (
          /* MARKETPLACE TAB */
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5 overflow-x-auto">
              <div className="flex items-center gap-1 min-w-max">
                {(['ACTIVE', 'AUCTION', 'DIRECT', 'SOLD'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterMode(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-black tracking-widest uppercase transition-all ${filterMode === f ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
                  >
                    {f === 'ACTIVE' ? 'Vše' : f === 'AUCTION' ? 'Aukce' : f === 'DIRECT' ? 'Přímý' : 'Historie'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 min-w-max">
                <select 
                  value={filterType} 
                  onChange={e => setFilterType(e.target.value as any)}
                  className="bg-black/40 border border-white/10 text-xs text-text-primary rounded-xl px-3 py-2 outline-none font-bold"
                >
                  <option value="ALL">Všechny Itemy</option>
                  <option value="USERNAME">Usernames</option>
                  <option value="MYTHIC_PASS">Mythic Passy</option>
                </select>
                <select 
                  value={sort} 
                  onChange={e => setSort(e.target.value as any)}
                  className="bg-black/40 border border-white/10 text-xs text-text-primary rounded-xl px-3 py-2 outline-none font-bold"
                >
                  <option value="RECENT">Nejnovější</option>
                  <option value="PRICE_ASC">Od nejlevnějších</option>
                  <option value="PRICE_DESC">Od nejdražších</option>
                  <option value="ENDING_SOON">Končící brzy</option>
                </select>
              </div>
            </div>

            <div className="glass-card-static overflow-hidden rounded-2xl border border-white/5 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Položka</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Stav</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Cena / Příhoz</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted">Čas</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-text-muted text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {loading && listings.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-text-muted font-bold text-xs uppercase tracking-widest">Načítám data...</td></tr>
                    ) : listings.length === 0 ? (
                      <tr><td colSpan={5} className="py-20 text-center text-text-muted font-bold text-xs uppercase tracking-widest">Žádné inzeráty.</td></tr>
                    ) : (
                      listings.map((l: any) => (
                        <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => router.push(`/market/${l.id}`)}>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${l.type === 'USERNAME' ? 'bg-st-purple/10 border border-st-purple/20' : 'bg-st-cyan/10 border border-st-cyan/20 text-glow-cyan'}`}>
                                {l.type === 'USERNAME' ? '👤' : '🌈'}
                              </div>
                              <div>
                                <p className="font-black text-white text-base">
                                  {l.type === 'USERNAME' ? `@${l.username?.handle}` : `Mythic Pass #${l.id.slice(-4).toUpperCase()}`}
                                </p>
                                <p className="text-[10px] font-bold text-text-muted mt-1 uppercase tracking-widest">
                                  Seller: {l.seller?.username}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {l.status === 'SOLD' ? (
                              <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded border border-emerald-500/20">PRODÁNO</span>
                            ) : l.isAuction ? (
                              <span className="px-2 py-1 bg-st-gold/10 text-st-gold text-[9px] font-black uppercase tracking-widest rounded border border-st-gold/20">AUKCE</span>
                            ) : (
                              <span className="px-2 py-1 bg-st-cyan/10 text-st-cyan text-[9px] font-black uppercase tracking-widest rounded border border-st-cyan/20">KUP TEĎ</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-mono font-black text-st-gold text-lg leading-tight">
                              {parseFloat(l.currentHighestBid || l.price).toFixed(2)} ST
                            </p>
                            {l.isAuction && (
                              <p className="text-[9px] font-bold text-text-muted uppercase mt-0.5">{l._count?.bids || 0} příhozů</p>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <TimeLeft endsAt={l.endsAt} />
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex justify-end">
                               <button className="px-4 py-2 bg-white/5 border border-white/10 group-hover:bg-st-cyan group-hover:text-black group-hover:border-st-cyan rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                Zobrazit
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SELL MODAL */}
      {showSell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4" onClick={() => setShowSell(false)}>
          <div className="glass-card-static p-8 w-full max-w-md rounded-3xl border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black mb-1">Vystavit Předmět</h2>
            <p className="text-text-muted text-xs font-bold uppercase tracking-widest mb-8">Napiš svou cenu a pošli to do světa</p>
            
            <div className="space-y-6">
              <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                <button onClick={() => { setSellItemType('MYTHIC_PASS'); setSellItemId(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${sellItemType === 'MYTHIC_PASS' ? 'bg-st-cyan text-black' : 'text-text-muted'} tracking-widest`}>Passy</button>
                <button onClick={() => { setSellItemType('USERNAME'); setSellItemId(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${sellItemType === 'USERNAME' ? 'bg-st-purple text-white' : 'text-text-muted'} tracking-widest`}>Uživatelská Jména</button>
              </div>

              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-2">Vybrat Item</label>
                {sellItemType === 'MYTHIC_PASS' ? (
                  availPasses.length === 0 ? <p className="text-xs text-st-red font-bold">Nemáš žádný volný pass.</p> : (
                  <select value={sellItemId} onChange={e => setSellItemId(e.target.value)} className="glass-input font-bold">
                    <option value="">— Vyber pass —</option>
                    {availPasses.map((p: any) => <option key={p.id} value={p.id}>Mythic Pass #{p.id.slice(-5).toUpperCase()}</option>)}
                  </select>
                )) : (
                  sellableHandles.length === 0 ? <p className="text-xs text-st-red font-bold">Žádný tvůj handle nelze prodat (24h cooldown).</p> : (
                  <select value={sellItemId} onChange={e => setSellItemId(e.target.value)} className="glass-input font-bold">
                    <option value="">— Vyber handle —</option>
                    {sellableHandles.map((h: any) => <option key={h.id} value={h.id}>@{h.handle}</option>)}
                  </select>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-2">Typ prodeje</label>
                  <button 
                    onClick={() => setIsAuctionSell(!isAuctionSell)}
                    className={`w-full py-3.5 rounded-2xl border font-black text-xs transition-all ${isAuctionSell ? 'bg-st-gold/10 border-st-gold text-st-gold' : 'bg-black/20 border-white/10 text-white'}`}
                  >
                    {isAuctionSell ? '⚡ AUKCE' : '💵 KUP TEĎ'}
                  </button>
                </div>
                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-2">{isAuctionSell ? 'Vyvolávací': 'Cena'} (ST)</label>
                  <input type="number" min="1" step="1" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="glass-input font-mono font-bold" placeholder="50" />
                </div>
              </div>

              {isAuctionSell && (
                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-2">Trvání aukce (hodin)</label>
                  <div className="flex gap-2">
                    {[2, 12, 24, 48, 168].map(h => (
                      <button key={h} onClick={() => setAuctionDuration(h)} className={`flex-1 py-2 text-[10px] font-black border rounded-xl ${auctionDuration === h ? 'bg-white/10 border-white/40 text-white' : 'border-white/5 text-text-muted'}`}>{h}h</button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-2">Poznámka pro kupce</label>
                <textarea value={sellNote} onChange={e => setSellNote(e.target.value)} className="glass-input text-xs h-24 p-4 resize-none" placeholder="Např. 'Rychlé vyplacení', 'Vzácný handle'..." maxLength={200} />
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowSell(false)} className="btn-secondary flex-1 py-4 text-xs font-black uppercase tracking-widest">Zavřít</button>
                <button onClick={handleCreateListing} disabled={!sellItemId || !sellPrice} className="btn-primary flex-1 py-4 text-xs font-black uppercase tracking-widest shadow-2xl">VYSTAVIT</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
