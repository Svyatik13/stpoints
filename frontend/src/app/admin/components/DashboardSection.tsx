'use client';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  stats: any;
  passCode: any;
  onMessage: (type: 'success' | 'error', text: string) => void;
  onRefresh: () => void;
}

export default function DashboardSection({ stats, passCode, onMessage, onRefresh }: Props) {
  const [pcLoading, setPcLoading] = useState(false);
  const [maxUses, setMaxUses] = useState(1);

  if (!stats) return <div className="h-40 rounded-xl bg-white/[0.02] animate-pulse" />;

  return (
    <div className="space-y-5">
      {/* ... KPI and Balance Cards remain same ... */}
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Uživatelé', value: stats.totalUsers, icon: '👥', color: 'text-st-cyan' },
          { label: 'Aktivní (24h)', value: stats.activeUsers24h, icon: '🟢', color: 'text-st-emerald' },
          { label: 'Transakce (24h)', value: stats.recentTransactions24h, icon: '📈', color: 'text-st-purple' },
          { label: 'ST-Drops', value: stats.giveawayCount, icon: '🎁', color: 'text-st-gold' },
        ].map(s => (
          <div key={s.label} className="glass-card-static p-5">
            <div className="flex items-center gap-2 mb-2">
              <span>{s.icon}</span>
              <span className="text-text-muted text-xs uppercase tracking-wider">{s.label}</span>
            </div>
            <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Celkový Zůstatek', value: `${parseFloat(stats.totalBalance).toFixed(4)} ST`, color: 'text-st-cyan' },
          { label: 'Celkem Odtěženo', value: `${parseFloat(stats.totalMined).toFixed(4)} ST`, color: 'text-st-purple' },
          { label: 'Celkem Giveaway', value: `${parseFloat(stats.totalGiveaways).toFixed(4)} ST`, color: 'text-st-gold' },
        ].map(s => (
          <div key={s.label} className="glass-card-static p-5">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-2">{s.label}</p>
            <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pass Code */}
      <div className="glass-card p-6 space-y-4" style={{ borderColor: 'rgba(168,85,247,0.25)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-st-purple-dim flex items-center justify-center text-xl">🔐</div>
            <div>
              <p className="font-bold text-sm">Přístupový kód</p>
              <p className="text-text-muted text-xs">Aktivní registrace ({passCode?.currentUses || 0} / {passCode?.maxUses || 1})</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
              <label className="text-[10px] text-text-muted uppercase font-bold px-1">Max Použití</label>
              <input 
                type="number" 
                min={1} 
                value={maxUses} 
                onChange={e => setMaxUses(parseInt(e.target.value) || 1)}
                className="w-16 h-8 bg-black/40 border border-white/10 rounded-lg text-center text-sm font-mono focus:border-st-purple/50 outline-none"
              />
            </div>
            <button
              onClick={async () => {
                setPcLoading(true);
                try {
                  await api.admin.regeneratePassCode(maxUses);
                  onRefresh();
                  onMessage('success', `Nový kód vygenerován na ${maxUses} použití`);
                } catch (err: any) { onMessage('error', err.message); }
                setPcLoading(false);
              }}
              disabled={pcLoading}
              className="px-3 py-1.5 h-8 mt-4 text-xs rounded-lg bg-st-purple-dim text-st-purple font-semibold hover:bg-st-purple/20 transition-colors disabled:opacity-40"
            >🔄 Nový kód</button>
          </div>
        </div>
        {passCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-black/30 border border-st-purple/30 rounded-xl p-4 text-center">
              <p className="text-4xl font-black font-mono tracking-[0.3em] text-st-purple" style={{ textShadow: '0 0 20px rgba(168,85,247,0.5)' }}>
                {passCode.code}
              </p>
              {passCode.currentUses >= passCode.maxUses && (
                <p className="text-st-red text-[10px] font-bold mt-1 uppercase tracking-widest">⚠️ VYPRŠELO</p>
              )}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(passCode.code); onMessage('success', 'Zkopírováno!'); }}
              className="px-3 py-2 text-xs rounded-xl bg-white/5 text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
            >📋</button>
          </div>
        ) : <div className="h-16 rounded-xl bg-black/20 animate-pulse" />}
        {passCode?.history?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Posledních 5 kódů</p>
            {passCode.history.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03] text-xs">
                <span className="font-mono text-text-muted w-16 tracking-widest">{h.code}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${h.type === 'ADMIN_CHANGED' ? 'bg-st-gold-dim text-st-gold' : 'bg-st-cyan-dim text-st-cyan'}`}>
                  {h.type === 'ADMIN_CHANGED' ? '🔑 Admin' : '✓ Použit'}
                </span>
                <span className="text-text-secondary flex-1 truncate">{h.usedBy || '—'}</span>
                <span className="text-text-muted">{new Date(h.createdAt).toLocaleString('cs-CZ', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
