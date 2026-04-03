'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'passes' | 'handles';

function formatDate(d: string) {
  return new Date(d).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Ukončeno');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      let str = '';
      if (days > 0) str += `${days}d `;
      str += `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setTimeLeft(str);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return <span className="font-mono font-bold text-st-red">{timeLeft}</span>;
}

export default function MarketPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('passes');
  const [listings, setListings] = useState<any[]>([]);
  const [myHandles, setMyHandles] = useState<any[]>([]);
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSell, setShowSell] = useState(false);
  const [sellPrice, setSellPrice] = useState('');
  const [sellPassId, setSellPassId] = useState('');
  const [sellHandleId, setSellHandleId] = useState('');
  const [newHandle, setNewHandle] = useState('');
  const [handleAvail, setHandleAvail] = useState<boolean | null>(null);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [showHandleModal, setShowHandleModal] = useState(false);
  const [handleError, setHandleError] = useState('');

  // Auction creation state
  const [isAuction, setIsAuction] = useState(false);
  const [duration, setDuration] = useState(24);
  const [increment, setIncrement] = useState('1');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [listRes, handleRes, passRes] = await Promise.all([
        api.market.list(tab === 'passes' ? 'MYTHIC_PASS' : 'USERNAME'),
        api.usernames.me(),
        api.cases.passes(),
      ]);
      setListings(listRes.listings);
      setMyHandles(handleRes.usernames);
      setMyPasses(passRes.passes ?? []);
    } catch (e: any) {
      if (e.message.includes('401') || e.message.includes('token')) return;
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced handle availability check
  useEffect(() => {
    if (!newHandle || newHandle.length < 3) { setHandleAvail(null); return; }
    setCheckingAvail(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.usernames.check(newHandle);
        setHandleAvail(r.available);
      } catch { setHandleAvail(null); }
      setCheckingAvail(false);
    }, 500);
    return () => clearTimeout(t);
  }, [newHandle]);

  const toast = (msg: string, isErr = false) => {
    if (isErr) setError(msg); else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 4000);
  };

  const handleBuy = async (id: string) => {
    try {
      const r = await api.market.buy(id);
      toast(r.message);
      loadData();
    } catch (e: any) { toast(e.message, true); }
  };

  const handleBid = async (id: string, currentPrice: number, increment: number) => {
    const amount = prompt(`Zadejte vaši nabídku (Min: ${currentPrice + increment} ST):`, (currentPrice + increment).toString());
    if (!amount) return;
    try {
      const r = await api.market.bid(id, amount);
      toast(r.message);
      loadData();
    } catch (e: any) { toast(e.message, true); }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.market.cancel(id);
      toast('Inzerce stažena.');
      loadData();
    } catch (e: any) { toast(e.message, true); }
  };

  const handleCreateListing = async () => {
    if (!sellPrice) return toast('Zadejte cenu.', true);
    try {
      const payload = {
        type: tab === 'passes' ? 'MYTHIC_PASS' : 'USERNAME',
        price: sellPrice,
        passId: tab === 'passes' ? sellPassId : undefined,
        usernameId: tab === 'handles' ? sellHandleId : undefined,
        isAuction,
        durationHours: isAuction ? duration : undefined,
        minIncrement: isAuction ? increment : undefined,
      };
      
      await api.market.create(payload as any);
      toast(isAuction ? 'Aukce vytvořena!' : 'Inzerce vytvořena!');
      setShowSell(false);
      setSellPrice(''); setSellPassId(''); setSellHandleId('');
      setIsAuction(false);
      loadData();
    } catch (e: any) { toast(e.message, true); }
  };

  const handleCreateHandle = async () => {
    setHandleError('');
    if (!newHandle) return;
    setLoading(true);
    try {
      await api.usernames.create({ handle: newHandle });
      toast(`Handle @${newHandle.toLowerCase()} vytvořen!`);
      setShowHandleModal(false);
      setNewHandle('');
      setHandleAvail(null);
      loadData();
    } catch (e: any) { 
      setHandleError(e.message);
      setHandleAvail(false); 
    }
    finally { setLoading(false); }
  };

  const handleDelete = async (id: string, handle: string) => {
    if (!confirm(`Opravdu chcete uvolnit handle @${handle}?`)) return;
    try {
      await api.usernames.delete(id);
      toast(`Handle @${handle} uvolněn.`);
      loadData();
    } catch (e: any) { toast(e.message, true); }
  };

  if (!user) return null;

  const availPasses = myPasses.filter((p: any) => !p.isUsed);

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="glass-card-static p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">🏪 Tržiště</h1>
              <p className="text-text-secondary text-sm mt-1">Kupuj a prodávej Mythic Passy a handlery za ST pointy</p>
            </div>
            <button onClick={() => setShowSell(true)} className="btn-primary px-4 py-2 text-sm">
              + Prodat
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-5">
            <button onClick={() => setTab('passes')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'passes' ? 'bg-st-cyan/20 text-st-cyan border border-st-cyan/30' : 'text-text-secondary hover:text-text-primary'}`}>
              🌈 Mythic Passy
            </button>
            <button onClick={() => setTab('handles')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === 'handles' ? 'bg-st-purple/20 text-st-purple border border-st-purple/30' : 'text-text-secondary hover:text-text-primary'}`}>
              🏷️ Handlery
            </button>
          </div>
        </div>

        {/* My Handles Section (only in handles tab) */}
        {tab === 'handles' && (
          <div className="glass-card-static p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text-primary">Moje handlery</h2>
              <button onClick={() => setShowHandleModal(true)} className="btn-secondary text-xs px-3 py-1.5" disabled={myHandles.length >= 3}>
                + Vytvořit handle <span className="text-text-muted">({myHandles.length}/3)</span>
              </button>
            </div>
            {myHandles.length === 0 ? (
              <p className="text-text-muted text-sm">Zatím žádné handlery. Vytvoř si první za 2 ST!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myHandles.map((h: any) => {
                  const canSell = new Date() >= new Date(h.canSellAt);
                  return (
                    <div key={h.id} className="rounded-xl border border-glass-border bg-white/3 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-st-purple">@{h.handle}</span>
                        <div className="flex gap-2">
                          {canSell && (
                            <button onClick={() => { setSellHandleId(h.id); setTab('handles'); setShowSell(true); }} className="text-xs text-st-cyan hover:underline">Prodat</button>
                          )}
                          <button onClick={() => handleDelete(h.id, h.handle)} className="text-xs text-red-400 hover:underline">Uvolnit</button>
                        </div>
                      </div>
                      {!canSell && (
                        <p className="text-xs text-text-muted mt-1">Prodej od: {formatDate(h.canSellAt)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {error && <div className="glass-card-static p-4 border-red-500/30 border text-red-400 text-sm">{error}</div>}
        {success && <div className="glass-card-static p-4 border-emerald-500/30 border text-emerald-400 text-sm">✅ {success}</div>}

        {/* Listings */}
        {loading ? (
          <div className="glass-card-static p-8 text-center text-text-muted">Načítám...</div>
        ) : listings.length === 0 ? (
          <div className="glass-card-static p-8 text-center">
            <p className="text-4xl mb-3">{tab === 'passes' ? '🌈' : '🏷️'}</p>
            <p className="text-text-secondary">Žádné aktivní inzerce. Buďte první, kdo prodá!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((l: any) => (
              <div key={l.id} className={`glass-card-static p-5 flex flex-col gap-3 relative overflow-hidden ${l.isAuction ? 'border-st-gold/30' : ''}`}>
                {l.isAuction && (
                  <div className="absolute top-0 left-0 bg-st-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-br-lg uppercase tracking-tighter">
                    Aukce
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div>
                    {l.type === 'MYTHIC_PASS' ? (
                      <span className="text-2xl">🌈</span>
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-st-purple text-lg">@{l.username?.handle}</span>
                      </div>
                    )}
                    <p className="text-xs text-text-muted mt-1">
                      Prodávající: <span className="text-text-secondary">{l.seller?.username}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-st-gold font-mono">
                      {parseFloat((l.currentHighestBid || l.price).toString()).toFixed(2)}
                    </p>
                    <p className="text-xs text-text-muted">ST</p>
                  </div>
                </div>

                {l.isAuction ? (
                  <div className="bg-white/5 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Končí za:</span>
                      <CountdownTimer endsAt={l.endsAt} />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted">Nabídky:</span>
                      <span className="text-text-secondary font-mono">{l._count?.bids || 0}</span>
                    </div>
                    {l.buyer && (
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-text-muted">Aktuální vítěz:</span>
                        <span className="text-st-cyan">@{l.buyer.username}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-text-muted bg-white/5 p-2 rounded italic">
                    ⏱ Pevná cena. ST dorazí prodávajícímu za 2 hod po koupi.
                  </p>
                )}

                <div className="mt-auto pt-2">
                  {l.sellerId === user.id ? (
                    <button onClick={() => handleCancel(l.id)} className="btn-secondary text-xs w-full py-2">
                      Stáhnout inzerci
                    </button>
                  ) : l.isAuction ? (
                    <button 
                      onClick={() => handleBid(l.id, parseFloat((l.currentHighestBid || l.price).toString()), parseFloat(l.minIncrement?.toString() || '1'))} 
                      className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-2"
                      disabled={loading || (l.endsAt && new Date() > new Date(l.endsAt))}
                    >
                      {l.endsAt && new Date() > new Date(l.endsAt) ? 'Aukce skončila' : 'Přihodit'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleBuy(l.id)} 
                      className="btn-primary text-xs w-full py-2 flex items-center justify-center gap-2"
                      disabled={loading}
                    >
                      Koupit za {parseFloat(l.price.toString()).toFixed(2)} ST
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        )}
      </div>

      {/* Sell Modal */}
      {showSell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowSell(false)}>
          <div className="glass-card-static p-6 w-full max-w-sm mx-4 rounded-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Vytvořit inzerci</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary block mb-1">Typ</label>
                <select
                  value={tab === 'passes' ? 'MYTHIC_PASS' : 'USERNAME'}
                  onChange={e => setTab(e.target.value === 'MYTHIC_PASS' ? 'passes' : 'handles')}
                  className="glass-input"
                >
                  <option value="MYTHIC_PASS">🌈 Mythic Pass</option>
                  <option value="USERNAME">🏷️ Handle</option>
                </select>
              </div>

              {tab === 'passes' && (
                <div>
                  <label className="text-sm text-text-secondary block mb-1">Vyberte pass</label>
                  {availPasses.length === 0 ? (
                    <p className="text-sm text-text-muted">Nemáte žádné dostupné passy.</p>
                  ) : (
                    <select value={sellPassId} onChange={e => setSellPassId(e.target.value)} className="glass-input">
                      <option value="">— Vyberte —</option>
                      {availPasses.map((p: any) => (
                        <option key={p.id} value={p.id}>Pass #{p.id.slice(-6)}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {tab === 'handles' && (
                <div>
                  <label className="text-sm text-text-secondary block mb-1">Vyberte handle</label>
                  {myHandles.filter((h: any) => new Date() >= new Date(h.canSellAt)).length === 0 ? (
                    <p className="text-sm text-text-muted">Žádný handle není připraven k prodeji (24h cooldown).</p>
                  ) : (
                    <select value={sellHandleId} onChange={e => setSellHandleId(e.target.value)} className="glass-input">
                      <option value="">— Vyberte —</option>
                      {myHandles.filter((h: any) => new Date() >= new Date(h.canSellAt)).map((h: any) => (
                        <option key={h.id} value={h.id}>@{h.handle}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="text-sm text-text-secondary block mb-1">Cena (ST)</label>
                <input type="number" min="1" step="0.5" value={sellPrice} onChange={e => setSellPrice(e.target.value)} className="glass-input" placeholder={isAuction ? "Počáteční cena" : "Pevná cena"} />
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <input 
                  type="checkbox" 
                  id="isAuction"
                  checked={isAuction} 
                  onChange={e => setIsAuction(e.target.checked)} 
                  className="w-4 h-4 accent-st-gold"
                />
                <label htmlFor="isAuction" className="text-sm font-bold text-st-gold cursor-pointer select-none">
                  ⚡ Formát Aukce
                </label>
              </div>

              {isAuction && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Doba trvání (hodiny)</label>
                    <select value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="glass-input">
                      <option value="1">1 hodina</option>
                      <option value="6">6 hodin</option>
                      <option value="12">12 hodin</option>
                      <option value="24">24 hodin (1 den)</option>
                      <option value="48">48 hodin (2 dny)</option>
                      <option value="72">72 hodin (3 dny)</option>
                      <option value="168">168 hodin (7 dní)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-text-secondary block mb-1">Minimální příhoz (ST)</label>
                    <input type="number" min="0.1" step="0.1" value={increment} onChange={e => setIncrement(e.target.value)} className="glass-input" />
                  </div>
                  <p className="text-[10px] text-text-muted italic">
                    * Bids placed in the last 5 minutes extend the auction by 5 more minutes.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowSell(false); setIsAuction(false); }} className="btn-secondary flex-1 py-2 text-sm">Zrušit</button>
                <button onClick={handleCreateListing} className="btn-primary flex-1 py-2 text-sm">Vytvořit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Handle Modal */}
      {showHandleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHandleModal(false)}>
          <div className="glass-card-static p-6 w-full max-w-sm mx-4 rounded-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Vytvořit handle</h3>
            <p className="text-sm text-text-muted mb-4">Cena: <span className="text-st-gold font-mono">2 ST</span> · Max 3 handlery · Prodej po 24h</p>
            <div className="space-y-4">
              <div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-mono">@</span>
                  <input
                    type="text"
                    value={newHandle}
                    onChange={e => setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="glass-input pl-8"
                    placeholder="vashandle"
                    maxLength={20}
                    autoComplete="off"
                  />
                </div>
                {newHandle.length >= 3 && !checkingAvail && handleAvail !== null && (
                  <p className={`text-xs mt-1 ${handleAvail ? 'text-emerald-400' : 'text-red-400'}`}>
                    {handleAvail ? '✅ Dostupný' : '❌ Obsazený'}
                  </p>
                )}
                {checkingAvail && <p className="text-xs mt-1 text-text-muted">Kontroluji...</p>}
              </div>
              {handleError && <p className="text-xs text-red-400">{handleError}</p>}
              <p className="text-xs text-text-muted">3–20 znaků, pouze a–z, 0–9, podtržítko</p>
              <div className="flex gap-3">
                <button onClick={() => { setShowHandleModal(false); setNewHandle(''); setHandleAvail(null); setHandleError(''); }} className="btn-secondary flex-1 py-2 text-sm">Zrušit</button>
                <button onClick={handleCreateHandle} className="btn-primary flex-1 py-2 text-sm" disabled={!handleAvail || !newHandle}>
                  Vytvořit (−2 ST)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
