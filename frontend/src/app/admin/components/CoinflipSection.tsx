'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Props {
  onMessage: (type: 'success' | 'error', text: string) => void;
}

export default function CoinflipSection({ onMessage }: Props) {
  const [games, setGames] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    try {
      const d = await api.admin.getCoinflips(filter === 'all' ? undefined : filter);
      setGames(d.games);
      setStats(d.stats);
    } catch {}
  }

  async function handleCancel(gameId: string) {
    if (!window.confirm('Opravdu zrušit tuto hru? Sázka bude vrácena.')) return;
    setLoading(true);
    try {
      await api.admin.cancelCoinflip(gameId);
      onMessage('success', 'Hra zrušena, sázka vrácena.');
      load();
    } catch (err: any) { onMessage('error', err.message); }
    setLoading(false);
  }

  const statusColors: Record<string, string> = {
    WAITING: 'bg-st-gold-dim text-st-gold',
    FINISHED: 'bg-st-emerald-dim text-st-emerald',
    CANCELLED: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2">🎰 Coinflip Oversight</h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.status} className="glass-card-static p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">{s.status}</p>
            <p className="text-xl font-bold font-mono text-text-primary">{s.count}</p>
            <p className="text-xs text-text-muted font-mono">{parseFloat(s.totalAmount).toFixed(2)} ST</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'WAITING', 'FINISHED'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${filter === f ? 'bg-st-cyan-dim text-st-cyan border border-st-cyan/20' : 'bg-white/[0.04] text-text-secondary border border-transparent'}`}>
            {f === 'all' ? 'Všechny' : f}
          </button>
        ))}
      </div>

      {/* Games table */}
      <div className="glass-card-static overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-glass-border">
                <th className="text-left p-4 text-text-muted text-xs uppercase tracking-wider">Hráč</th>
                <th className="text-right p-4 text-text-muted text-xs uppercase tracking-wider">Sázka</th>
                <th className="text-center p-4 text-text-muted text-xs uppercase tracking-wider">Stav</th>
                <th className="text-center p-4 text-text-muted text-xs uppercase tracking-wider">Výsledek</th>
                <th className="text-right p-4 text-text-muted text-xs uppercase tracking-wider">Akce</th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id} className="border-b border-glass-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <p className="font-semibold">{g.creator?.username}</p>
                    {g.joiner && <p className="text-text-muted text-xs">vs {g.joiner.username}</p>}
                  </td>
                  <td className="p-4 text-right font-mono font-semibold text-st-cyan">{parseFloat(g.amount).toFixed(2)} ST</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[g.status] || ''}`}>{g.status}</span>
                  </td>
                  <td className="p-4 text-center text-sm">{g.result ? (g.result === 'heads' ? '🪙' : '🔵') : '—'}</td>
                  <td className="p-4 text-right">
                    {g.status === 'WAITING' && (
                      <button onClick={() => handleCancel(g.id)} disabled={loading}
                        className="px-3 py-1.5 text-xs rounded-lg bg-st-red-dim text-st-red font-semibold disabled:opacity-40">🚫 Zrušit</button>
                    )}
                  </td>
                </tr>
              ))}
              {games.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-text-muted">Žádné hry</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
