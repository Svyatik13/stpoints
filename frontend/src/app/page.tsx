'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import STChart from '@/components/STChart';
import PortfolioManager from '@/components/PortfolioManager';
import { TrendingUp, Users, Shield, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src="/logo.png" alt="ST-Points Logo" className="w-16 h-16 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 animate-fade-up">
        <div>
          <h1 className="text-4xl font-black flex items-center gap-3">
            ST-Points
            <span className="bg-st-cyan/20 text-st-cyan text-xs px-2 py-1 rounded border border-st-cyan/30 uppercase tracking-wider">
              Live Exchange
            </span>
          </h1>
          <p className="text-text-secondary mt-1">Elitní digitální aktiva & real-time trading simulátor</p>
        </div>
        
        {!user && (
          <div className="flex gap-3">
            <Link href="/auth/login" className="btn-secondary">Přihlásit</Link>
            <Link href="/auth/register" className="btn-primary">Registrace</Link>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
        
        {/* Left/Center: Chart (Dominant) */}
        <div className="lg:col-span-2">
          <STChart />
        </div>

        {/* Right: Portfolio & Actions */}
        <div className="flex flex-col gap-6">
          {user ? (
            <PortfolioManager />
          ) : (
            <div className="glass-card p-6 flex flex-col items-center justify-center text-center gap-4 h-full border-dashed border-2 border-white/10 hover:border-st-cyan/50 transition-colors">
              <Shield className="w-12 h-12 text-text-muted mb-2" />
              <h3 className="text-xl font-bold">Připojte se k burze</h3>
              <p className="text-text-muted text-sm">Pro přístup k portfoliu a těžbě ST se musíte přihlásit.</p>
              <Link href="/auth/register" className="btn-primary w-full flex justify-center items-center gap-2 mt-2">
                Vytvořit účet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Gamification / Info Widget */}
          <div className="glass-card p-6 border-t-4 border-t-st-purple">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-st-purple" />
              Proč držet ST?
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-st-cyan mt-1.5 shrink-0" />
                <p>Nákup vzácných předmětů a Mythic Passů na komunitním tržišti.</p>
              </li>
              <li className="flex items-start gap-2 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-st-purple mt-1.5 shrink-0" />
                <p>Odemknutí prémiových funkcí a vyšších levelů na ZČU Central Node.</p>
              </li>
              <li className="flex items-start gap-2 text-sm text-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-st-gold mt-1.5 shrink-0" />
                <p>Deflační tokenomika – těžba se postupně stává obtížnější.</p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
