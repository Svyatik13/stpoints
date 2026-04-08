'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { cs } from 'date-fns/locale/cs';

export default function MarketPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [filterType, setFilterType] = useState<'ALL' | 'USERNAME' | 'MYTHIC_PASS'>('ALL');
  const [filterMode, setFilterMode] = useState<'ACTIVE' | 'AUCTION' | 'DIRECT' | 'SOLD'>('ACTIVE');
  const [sort, setSort] = useState<'RECENT' | 'PRICE_ASC' | 'PRICE_DESC' | 'ENDING_SOON'>('RECENT');
  
  const [listings, setListings] = useState<any[]>([]);
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

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const type = filterType === 'ALL' ? undefined : filterType;
      const [listRes, handleRes] = await Promise.all([
        api.market.list(type, filterMode, sort === 'RECENT' ? undefined : sort),
        api.usernames.me().catch(() => ({ usernames: [] })),
      ]);
      setListings(listRes.listings);
      setMyHandles(handleRes.usernames);
      // Mythic Passes are currently "legacy" or orphaned if cases are gone
      setMyPasses([]); 
    } catch (e: any) {
      if (!e.message?.includes('401')) setError(e.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [filterType, filterMode, sort]);

  useEffect(() => { 
    loadData(true); 
    const interval = setInterval(() => {
      loadData(false);
    }, 5000);
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

  const availPasses = myPasses.filter((p: any) => !p.isUsed);
  const sellableHandles = myHandles.filter((h: any) => new Date() >= new Date(h.canSellAt));

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="glass-card-static p-6 shadow-lg relative z-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black tracking-tight text-white space-x-2">
                  <span>Tržiště Itémů</span>
                </h1>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-st-emerald/10 border border-st-emerald/20 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 bg-st-emerald rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span className="text-[10px] font-black text-st-emerald uppercase tracking-wider">Live</span>
                </div>
              </div>
              <p className="text-text-secondary text-sm">Obchoduj s exkluzivními handles a mythic passy.</p>
            </div>
            <button onClick={() => setShowSell(true)} className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              <span>+</span> Vystavit
            </button>
          </div>
        </div>

        {error && <div className="glass-card-static p-4 border-red-500/30 border text-red-400 text-sm mx-6 z-10 relative">{error}</div>}
        {success && <div className="glass-card-static p-4 border-emerald-500/30 border text-emerald-400 text-sm mx-6 z-10 relative">✅ {success}</div>}

        {/* MARKETPLACE */}
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
