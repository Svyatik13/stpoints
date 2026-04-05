'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Props {
  onMessage: (type: 'success' | 'error', text: string) => void;
}

export default function BroadcastSection({ onMessage }: Props) {
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.admin.getBroadcast().then(d => { setCurrent(d.message); setDraft(d.message || ''); }).catch(() => {});
  }, []);

  async function send() {
    if (!draft.trim()) return;
    setLoading(true);
    try {
      await api.admin.setBroadcast(draft.trim());
      setCurrent(draft.trim());
      onMessage('success', 'Broadcast odeslán všem uživatelům!');
    } catch (err: any) { onMessage('error', err.message); }
    setLoading(false);
  }

  async function clear() {
    setLoading(true);
    try {
      await api.admin.clearBroadcast();
      setCurrent(null);
      setDraft('');
      onMessage('success', 'Broadcast smazán.');
    } catch (err: any) { onMessage('error', err.message); }
    setLoading(false);
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2">📢 Broadcast Zprávy</h2>
      <p className="text-text-secondary text-sm">Pošlete globální oznámení všem přihlášeným uživatelům. Zpráva se zobrazí jako banner nahoře na stránce.</p>

      {current && (
        <div className="glass-card p-4 border-st-gold/30" style={{ borderColor: 'rgba(234,179,8,0.3)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xl">🔔</span>
              <div>
                <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Aktivní broadcast</p>
                <p className="text-sm font-medium text-st-gold">{current}</p>
              </div>
            </div>
            <button onClick={clear} disabled={loading} className="px-3 py-1.5 text-xs rounded-lg bg-st-red-dim text-st-red font-semibold disabled:opacity-40">✕ Smazat</button>
          </div>
        </div>
      )}

      <div className="glass-card p-5 space-y-4">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Napište zprávu pro všechny uživatele..."
          maxLength={500}
          rows={3}
          className="glass-input w-full resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-text-muted text-xs">{draft.length}/500</span>
          <div className="flex gap-2">
            {['⚠️ Údržba za 5 minut', '🎉 Nový case právě vyšel!', '🔥 Double XP víkend!'].map(q => (
              <button key={q} onClick={() => setDraft(q)} className="px-2 py-1 text-[10px] rounded-lg bg-white/[0.04] text-text-muted hover:text-text-primary hover:bg-white/[0.08] transition-colors">{q.slice(0, 15)}…</button>
            ))}
          </div>
        </div>
        <button onClick={send} disabled={loading || !draft.trim()} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? '⏳ Odesílám...' : '📢 Odeslat Broadcast'}
        </button>
      </div>
    </div>
  );
}
