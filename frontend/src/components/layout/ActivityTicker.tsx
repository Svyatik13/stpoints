'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ACTIVITY_ICONS } from '@/lib/constants';

interface ActivityEvent {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
}

function formatEvent(event: ActivityEvent): string {
  const p = event.payload;
  const icon = ACTIVITY_ICONS[event.type] || '⚡';
  
  switch (event.type) {
    case 'COINFLIP':
      return `${icon} ${p.username} vyhrál ${parseFloat(p.amount).toFixed(2)} ST v coinflip!`;
    case 'CASE':
      return `${icon} ${p.username} otevřel case a získal ${parseFloat(p.amount).toFixed(2)} ST`;
    case 'TIP':
      return `${icon} ${p.from} poslal ${parseFloat(p.amount).toFixed(2)} ST pro ${p.to}`;
    case 'TRANSFER':
      return `${icon} ${p.from} převedl ${parseFloat(p.amount).toFixed(2)} ST`;
    case 'MINING':
      return `${icon} ${p.username} odtěžil ${parseFloat(p.amount).toFixed(4)} ST`;
    case 'GIVEAWAY':
      return `${icon} ${p.username} vyhrál ST-Drop!`;
    case 'STREAK':
      return `🔥 ${p.username} má ${p.streak}-denní streak!`;
    case 'BID':
      return `🔨 ${p.username} nabídl ${parseFloat(p.amount).toFixed(2)} ST na ${p.item}`;
    case 'MYTHIC_WIN':
      return `✨ ${p.username} VYHRÁL MYTHIC PASS V ${p.caseName}!`;
    default:
      return `${icon} ${p.username || 'Někdo'} provedl akci`;
  }
}

function getEventColor(type: string): string {
  switch (type) {
    case 'COINFLIP': return '#eab308';
    case 'CASE': return '#a855f7';
    case 'TIP': return '#10b981';
    case 'TRANSFER': return '#06b6d4';
    case 'MINING': return '#a855f7';
    case 'GIVEAWAY': return '#eab308';
    case 'STREAK': return '#ef4444';
    case 'BID': return '#06b6d4';
    case 'MYTHIC_WIN': return '#facc15';
    default: return '#9ca3af';
  }
}

export default function ActivityTicker() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    // Initial load
    api.activity?.feed?.()
      .then((res: any) => setEvents(res?.events || []))
      .catch(() => {});

    // Poll every 10s
    const interval = setInterval(async () => {
      try {
        const res = await api.activity?.feed?.();
        if (res?.events) setEvents(res.events);
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  if (events.length === 0) return null;

  // Double the events for seamless loop
  const displayEvents = [...events, ...events];

  return (
    <div className="w-full overflow-hidden bg-black/30 border-b border-glass-border/30" style={{ height: 32 }}>
      <div className="activity-ticker flex items-center h-full whitespace-nowrap">
        {displayEvents.map((event, i) => (
          <span
            key={`${event.id}-${i}`}
            className="inline-flex items-center gap-2 mx-6 text-xs font-medium"
            style={{ color: getEventColor(event.type) }}
          >
            <span className="opacity-70">•</span>
            {formatEvent(event)}
          </span>
        ))}
      </div>

      <style jsx>{`
        .activity-ticker {
          animation: ticker ${Math.max(events.length * 4, 20)}s linear infinite;
        }
        .activity-ticker:hover {
          animation-play-state: paused;
        }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
