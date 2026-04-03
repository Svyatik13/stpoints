'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

export default function AffiliatePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  if (!user) return null;

  const referralCount = user.referralCount || 0;
  const nextReward = 20 + referralCount * 5;
  const inviteUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/invite/${user.username}` 
    : `https://stpoints.fun/invite/${user.username}`;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-black tracking-tight">
            Affiliate Program <span className="text-st-cyan">👥</span>
          </h1>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Pozvěte své přátele do sítě ST-Points a získejte odměnu za každého nového člena. Čím více lidí pozvete, tím vyšší jsou vaše bonusy!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 border-st-cyan/20 flex flex-col items-center justify-center text-center">
            <p className="text-text-muted text-xs uppercase font-bold tracking-widest mb-2">Vaše pozvánky</p>
            <p className="text-4xl font-black font-mono text-st-cyan">{referralCount}</p>
          </div>
          <div className="glass-card p-6 border-st-gold/20 flex flex-col items-center justify-center text-center">
            <p className="text-text-muted text-xs uppercase font-bold tracking-widest mb-2">Příští odměna</p>
            <p className="text-4xl font-black font-mono text-st-gold">{nextReward} ST</p>
          </div>
          <div className="glass-card p-6 border-st-emerald/20 flex flex-col items-center justify-center text-center">
            <p className="text-text-muted text-xs uppercase font-bold tracking-widest mb-2">Bonus pro nováčka</p>
            <p className="text-4xl font-black font-mono text-st-emerald">10 ST</p>
          </div>
        </div>

        {/* Invitation Link Card */}
        <div className="glass-card p-8 border-st-purple/20 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-st-purple-dim flex items-center justify-center text-2xl">🔗</div>
            <div>
              <h3 className="text-xl font-bold">Váš unikátní odkaz</h3>
              <p className="text-text-muted text-sm">Sdílejte tento odkaz se svými přáteli</p>
            </div>
          </div>

          <div className="bg-black/30 rounded-2xl p-6 border border-glass-border flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 w-full text-center sm:text-left overflow-x-auto">
              <code className="text-st-cyan font-mono text-lg select-all whitespace-nowrap">
                {inviteUrl}
              </code>
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast('success', 'Odkaz byl zkopírován do schránky!');
              }}
              className="btn-primary w-full sm:w-auto px-8 py-3 flex items-center justify-center gap-2"
            >
              <span>📋</span> Kopírovat
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card-static p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-st-gold">📈</span> Dynamické odměny
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Váš bonus se s každým pozvaným uživatelem zvyšuje! 
              <br /><br />
              • 1. pozvání: <span className="text-text-primary font-bold">20 ST</span>
              <br />
              • 2. pozvání: <span className="text-text-primary font-bold">25 ST</span>
              <br />
              • 3. pozvání: <span className="text-text-primary font-bold">30 ST</span>
              <br />
              • ... a tak dále bez limitu!
            </p>
          </div>
          <div className="glass-card-static p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <span className="text-st-emerald">✨</span> Výhody pro přátele
            </h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Vaši přátelé neodejdou s prázdnou. Pokud použijí váš odkaz, získají okamžitý vstupní bonus <span className="text-st-emerald font-bold">10.000 ST</span> do své peněženky, aby mohli hned začít těžit nebo otevírat bedny.
            </p>
          </div>
        </div>

        {/* Social Share (Placeholder for future) */}
        <div className="text-center py-6">
          <p className="text-text-muted text-sm italic">„Nejlepší způsob, jak získat ST body, je budovat komunitu.“</p>
        </div>
      </div>
    </AppShell>
  );
}
