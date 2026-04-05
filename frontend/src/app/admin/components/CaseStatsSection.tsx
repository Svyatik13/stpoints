'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Props {
  onMessage: (type: 'success' | 'error', text: string) => void;
}

export default function CaseStatsSection({ onMessage }: Props) {
  const [cases, setCases] = useState<any[]>([]);

  useEffect(() => {
    api.admin.getCaseStats().then(d => setCases(d.cases)).catch(() => {});
  }, []);

  const totalRevenue = cases.reduce((s, c) => s + parseFloat(c.revenue), 0);
  const totalRewards = cases.reduce((s, c) => s + parseFloat(c.rewardsPaid), 0);
  const totalOpenings = cases.reduce((s, c) => s + c.totalOpenings, 0);

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold flex items-center gap-2">📉 Case Analytics</h2>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Celkem otevření', value: totalOpenings, color: 'text-st-cyan' },
          { label: 'Tržby', value: `${totalRevenue.toFixed(2)} ST`, color: 'text-st-emerald' },
          { label: 'Vyplaceno', value: `${totalRewards.toFixed(2)} ST`, color: 'text-st-purple' },
          { label: 'Profit', value: `${(totalRevenue - totalRewards).toFixed(2)} ST`, color: totalRevenue >= totalRewards ? 'text-st-emerald' : 'text-st-red' },
        ].map(s => (
          <div key={s.label} className="glass-card-static p-4">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Per-case breakdown */}
      <div className="space-y-3">
        {cases.map(c => {
          const profit = parseFloat(c.revenue) - parseFloat(c.rewardsPaid);
          return (
            <div key={c.id} className="glass-card-static p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📦</span>
                  <div>
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-text-muted text-xs">
                      {c.isDaily ? '🎁 Denní' : `💰 ${parseFloat(c.price).toFixed(0)} ST`}
                      {' · '}{c.itemCount} předmětů
                      {!c.isActive && ' · ⚫ Skrytý'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold font-mono text-st-cyan">{c.totalOpenings}× otevřen</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider">Tržby</p>
                  <p className="text-sm font-bold font-mono text-st-emerald">{parseFloat(c.revenue).toFixed(2)} ST</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider">Vyplaceno</p>
                  <p className="text-sm font-bold font-mono text-st-purple">{parseFloat(c.rewardsPaid).toFixed(2)} ST</p>
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <p className="text-text-muted text-[10px] uppercase tracking-wider">Profit</p>
                  <p className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-st-emerald' : 'text-st-red'}`}>{profit >= 0 ? '+' : ''}{profit.toFixed(2)} ST</p>
                </div>
              </div>

              {c.topItem && (
                <p className="mt-2 text-xs text-text-muted">🏆 Nejčastější výhra: <span className="text-text-primary font-semibold">{c.topItem.label}</span> ({c.topItem.count}×)</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
