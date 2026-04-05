'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/hooks/useAuth';

export default function RiskCoinPage() {
  const { user, refreshUser } = useAuth();
  const [price, setPrice] = useState<string>('1.000000');
  const [history, setHistory] = useState<any[]>([]);
  const [amountST, setAmountST] = useState('');
  const [amountCoins, setAmountCoins] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const lastPriceRef = useRef<string>('1.000000');

  const fetchData = useCallback(async () => {
    try {
      const data = await api.riskcoin.live();
      setPrice(data.currentPrice);
      setHistory(data.history);
      lastPriceRef.current = data.currentPrice;
    } catch (e: any) {
      console.error('RiskCoin fetch failed:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 500); // Ultra fast refresh matching engine
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleBuy = async () => {
    if (!amountST || parseFloat(amountST) <= 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.riskcoin.buy(amountST);
      setSuccess(`Nakoupeno ${parseFloat(res.sharesBought).toFixed(4)} Risk-Coinů!`);
      setAmountST('');
      refreshUser();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSell = async () => {
    if (!amountCoins || parseFloat(amountCoins) <= 0) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.riskcoin.sell(amountCoins);
      setSuccess(`Prodáno za ${parseFloat(res.stReceived).toFixed(2)} ST!`);
      setAmountCoins('');
      refreshUser();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const currentRCBalance = (user as any).riskCoinBalance || '0';
  const isUp = history.length > 1 && parseFloat(price) >= parseFloat(history[history.length - 2].price);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-6 animate-fade-up">
        {/* Header */}
        <div className="glass-card-static p-8 border-st-red/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-st-red/5 blur-3xl -mr-20 -mt-20 group-hover:bg-st-red/10 transition-colors duration-1000" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-st-red rounded-2xl flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
                  ☣️
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter italic">RISK-COIN</h1>
              </div>
              <p className="text-text-muted text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-st-red rounded-full animate-ping" />
                EXTRÉMNÍ VOLATILITA • AKTUALIZACE 500ms
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">AKTUÁLNÍ KURZ</p>
              <p className={`text-5xl font-mono font-black tracking-tighter ${isUp ? 'text-emerald-400' : 'text-st-red'} transition-colors duration-150`}>
                {parseFloat(price).toFixed(6)} <span className="text-xl opacity-50">ST</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Area */}
          <div className="lg:col-span-2 glass-card-static p-6 h-[450px] flex flex-col border-white/5 bg-black/40">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Live Performance (Last 50 ticks)</h3>
                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[9px] font-black text-white uppercase tracking-widest">
                  FEE: 2.0%
                </div>
             </div>
             
             <div className="flex-1 relative">
                <svg className="w-full h-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0.2" />
                      <stop offset="100%" stopColor={isUp ? '#10b981' : '#ef4444'} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid */}
                  <line x1="0" y1="75" x2="1000" y2="75" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                  <line x1="0" y1="150" x2="1000" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />
                  <line x1="0" y1="225" x2="1000" y2="225" stroke="rgba(255,255,255,0.03)" strokeDasharray="4 4" />

                  {history.length > 1 && (
                    <>
                      <path
                        fill="url(#riskGradient)"
                        d={`M 0 300 ${history.map((h, i) => {
                          const prices = history.map(p => parseFloat(p.price));
                          const min = Math.min(...prices);
                          const max = Math.max(...prices);
                          const range = max - min || 1;
                          const x = (i / (history.length - 1)) * 1000;
                          const y = 280 - ((parseFloat(h.price) - min) / range) * 260;
                          return `L ${x} ${y}`;
                        }).join(' ')} L 1000 300 Z`}
                        className="transition-all duration-300 ease-linear"
                      />
                      <polyline
                        fill="none"
                        stroke={isUp ? '#10b981' : '#ef4444'}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={history.map((h, i) => {
                          const prices = history.map(p => parseFloat(p.price));
                          const min = Math.min(...prices);
                          const max = Math.max(...prices);
                          const range = max - min || 1;
                          const x = (i / (history.length - 1)) * 1000;
                          const y = 280 - ((parseFloat(h.price) - min) / range) * 260;
                          return `${x},${y}`;
                        }).join(' ')}
                        className="transition-all duration-300 ease-linear shadow-lg"
                      />
                    </>
                  )}
                </svg>
             </div>
          </div>

          {/* Trade Panel */}
          <div className="space-y-6">
            <div className="glass-card-static p-6 border-white/10 bg-gradient-to-br from-[#0f172a] to-black">
              <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex justify-between items-center">
                <span>TRADING</span>
                <span className="text-[10px] text-text-muted">Balance: {parseFloat(user.balance).toFixed(2)} ST</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-2 px-1">Nakoupit za (ST)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={amountST} 
                      onChange={e => setAmountST(e.target.value)} 
                      className="glass-input text-xl font-mono p-4 pr-12 focus:border-st-emerald" 
                      placeholder="0.00" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-text-muted text-xs">ST</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleBuy}
                  disabled={loading || !amountST}
                  className="w-full py-4 bg-st-emerald text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  🚀 KOUPIT RISK-COIN
                </button>

                <div className="h-px bg-white/5 my-4" />

                <div>
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest block mb-2 px-1">Prodat (Risk-Coin)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={amountCoins} 
                      onChange={e => setAmountCoins(e.target.value)} 
                      className="glass-input text-xl font-mono p-4 pr-12 focus:border-st-red" 
                      placeholder="0.00" 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-text-muted text-xs">RC</span>
                  </div>
                </div>

                <button 
                  onClick={handleSell}
                  disabled={loading || !amountCoins}
                  className="w-full py-4 bg-st-red text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.2)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  💰 PRODAT RISK-COIN
                </button>
              </div>

              {error && <p className="mt-4 text-center text-st-red text-xs font-bold uppercase animate-shake">{error}</p>}
              {success && <p className="mt-4 text-center text-emerald-400 text-xs font-bold uppercase animate-fade-in">{success}</p>}
            </div>

            <div className="glass-card-static p-6 border-white/10">
               <h3 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">DRŽENÉ AKTIVA</h3>
               <div className="flex justify-between items-center p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                 <div>
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Vlastníte</p>
                    <p className="text-xl font-mono font-black text-white">{parseFloat(currentRCBalance).toFixed(6)} RC</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Hodnota</p>
                    <p className="text-xl font-mono font-black text-st-gold">
                      {(parseFloat(currentRCBalance) * parseFloat(price)).toFixed(2)} ST
                    </p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
