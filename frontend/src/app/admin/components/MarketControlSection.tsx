'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Props {
  onMessage: (type: 'success' | 'error', text: string) => void;
}

export default function MarketControlSection({ onMessage }: Props) {
  const [stocks, setStocks] = useState<any[]>([]);
  const [tradingPaused, setTradingPaused] = useState(false);
  const [editPrice, setEditPrice] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const d = await api.admin.getMarketStocks();
      setStocks(d.stocks);
      setTradingPaused(d.tradingPaused);
    } catch {}
  }

  async function handleSetPrice(stockId: string) {
    const price = editPrice[stockId];
    if (!price || parseFloat(price) <= 0) return;
    setLoading(true);
    try {
      await api.admin.setStockPrice(stockId, price);
      onMessage('success', `Cena nastavena na ${price}`);
      setEditPrice(p => { const n = { ...p }; delete n[stockId]; return n; });
      load();
    } catch (err: any) { onMessage('error', err.message); }
    setLoading(false);
  }

  async function handleToggleTrading() {
    setLoading(true);
    try {
      await api.admin.toggleTrading(!tradingPaused);
      setTradingPaused(!tradingPaused);
      onMessage('success', tradingPaused ? 'Trading obnoven!' : 'Trading pozastaven!');
    } catch (err: any) { onMessage('error', err.message); }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">📈 Market Control</h2>
        <button
          onClick={handleToggleTrading}
          disabled={loading}
          className={`px-4 py-2 text-sm rounded-xl font-semibold transition-colors ${tradingPaused ? 'bg-st-emerald-dim text-st-emerald' : 'bg-st-red-dim text-st-red'}`}
        >
          {tradingPaused ? '▶ Obnovit Trading' : '⏸ Pozastavit Trading'}
        </button>
      </div>

      {tradingPaused && (
        <div className="glass-card-static p-4 border-st-red/30" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <p className="text-st-red text-sm font-semibold">⚠️ Trading je aktuálně pozastaven. Uživatelé nemohou obchodovat.</p>
        </div>
      )}

      <div className="space-y-3">
        {stocks.map(s => {
          const change = s.lastPrice > 0 ? ((parseFloat(s.currentPrice) - parseFloat(s.lastPrice)) / parseFloat(s.lastPrice) * 100) : 0;
          const isEditing = editPrice[s.id] !== undefined;
          return (
            <div key={s.id} className="glass-card-static p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-st-cyan-dim flex items-center justify-center font-bold text-st-cyan text-sm">{s.symbol}</div>
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-text-muted text-xs">{s.investorCount} investorů · {parseFloat(s.totalInvested).toFixed(2)} ST investováno</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold font-mono text-st-cyan">{parseFloat(s.currentPrice).toFixed(2)}</p>
                  <p className={`text-xs font-mono ${change >= 0 ? 'text-st-emerald' : 'text-st-red'}`}>
                    {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      step="0.01"
                      value={editPrice[s.id]}
                      onChange={e => setEditPrice(p => ({ ...p, [s.id]: e.target.value }))}
                      className="glass-input text-sm flex-1"
                      placeholder="Nová cena..."
                    />
                    <button onClick={() => handleSetPrice(s.id)} disabled={loading} className="px-3 py-1.5 text-xs rounded-lg bg-st-emerald-dim text-st-emerald font-semibold disabled:opacity-40">💾 Uložit</button>
                    <button onClick={() => setEditPrice(p => { const n = { ...p }; delete n[s.id]; return n; })} className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-text-muted">✕</button>
                  </>
                ) : (
                  <button onClick={() => setEditPrice(p => ({ ...p, [s.id]: s.currentPrice }))} className="px-3 py-1.5 text-xs rounded-lg bg-st-cyan-dim text-st-cyan font-semibold">✏️ Nastavit cenu</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
