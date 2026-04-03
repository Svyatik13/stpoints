'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function ActivityFeed() {
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.activity.list();
        setEvents(res.events);
      } catch (e) {
        console.error('Failed to load activity:', e);
      }
    };
    load();
    const interval = setInterval(load, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="w-full bg-black/40 border-y border-white/5 py-1.5 overflow-hidden whitespace-nowrap relative group">
      <div className="flex animate-marquee hover:pause gap-8">
        {[...events, ...events].map((ev, i) => (
          <div key={i} className="inline-flex items-center gap-2 text-[11px] font-medium tracking-tight">
            <span className="text-st-gold opacity-80 uppercase text-[9px] font-bold border border-st-gold/30 px-1 rounded">
              {ev.type}
            </span>
            <span className="text-text-secondary">
              {renderEvent(ev)}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function renderEvent(ev: any) {
  const p = ev.payload;
  switch (ev.type) {
    case 'BID':
      return <><strong className="text-st-cyan">{p.username}</strong> přihodil <strong className="text-st-gold">{p.amount} ST</strong> na {p.item}</>;
    case 'STAKE':
      return <><strong className="text-st-cyan">{p.username}</strong> uzamkl <strong className="text-st-gold">{p.amount} ST</strong> do trezoru na {p.duration}d</>;
    case 'TIP':
      return <><strong className="text-st-cyan">{p.from}</strong> poslal spropitné <strong className="text-st-gold">{p.amount} ST</strong> uživateli {p.to}</>;
    case 'WIN':
      return <><strong className="text-st-cyan">{p.winner}</strong> vyhrál {p.item} v aukci za {p.amount} ST</>;
    case 'CASE_OPENING':
      return <><strong className="text-st-cyan">{p.username}</strong> otevřel bednu a získal {p.reward}</>;
    default:
      return JSON.stringify(p);
  }
}
