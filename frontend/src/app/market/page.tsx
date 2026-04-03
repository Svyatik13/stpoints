'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function MarketPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'ALL' | 'USERNAME' | 'MYTHIC_PASS'>('ALL');
  const [filter, setFilter] = useState<'ACTIVE' | 'AUCTION' | 'DIRECT' | 'SOLD'>('ACTIVE');
  const [sort, setSort] = useState<'RECENT' | 'PRICE_ASC' | 'PRICE_DESC' | 'ENDING_SOON'>('RECENT');
  
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [activeTab, filter, sort]);

  async function fetchListings() {
    setLoading(true);
    try {
      const type = activeTab === 'ALL' ? undefined : activeTab;
      const res = await api.market.list(type, filter, sort === 'RECENT' ? undefined : sort);
      setListings(res.listings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
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

    if (!endsAt) return <span className="text-text-muted">—</span>;
    return <span className={timeLeft === 'Skončilo' ? 'text-st-red' : 'text-st-gold font-mono'}>{timeLeft || '...'}</span>;
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-up">

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">Tržiště</h1>
            <p className="text-text-secondary">Nakupujte a prodávejte usernames a Mythic Passy. Inspirováno Fragment.com</p>
          </div>
          {user && (
            <Link href="/market/new" className="btn-primary px-6 py-2.5 rounded-xl font-bold flex items-center gap-2">
              <span>+</span> Vystavit
            </Link>
          )}
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {(['ACTIVE', 'AUCTION', 'DIRECT', 'SOLD'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  filter === f ? 'bg-white/10 text-white' : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                {f === 'ACTIVE' && 'Vše K Prodeji'}
                {f === 'AUCTION' && 'Aukce'}
                {f === 'DIRECT' && 'Kup Teď'}
                {f === 'SOLD' && 'Prodané'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 min-w-max">
            <select 
              value={activeTab} 
              onChange={e => setActiveTab(e.target.value as any)}
              className="bg-[#0c1222] border border-white/10 text-sm text-text-primary rounded-lg px-3 py-2 outline-none"
            >
              <option value="ALL">Všechny typy</option>
              <option value="USERNAME">Usernames</option>
              <option value="MYTHIC_PASS">Mythic Passy</option>
            </select>
            
            <select 
              value={sort} 
              onChange={e => setSort(e.target.value as any)}
              className="bg-[#0c1222] border border-white/10 text-sm text-text-primary rounded-lg px-3 py-2 outline-none"
            >
              <option value="RECENT">Nejnovější</option>
              <option value="PRICE_ASC">Nejlevnější</option>
              <option value="PRICE_DESC">Nejdražší</option>
              <option value="ENDING_SOON">Končící brzy</option>
            </select>
          </div>
        </div>

        {/* Fragment-Style Table */}
        <div className="glass-card-static overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-text-muted">Položka</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-text-muted">Typ Prodeje</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-text-muted">Cena</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-text-muted">Čas</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-text-muted text-right">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-text-muted">Načítání tržiště...</td>
                  </tr>
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-text-muted">Žádné inzeráty k zobrazení.</td>
                  </tr>
                ) : (
                  listings.map((l: any) => (
                    <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group cursor-pointer" onClick={() => router.push(`/market/${l.id}`)}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${l.type === 'USERNAME' ? 'bg-st-cyan/10 border border-st-cyan/20' : 'bg-st-purple/10 border border-st-purple/20'}`}>
                            {l.type === 'USERNAME' ? '👤' : '🎫'}
                          </div>
                          <div>
                            <p className="font-bold text-white text-base">
                              {l.type === 'USERNAME' ? `@${l.username?.handle}` : 'Mythic Pass'}
                            </p>
                            <p className="text-xs text-text-muted mt-0.5">
                              Předchozí majitel: {l.seller?.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-5">
                        {l.status === 'SOLD' ? (
                          <span className="inline-block px-2 py-1 bg-st-emerald/10 text-st-emerald text-[10px] uppercase font-bold tracking-wider rounded">Prodané</span>
                        ) : l.isAuction ? (
                          <span className="inline-block px-2 py-1 bg-st-gold/10 text-st-gold text-[10px] uppercase font-bold tracking-wider rounded border border-st-gold/20">Aukce</span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-white/10 text-text-primary text-[10px] uppercase font-bold tracking-wider rounded">Kup Teď</span>
                        )}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="font-mono font-black text-st-cyan text-lg">
                            {parseFloat(l.currentHighestBid || l.price).toFixed(2)} ST
                          </span>
                          {l.isAuction && l.status === 'ACTIVE' && (
                            <span className="text-[10px] text-text-muted font-bold">
                              {l._count?.bids > 0 ? `${l._count.bids} příhozů` : 'Zatím žádný příhoz'}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <TimeLeft endsAt={l.endsAt} />
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 rounded-lg text-sm text-white font-bold transition-all opacity-0 group-hover:opacity-100">
                          Zobrazit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
