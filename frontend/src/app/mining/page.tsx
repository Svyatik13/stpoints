'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useMiner } from '@/hooks/useMiner';
import { api } from '@/lib/api';
import { MiningStats } from '@/types';
import AppShell from '@/components/layout/AppShell';

export default function MiningPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const { isMining, progress, challenge, result, error, hashRate, startMining, stopMining } = useMiner();
  const [stats, setStats] = useState<MiningStats | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadStats();
    }
  }, [user]);

  // Refresh user when mining completes successfully
  useEffect(() => {
    if (result?.success) {
      refreshUser();
      loadStats();
    }
  }, [result]);

  async function loadStats() {
    try {
      const data = await api.mining.stats();
      setStats(data);
    } catch {}
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">⛏️ ZČU Těžební Uzel</h1>
          <p className="text-text-secondary text-sm mt-1">
            Proof-of-Work těžba ST-Points pomocí SHA-256
          </p>
        </div>

        {/* Mining Control */}
        <div className="glass-card p-8 glow-purple">
          <div className="flex flex-col items-center text-center">
            {/* Status Icon */}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${
              isMining 
                ? 'bg-st-purple-dim border-2 border-st-purple animate-pulse-glow' 
                : 'bg-white/[0.04] border-2 border-glass-border'
            }`}>
              <span className="text-4xl">{isMining ? '⚡' : '⛏️'}</span>
            </div>

            <h2 className="text-2xl font-bold mb-2">
              {isMining ? 'Těžba probíhá...' : 'Připraven k těžbě'}
            </h2>
            <p className="text-text-secondary text-sm mb-6 max-w-md">
              {isMining
                ? 'Web Worker řeší SHA-256 hashe v pozadí. UI zůstává plně responzivní.'
                : 'Klikněte na tlačítko pro zahájení. Váš CPU bude řešit kryptografické výzvy.'}
            </p>

            {/* Mining Button */}
            <button
              onClick={isMining ? stopMining : startMining}
              className={`${isMining ? 'btn-danger' : 'btn-primary'} text-lg px-10 py-4`}
              id="mining-toggle"
            >
              {isMining ? '⏹ Zastavit Těžbu' : '▶ Zahájit Těžbu'}
            </button>
          </div>
        </div>

        {/* Mining Dashboard */}
        {(isMining || progress) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hash Rate */}
            <div className="glass-card-static p-5">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Hash Rate</p>
              <p className="text-2xl font-bold font-mono text-st-cyan">
                {hashRate.toLocaleString('cs-CZ')} <span className="text-sm text-text-secondary">H/s</span>
              </p>
            </div>

            {/* Hashes Computed */}
            <div className="glass-card-static p-5">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Hashů Vypočteno</p>
              <p className="text-2xl font-bold font-mono text-st-purple">
                {(progress?.hashesComputed || 0).toLocaleString('cs-CZ')}
              </p>
            </div>

            {/* Current Nonce */}
            <div className="glass-card-static p-5">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Aktuální Nonce</p>
              <p className="text-2xl font-bold font-mono text-st-gold">
                {(progress?.nonce || 0).toLocaleString('cs-CZ')}
              </p>
            </div>

            {/* Difficulty */}
            <div className="glass-card-static p-5">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Obtížnost</p>
              <p className="text-2xl font-bold text-st-red">
                {challenge?.difficulty || '–'} <span className="text-sm text-text-secondary">vedoucí nuly</span>
              </p>
            </div>
          </div>
        )}

        {/* Current Hash */}
        {progress?.currentHash && (
          <div className="glass-card-static p-5">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-2">Poslední Hash</p>
            <div className="hash-display">
              {progress.currentHash}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`glass-card p-6 ${result.success ? 'glow-gold' : ''}`}>
            <div className="flex items-center gap-4">
              <span className="text-4xl">{result.success ? '🎉' : '❌'}</span>
              <div>
                <h3 className="text-xl font-bold">
                  {result.success ? 'Těžba úspěšná!' : 'Chyba při těžbě'}
                </h3>
                <p className="text-text-secondary">{result.message}</p>
                {result.success && (
                  <p className="text-st-gold font-mono font-bold text-lg mt-1">
                    +{parseFloat(result.reward).toFixed(6)} ST
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card-static p-4 border-st-red/20">
            <div className="flex items-center gap-3 text-st-red">
              <span className="text-xl">⚠️</span>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Mining Stats */}
        <div className="glass-card-static p-6">
          <h2 className="text-xl font-bold mb-4">📊 Těžební Statistiky</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/[0.02]">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Celkem Challenges</p>
              <p className="text-2xl font-bold font-mono">{stats?.totalChallenges ?? '–'}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.02]">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Vyřešeno</p>
              <p className="text-2xl font-bold font-mono text-st-emerald">{stats?.solvedChallenges ?? '–'}</p>
            </div>
            <div className="p-4 rounded-lg bg-white/[0.02]">
              <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Celkem Odtěženo</p>
              <p className="text-2xl font-bold font-mono text-st-gold">
                {stats ? `${parseFloat(stats.totalReward).toFixed(6)} ST` : '–'}
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="glass-card-static p-6">
          <h3 className="text-lg font-bold mb-3">ℹ️ Jak Těžba Funguje</h3>
          <div className="space-y-2 text-sm text-text-secondary">
            <p>1. Server vydá kryptografickou výzvu (prefix + obtížnost)</p>
            <p>2. Váš prohlížeč hledá nonce, jehož SHA-256 hash splňuje obtížnost</p>
            <p>3. Řešení se odešle na server k ověření</p>
            <p>4. Server znovu vypočítá hash a ověří správnost</p>
            <p>5. Odměna: <span className="text-st-gold font-mono">0.001 ST</span> za každých 10 000 hashů</p>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-st-purple-dim border border-st-purple/10">
            <p className="text-xs text-st-purple">
              ⚡ Těžba probíhá ve Web Workeru — neblokuje UI. 
              Server validuje každé řešení — podvádění není možné.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
