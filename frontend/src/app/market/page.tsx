'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import Link from 'next/link';

type MarketTab = 'browse' | 'invest';

export default function MarketPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<MarketTab>('browse');
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
        <div className="glass-card-static p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              <p className="text-text-secondary text-sm">Obchoduj s itemy nebo investuj své ST do akcií</p>
            </div>
            <button onClick={() => setShowSell(true)} className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
              <span>+</span> Vystavit
            </button>
          </div>

          <div className="flex gap-2 mt-6">
            <button 
              onClick={() => setActiveTab('browse')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'browse' ? 'bg-st-cyan/20 text-st-cyan border border-st-cyan/30' : 'text-text-secondary hover:text-white'}`}
            >
              🔎 Procházet
            </button>
            <button 
              onClick={() => setActiveTab('invest')} 
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'invest' ? 'bg-st-gold/20 text-st-gold border border-st-gold/30' : 'text-text-secondary hover:text-white'}`}
            >
              📈 Investice
            </button>
          </div>
        </div>

        {error && <div className="glass-card-static p-4 border-red-500/30 border text-red-400 text-sm">{error}</div>}
        {success && <div className="glass-card-static p-4 border-emerald-500/30 border text-emerald-400 text-sm">✅ {success}</div>}

        {activeTab === 'invest' ? (
          /* INVESTMENT TAB */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stocks.map(s => {
                  const change = parseFloat(s.currentPrice) - parseFloat(s.lastPrice);
                  const isUp = change >= 0;
                  return (
                    <button 
                      key={s.id} 
                      onClick={() => setActiveStockId(s.id)}
                      className={`glass-card-static p-5 text-left transition-all hover:border-st-cyan/40 ${activeStockId === s.id ? 'ring-2 ring-st-cyan/50' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-mono font-black text-st-gold text-xl tracking-tighter">{s.symbol}</p>
                          <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{s.name}</p>
                        </div>
                        <div className={`text-right ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                          <p className="font-mono font-black text-lg">{parseFloat(s.currentPrice).toFixed(2)}</p>
                          <p className="text-[10px] font-bold">{isUp ? '▲' : '▼'} {Math.abs(change).toFixed(4)}</p>
                        </div>
                      </div>
                      <div className="h-12 w-full flex items-end">
                        <svg className="w-full h-full" preserveAspectRatio="none">
                          <polyline
                            fill="none"
                            stroke={isUp ? '#34d399' : '#f87171'}
                            strokeWidth="2"
                            points={s.history?.slice().reverse().map((p: any, i: number) => {
                              const prices = s.history.map((h: any) => parseFloat(h.price));
                              const min = Math.min(...prices);
                              const max = Math.max(...prices);
                              const range = max - min || 1;
                              const x = (i / (s.history.length - 1)) * 300;
                              const y = 48 - ((parseFloat(p.price) - min) / range) * 40;
                              return `${x},${y}`;
                            }).join(' ')}
                          />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeStock && (
                <div className="glass-card-static p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black">
                      <span className="text-st-gold tracking-tighter">{activeStock.symbol}</span>
                      <span className="text-text-muted text-sm font-bold ml-3 uppercase tracking-widest">{activeStock.name} (LIVE)</span>
                    </h2>
                  </div>
                  <div className="h-72 bg-black/30 rounded-2xl p-4 border border-glass-border relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        fill="url(#chartGradient)"
                        d={`M 0 200 ${activeStock.history?.slice().reverse().map((p: any, i: number) => {
                          const prices = activeStock.history.map((h: any) => parseFloat(h.price));
                          const min = Math.min(...prices);
                          const max = Math.max(...prices);
                          const range = max - min || 1;
                          const x = (i / (activeStock.history.length - 1)) * 800;
                          const y = 180 - ((parseFloat(p.price) - min) / range) * 160;
                          return `L ${x} ${y}`;
                        }).join(' ')} L 800 200 Z`}
                      />
                      <polyline
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={activeStock.history?.slice().reverse().map((p: any, i: number) => {
                          const prices = activeStock.history.map((h: any) => parseFloat(h.price));
                          const min = Math.min(...prices);
                          const max = Math.max(...prices);
                          const range = max - min || 1;
                          const x = (i / (activeStock.history.length - 1)) * 800;
                          const y = 180 - ((parseFloat(p.price) - min) / range) * 160;
                          return `${x},${y}`;
                        }).join(' ')}
                      />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="glass-card-static p-6">
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl mb-6 border border-white/5">
                  <button onClick={() => setTradeMode('buy')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${tradeMode === 'buy' ? 'bg-st-cyan text-black' : 'text-text-muted hover:text-white'}`}>NAKOUPIT</button>
                  <button onClick={() => setTradeMode('sell')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${tradeMode === 'sell' ? 'bg-st-red text-white' : 'text-text-muted hover:text-white'}`}>PRODAT</button>
                </div>

                {activeStock ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted font-bold uppercase tracking-widest">Cena:</span>
                      <span className="font-mono text-st-gold font-black text-xl">{parseFloat(activeStock.currentPrice).toFixed(2)} ST</span>
                    </div>

                    {tradeMode === 'buy' ? (
                      <div>
                        <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest block mb-2">Částka v ST</label>
                        <input type="number" value={investAmount} onChange={e => setInvestAmount(e.target.value)} className="glass-input text-lg font-mono" placeholder="0.00" />
                        <p className="text-[9px] text-text-muted mt-2 font-bold uppercase">Obdržíte cca: {(parseFloat(investAmount) / parseFloat(activeStock.currentPrice) || 0).toFixed(4)} akcií</p>
                      </div>
                    ) : (
                      <div>
                        <label className="text-[10px] text-text-muted font-bold uppercase tracking-widest block mb-2">Počet akcií k prodeji</label>
                        <input type="number" value={sellShares} onChange={e => setSellShares(e.target.value)} className="glass-input text-lg font-mono" placeholder="0.0" />
                        <p className="text-[9px] text-text-muted mt-2 font-bold uppercase">Získáte cca: {(parseFloat(sellShares) * parseFloat(activeStock.currentPrice) || 0).toFixed(2)} ST</p>
                      </div>
                    )}

                    <button 
                      onClick={handleStockTrade} 
                      disabled={loading}
                      className={`w-full py-4 rounded-xl font-black text-sm tracking-widest transition-all ${tradeMode === 'buy' ? 'bg-st-cyan text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02]' : 'bg-st-red text-white shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:scale-[1.02]'}`}
                    >
                      {loading ? 'ZPRACOVÁVÁM...' : tradeMode === 'buy' ? `KOUPIT ${activeStock.symbol}` : `PRODAT ${activeStock.symbol}`}
                    </button>
                  </div>
                ) : <p className="text-center text-text-muted py-8 text-xs font-bold uppercase">Zvolte akcii</p>}
              </div>

              <div className="glass-card-static p-6 bg-st-cyan/5">
                <h3 className="font-black text-[10px] uppercase tracking-widest mb-4 text-text-muted">Můj podíl ({activeStock?.symbol})</h3>
                {activeStock?.investments?.[0] ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted font-bold">Vlastněno:</span>
                      <span className="font-mono text-white font-bold">{parseFloat(activeStock.investments[0].shares).toFixed(4)} ks</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted font-bold">Investice:</span>
                      <span className="font-mono text-white font-bold">{parseFloat(activeStock.investments[0].amount).toFixed(2)} ST</span>
                    </div>
                    {(() => {
                      const value = parseFloat(activeStock.investments[0].shares) * parseFloat(activeStock.currentPrice);
                      const profit = value - parseFloat(activeStock.investments[0].amount);
                      return (
                        <div className={`p-3 rounded-xl border mt-4 ${profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-st-red/10 border-st-red/20'}`}>
                          <p className="text-[10px] font-black uppercase text-text-muted mb-1">Zisk / Ztráta</p>
                          <p className={`text-lg font-mono font-black ${profit >= 0 ? 'text-emerald-400' : 'text-st-red'}`}>
                            {profit >= 0 ? '+' : ''}{profit.toFixed(4)} ST
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : <p className="text-center py-4 text-text-muted text-[10px] font-bold uppercase">Žádná investice</p>}
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

            <div className="glass-card-static overflow-hidden rounded-2xl border border-white/5">
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
                <button onClick={() => { setSellItemType('MYTHIC_PASS'); setSellItemId(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${sellItemType === 'MYTHIC_PASS' ? 'bg-st-cyan text-black' : 'text-text-muted'}`}>Pass</button>
                <button onClick={() => { setSellItemType('USERNAME'); setSellItemId(''); }} className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all ${sellItemType === 'USERNAME' ? 'bg-st-purple text-white' : 'text-text-muted'}`}>Handle</button>
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
