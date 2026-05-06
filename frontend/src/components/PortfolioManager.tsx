'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import Link from 'next/link';

export default function PortfolioManager() {
  const { user } = useAuth();

  if (!user) return null;

  // Fake profit for gamification (e.g. +X% based on some logic, or just a static nice number until we have real history)
  const isProfit = true;
  const profitPercentage = "+12.4%";
  const profitValue = "+ 450.20 ST";

  return (
    <div className="glass-card p-6 flex flex-col gap-6">
      <div>
        <h3 className="text-text-muted text-sm font-bold uppercase mb-1 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-st-cyan" />
          Vaše ST Portfolio
        </h3>
        <div className="flex items-end gap-3 mt-2">
          <span className="text-4xl font-black text-white">
            {Number(user.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-st-cyan font-bold mb-1">ST</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-text-muted text-xs uppercase font-bold">All-time Profit</span>
          <div className={`flex items-center gap-1.5 font-bold ${isProfit ? 'text-st-green' : 'text-st-red'}`}>
            {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="text-lg">{profitPercentage}</span>
          </div>
          <span className="text-text-muted text-xs">{profitValue}</span>
        </div>

        <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col gap-1">
          <span className="text-text-muted text-xs uppercase font-bold">Aktivita Dnes</span>
          <div className="flex items-center gap-1.5 text-st-gold font-bold">
            <Activity className="w-4 h-4" />
            <span className="text-lg">Vysoká</span>
          </div>
          <span className="text-text-muted text-xs">Trh je otevřen</span>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <Link href="/mining" className="btn-primary flex-1 flex justify-center items-center gap-2">
          <Clock className="w-4 h-4" />
          Těžit další ST
        </Link>
        <Link href="/market" className="btn-secondary flex-1 flex justify-center items-center gap-2">
          Tržiště
        </Link>
      </div>
    </div>
  );
}
