'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Props {
  userId: string;
  onClose: () => void;
}

export default function UserDetailModal({ userId, onClose }: Props) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'overview'|'transactions'|'investments'|'mining'>('overview');

  useEffect(() => {
    api.admin.getUserDetail(userId).then(setData).catch(() => {});
  }, [userId]);

  if (!data) return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass-card p-8 relative z-10 animate-fade-up"><div className="w-8 h-8 border-2 border-st-cyan border-t-transparent rounded-full animate-spin mx-auto" /></div>
    </div>
  );

  const u = data.user;
  const c = u._count;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass-card p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto relative z-10 animate-fade-up" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-st-cyan-dim flex items-center justify-center text-st-cyan font-bold text-lg">{u.username.charAt(0).toUpperCase()}</div>
            <div>
              <p className="font-bold text-lg">{u.username}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'ADMIN' ? 'bg-st-red-dim text-st-red' : 'bg-st-cyan-dim text-st-cyan'}`}>{u.role}</span>
                {!u.isActive && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-st-red-dim text-st-red">BAN</span>}
                {u.activeTitle && <span className="text-text-muted text-xs">🏷️ {u.activeTitle}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-muted hover:text-text-primary">✕</button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-5">
          {[
            { l: 'Zůstatek', v: `${parseFloat(u.balance).toFixed(4)} ST`, c: 'text-st-cyan' },
            { l: 'Těžba', v: c.miningChallenges, c: 'text-st-purple' },
            { l: 'Výhry', v: c.giveawayWins, c: 'text-st-gold' },
            { l: 'Cases', v: c.caseOpenings, c: 'text-st-emerald' },
            { l: 'Streak', v: `${u.loginStreak}d`, c: 'text-st-cyan' },
          ].map(s => (
            <div key={s.l} className="bg-white/[0.03] rounded-lg p-2.5 text-center">
              <p className="text-text-muted text-[9px] uppercase tracking-wider">{s.l}</p>
              <p className={`text-sm font-bold font-mono ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 mb-5 text-xs">
          <div className="bg-white/[0.03] rounded-lg p-2.5"><span className="text-text-muted">Registrace:</span> <span className="font-mono">{new Date(u.createdAt).toLocaleDateString('cs-CZ')}</span></div>
          <div className="bg-white/[0.03] rounded-lg p-2.5"><span className="text-text-muted">Poslední aktivita:</span> <span className="font-mono">{u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString('cs-CZ', {dateStyle:'short',timeStyle:'short'}) : '—'}</span></div>
          <div className="bg-white/[0.03] rounded-lg p-2.5"><span className="text-text-muted">Transakce:</span> <span className="font-mono">{c.sentTransactions} ↑ / {c.receivedTransactions} ↓</span></div>
          <div className="bg-white/[0.03] rounded-lg p-2.5"><span className="text-text-muted">Referrals:</span> <span className="font-mono">{u.referralCount}</span></div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {(['transactions','investments','mining'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${tab === t ? 'bg-st-cyan-dim text-st-cyan' : 'bg-white/[0.04] text-text-muted'}`}>
              {t === 'transactions' ? '💳 Transakce' : t === 'investments' ? '📈 Investice' : '⛏ Těžba'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'transactions' && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {data.transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] text-xs">
                <div className="flex-1 min-w-0">
                  <span className="text-text-muted font-mono">{t.type}</span>
                  <p className="text-text-secondary truncate">{t.description || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="font-mono font-semibold text-st-cyan">{parseFloat(t.amount).toFixed(4)} ST</p>
                  <p className="text-text-muted">{new Date(t.createdAt).toLocaleString('cs-CZ',{dateStyle:'short',timeStyle:'short'})}</p>
                </div>
              </div>
            ))}
            {data.transactions.length === 0 && <p className="text-text-muted text-center py-4">Žádné transakce</p>}
          </div>
        )}

        {tab === 'investments' && (
          <div className="space-y-2">
            {data.investments.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.03] text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-st-cyan">{inv.stock.symbol}</span>
                  <span className="text-text-muted">{inv.stock.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono">{parseFloat(inv.shares).toFixed(4)} shares</p>
                  <p className="text-text-muted">{parseFloat(inv.amount).toFixed(2)} ST invested</p>
                </div>
              </div>
            ))}
            {data.investments.length === 0 && <p className="text-text-muted text-center py-4">Žádné investice</p>}
          </div>
        )}

        {tab === 'mining' && (
          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {data.mining.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] text-xs">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'SOLVED' ? 'bg-st-emerald-dim text-st-emerald' : m.status === 'PENDING' ? 'bg-st-gold-dim text-st-gold' : 'bg-gray-500/20 text-gray-400'}`}>{m.status}</span>
                <span className="font-mono text-st-cyan">{m.reward ? `${parseFloat(m.reward).toFixed(6)} ST` : '—'}</span>
                <span className="text-text-muted">{new Date(m.issuedAt).toLocaleString('cs-CZ',{dateStyle:'short',timeStyle:'short'})}</span>
              </div>
            ))}
            {data.mining.length === 0 && <p className="text-text-muted text-center py-4">Žádná těžba</p>}
          </div>
        )}
      </div>
    </div>
  );
}
