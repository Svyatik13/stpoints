'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function AuditLogSection() {
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => { load(); }, [page]);

  async function load() {
    try {
      const d = await api.admin.getAuditLog(page);
      setEvents(d.events);
      setTotal(d.pagination.total);
    } catch {}
  }

  const actionIcons: Record<string, string> = {
    BROADCAST_SET: '📢', BROADCAST_CLEARED: '🔇',
    STOCK_PRICE_SET: '📈', TRADING_PAUSED: '⏸', TRADING_RESUMED: '▶',
    COINFLIP_CANCELLED: '🎰', BULK_GRANT: '💰',
  };

  const actionColors: Record<string, string> = {
    BROADCAST_SET: 'text-st-gold', STOCK_PRICE_SET: 'text-st-cyan',
    TRADING_PAUSED: 'text-st-red', TRADING_RESUMED: 'text-st-emerald',
    COINFLIP_CANCELLED: 'text-st-red', BULK_GRANT: 'text-st-purple',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">📋 Audit Log</h2>
        <span className="text-text-muted text-xs">{total} záznamů</span>
      </div>

      <div className="glass-card-static overflow-hidden">
        {events.map((e, i) => {
          const p = e.payload as any;
          return (
            <div key={e.id} className={`flex items-start gap-3 px-5 py-4 ${i < events.length - 1 ? 'border-b border-glass-border/50' : ''}`}>
              <span className="text-lg mt-0.5">{actionIcons[p.action] || '⚙️'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-semibold ${actionColors[p.action] || 'text-text-primary'}`}>{p.action}</span>
                  <span className="text-text-muted text-xs">by</span>
                  <span className="text-sm font-medium text-st-cyan">{p.admin}</span>
                </div>
                <p className="text-text-secondary text-xs mt-0.5 truncate">
                  {p.message && `"${p.message}"`}
                  {p.stock && `${p.stock}: ${p.oldPrice} → ${p.newPrice}`}
                  {p.amount && p.filter && `${p.amount} ST × ${p.usersAffected} uživatelů (${p.filter})`}
                  {p.gameId && !p.filter && `Game: ${p.gameId.slice(0, 8)}...`}
                </p>
              </div>
              <span className="text-text-muted text-xs flex-shrink-0">
                {new Date(p.timestamp || e.createdAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}
              </span>
            </div>
          );
        })}
        {events.length === 0 && (
          <div className="p-8 text-center text-text-muted">Žádné záznamy</div>
        )}
      </div>

      {total > 30 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">← Zpět</button>
          <span className="text-text-secondary text-xs px-2">Strana {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={events.length < 30} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">Další →</button>
        </div>
      )}
    </div>
  );
}
