'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { formatDistanceToNowStrict, format } from 'date-fns';
import { cs } from 'date-fns/locale/cs';
import { useToast } from '@/components/ui/Toast';

export default function MarketDetailPageClient({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchListing(true); // Initial load

    const interval = setInterval(() => {
      fetchListing(false); // Background refresh
    }, 5000); // 5 seconds polling for details

    return () => clearInterval(interval);
  }, [id]);

  async function fetchListing(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const res = await api.market.getListing(id);
      setListing(res.listing);
    } catch (e: any) {
      if (showLoading) {
        toast('error', e.message);
        router.push('/market');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleBuy() {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.market.buy(listing.id);
      toast('success', res.message);
      fetchListing();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBid() {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (!bidAmount || parseFloat(bidAmount) <= 0) return;
    setIsSubmitting(true);
    try {
      const res = await api.market.bid(listing.id, bidAmount);
      toast('success', res.message);
      setBidAmount('');
      fetchListing();
    } catch (e: any) {
      toast('error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function TimeLeft({ endsAt }: { endsAt: string | null }) {
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
      if (!endsAt) return;
      const t = setInterval(() => {
        const diff = new Date(endsAt).getTime() - Date.now();
        if (diff <= 0) {
          setTimeLeft('Skončilo');
          clearInterval(t);
        } else {
          setTimeLeft(formatDistanceToNowStrict(new Date(endsAt), { locale: cs }));
        }
      }, 1000);
      return () => clearInterval(t);
    }, [endsAt]);

    if (!endsAt) return null;
    return <div className="text-st-gold font-mono text-2xl font-black">{timeLeft || '...'}</div>;
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex justify-center items-center py-40">
          <div className="w-8 h-8 border-4 border-st-cyan/30 border-t-st-cyan rounded-full animate-spin"></div>
        </div>
      </AppShell>
    );
  }

  if (!listing) return null;

  const currentPrice = parseFloat(listing.currentHighestBid || listing.price);
  const minRequiredBid = listing.bids?.length > 0 
    ? parseFloat(listing.bids[0].amount) + parseFloat(listing.minIncrement || '1') 
    : parseFloat(listing.price);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto animate-fade-up">
        <Link href="/market" className="text-text-muted hover:text-white mb-6 inline-flex items-center gap-2 text-sm transition-colors">
          <span>←</span> Zpět na Tržiště
        </Link>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            <div className="glass-card-static p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 -m-32 w-64 h-64 opacity-20 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: listing.type === 'USERNAME' ? '#06b6d4' : '#a855f7' }}></div>
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl ${listing.type === 'USERNAME' ? 'bg-gradient-to-br from-st-cyan/20 to-st-cyan/5 border border-st-cyan/30' : 'bg-gradient-to-br from-st-purple/20 to-st-purple/5 border border-st-purple/30'}`}>
                  {listing.type === 'USERNAME' ? '👤' : '🎫'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-black text-white">
                      {listing.type === 'USERNAME' ? `@${listing.username?.handle}` : 'Mythic Pass'}
                    </h1>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-st-emerald/10 border border-st-emerald/20 rounded-full">
                      <span className="w-1.5 h-1.5 bg-st-emerald rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-[10px] font-black text-st-emerald uppercase tracking-wider">Live</span>
                    </div>
                  </div>
                  <p className="text-st-gold font-bold">
                    {listing.status === 'SOLD' ? 'Prodané' : listing.isAuction ? 'Aukce' : 'Kup Teď'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-white/5 p-4 rounded-xl border border-white/5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted mb-1">Vlastník</p>
                  <Link href={`/u/${listing.seller.username}`} className="font-bold hover:text-st-cyan transition-colors">
                    {listing.seller.username}
                  </Link>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-text-muted mb-1">Členem od</p>
                  <p className="font-mono text-sm">{format(new Date(listing.seller.createdAt), 'dd.MM.yyyy')}</p>
                </div>
              </div>
            </div>

            {/* Bid History Table */}
            {listing.isAuction && (
              <div className="glass-card-static overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                  <h3 className="font-bold text-lg">Historie příhozů</h3>
                </div>
                <div className="p-0">
                  {listing.bids?.length === 0 ? (
                    <p className="p-6 text-text-muted text-center text-sm">Zatím žádné příhozy. Buďte první!</p>
                  ) : (
                    <table className="w-full text-left">
                      <tbody className="divide-y divide-white/5">
                        {listing.bids?.map((bid: any, i: number) => (
                          <tr key={bid.id} className="hover:bg-white/[0.02]">
                            <td className="px-6 py-4">
                              <Link href={`/u/${bid.bidder.username}`} className="flex items-center gap-2 font-bold hover:text-st-cyan">
                                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                                  {bid.bidder.username.charAt(0).toUpperCase()}
                                </div>
                                {bid.bidder.username}
                              </Link>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm text-text-muted">
                              {format(new Date(bid.createdAt), 'dd.MM. HH:mm:ss')}
                            </td>
                            <td className="px-6 py-4 font-mono font-black text-st-cyan text-right">
                              {parseFloat(bid.amount).toFixed(2)} ST
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="md:col-span-1">
            <div className="glass-card-static p-6 sticky top-24">
              {listing.status === 'SOLD' ? (
                <div className="text-center">
                  <p className="text-7xl mb-4">🤝</p>
                  <h3 className="text-xl font-bold mb-2">Položka byla prodána</h3>
                  <p className="text-text-muted text-sm mb-4">Vítěz: <span className="font-bold text-white">{listing.buyer?.username}</span></p>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-xs uppercase text-text-muted mb-1">Konečná cena</p>
                    <p className="font-mono font-black text-2xl text-st-cyan">{currentPrice.toFixed(2)} ST</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">
                      {listing.isAuction ? 'Aktuální cena' : 'Cena'}
                    </p>
                    <div className="font-mono font-black text-4xl text-st-cyan drop-shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                      {currentPrice.toFixed(2)} ST
                    </div>
                  </div>

                  {listing.endsAt && (
                    <div className="mb-6 p-4 rounded-xl bg-st-gold/10 border border-st-gold/20 text-center">
                      <p className="text-xs font-bold uppercase text-st-gold/70 tracking-widest mb-1">Končí za</p>
                      <TimeLeft endsAt={listing.endsAt} />
                    </div>
                  )}

                  {listing.sellerId === user?.id ? (
                    <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-sm font-bold text-text-muted mb-2">Toto je váš inzerát.</p>
                      {(!listing.isAuction || listing.bids?.length === 0) && (
                        <button className="btn-primary w-full py-2 !bg-st-red/20 !border-st-red/30 !text-st-red hover:!bg-st-red/40 text-sm mt-2">
                          Stáhnout z prodeje
                        </button>
                      )}
                    </div>
                  ) : listing.isAuction ? (
                    <div className="space-y-4">
                      <div>
                        <input
                          type="number"
                          step="1"
                          min={minRequiredBid}
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          placeholder={`Min. ${minRequiredBid} ST`}
                          className="glass-input w-full text-lg font-mono py-3"
                        />
                        <p className="text-xs text-text-muted mt-2 text-right">Zůstatek: {parseFloat(user?.balance || '0').toFixed(2)} ST</p>
                      </div>
                      <button 
                        onClick={handleBid}
                        disabled={isSubmitting || !bidAmount || parseFloat(bidAmount) < minRequiredBid}
                        className="w-full btn-primary py-3 rounded-xl font-bold flex justify-center items-center gap-2 group disabled:opacity-50"
                      >
                        <span className="text-lg">🔨</span> Zvýšit příhoz
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={handleBuy}
                      disabled={isSubmitting || parseFloat(user?.balance || '0') < currentPrice}
                      className="w-full btn-primary py-4 rounded-xl font-black text-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50"
                    >
                      Koupit ihned
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </AppShell>
  );
}
