'use client';

import { useEffect, useState, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  useEffect(() => {
    if (result?.success) {
      refreshUser();
      loadStats();
    }
  }, [result]);

  // Matrix rain effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();

    const chars = '0123456789abcdef';
    const fontSize = 11;
    const columns = Math.floor(canvas.offsetWidth / fontSize);
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * -50);

    let animId: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(6, 6, 16, 0.12)';
      ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      ctx.font = `${fontSize}px JetBrains Mono, monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Gradient from purple to cyan
        const hue = isMining ? 180 + Math.sin(Date.now() / 1000 + i) * 40 : 270;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${isMining ? 0.35 : 0.12})`;
        ctx.fillText(char, x, y);

        if (y > canvas.offsetHeight && Math.random() > 0.98) {
          drops[i] = 0;
        }
        drops[i] += isMining ? 0.6 : 0.15;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isMining]);

  async function loadStats() {
    try {
      const data = await api.mining.stats();
      setStats(data);
    } catch {}
  }

  if (!user) return null;

  const formatHashRate = (hr: number) => {
    if (hr >= 1000000) return `${(hr / 1000000).toFixed(2)} MH/s`;
    if (hr >= 1000) return `${(hr / 1000).toFixed(1)} kH/s`;
    return `${hr} H/s`;
  };

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Hero Mining Control — with Matrix background */}
        <div className="mining-hero" style={{ position: 'relative', overflow: 'hidden', borderRadius: 20 }}>
          {/* Matrix Canvas Background */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />

          {/* Gradient overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: isMining
              ? 'radial-gradient(ellipse at center, rgba(168,85,247,0.15) 0%, rgba(6,6,16,0.8) 70%)'
              : 'radial-gradient(ellipse at center, rgba(0,232,255,0.08) 0%, rgba(6,6,16,0.85) 70%)',
            zIndex: 1,
            transition: 'background 1s ease',
          }} />

          <div style={{ position: 'relative', zIndex: 2 }} className="p-8 md:p-12 flex flex-col items-center text-center">
            {/* Animated Ring */}
            <div className={`mining-ring ${isMining ? 'mining-ring--active' : ''}`}>
              <div className={`mining-ring-inner ${isMining ? 'mining-ring-inner--active' : ''}`}>
                <span style={{ fontSize: 40, lineHeight: 1 }}>{isMining ? '⚡' : '⛏️'}</span>
              </div>
            </div>

            {/* Status */}
            <div className="mt-6 mb-2">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest ${
                isMining
                  ? 'bg-st-emerald-dim text-st-emerald'
                  : 'bg-white/[0.06] text-text-secondary'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isMining ? 'bg-st-emerald animate-pulse' : 'bg-text-muted'}`} />
                {isMining ? 'Probíhá těžba' : 'Neaktivní'}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3">
              ZČU Těžební Uzel
            </h1>
            <p className="text-text-secondary text-sm mt-2 max-w-md">
              {isMining
                ? 'Web Worker řeší SHA-256 výzvy v pozadí'
                : 'Proof-of-Work těžba ST-Points pomocí SHA-256'}
            </p>

            {/* Live Stats Row (visible during mining) */}
            {isMining && (
              <div className="flex flex-wrap items-center justify-center gap-6 mt-6 mb-2">
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold font-mono text-st-cyan text-glow-cyan">
                    {formatHashRate(hashRate)}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">Hash Rate</p>
                </div>
                <div className="w-px h-10 bg-glass-border hidden sm:block" />
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold font-mono text-st-purple">
                    {(progress?.hashesComputed || 0).toLocaleString('cs-CZ')}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">Hashů</p>
                </div>
                <div className="w-px h-10 bg-glass-border hidden sm:block" />
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold font-mono text-st-gold text-glow-gold">
                    {challenge?.difficulty || '–'}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">Obtížnost</p>
                </div>
              </div>
            )}

            {/* Mining Button */}
            <button
              onClick={isMining ? stopMining : startMining}
              id="mining-toggle"
              className={`mt-6 group relative overflow-hidden rounded-2xl font-bold text-lg px-12 py-4 transition-all duration-300 ${
                isMining
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.25)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]'
                  : 'bg-gradient-to-r from-st-cyan to-[#0099cc] text-black shadow-[0_0_30px_rgba(0,232,255,0.2)] hover:shadow-[0_0_50px_rgba(0,232,255,0.35)] hover:scale-[1.03]'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isMining ? (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Zastavit Těžbu</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg> Zahájit Těžbu</>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Live Hash Display */}
        {progress?.currentHash && (
          <div className="glass-card-static p-4 overflow-hidden">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-text-muted whitespace-nowrap">Poslední Hash</span>
              <div className="hash-display flex-1" style={{ fontSize: '0.7rem' }}>
                <span className="text-st-emerald">{progress.currentHash.slice(0, challenge?.difficulty || 5)}</span>
                <span>{progress.currentHash.slice(challenge?.difficulty || 5)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Result Toast */}
        {result && (
          <div className={`glass-card p-6 animate-fade-up ${result.success ? 'glow-gold' : ''}`} style={{
            borderColor: result.success ? 'rgba(251,191,36,0.3)' : 'rgba(239,68,68,0.3)',
          }}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                result.success ? 'bg-st-gold-dim' : 'bg-st-red-dim'
              }`}>
                {result.success ? '💰' : '❌'}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">
                  {result.success ? 'Blok Odtěžen!' : 'Chyba při těžbě'}
                </h3>
                <p className="text-text-secondary text-sm">{result.message}</p>
              </div>
              {result.success && (
                <div className="text-right">
                  <p className="text-2xl font-bold font-mono text-st-gold text-glow-gold">
                    +{parseFloat(result.reward).toFixed(6)}
                  </p>
                  <p className="text-xs text-text-muted">ST</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="glass-card-static p-4" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <div className="flex items-center gap-3 text-st-red">
              <span className="text-xl">⚠️</span>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card-static p-5 group hover:border-st-cyan/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-st-cyan-dim flex items-center justify-center text-lg">🎯</div>
              <p className="text-text-muted text-xs uppercase tracking-wider">Celkem Challenges</p>
            </div>
            <p className="text-3xl font-bold font-mono">{stats?.totalChallenges ?? '–'}</p>
          </div>
          <div className="glass-card-static p-5 group hover:border-st-emerald/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-st-emerald-dim flex items-center justify-center text-lg">✅</div>
              <p className="text-text-muted text-xs uppercase tracking-wider">Vyřešeno</p>
            </div>
            <p className="text-3xl font-bold font-mono text-st-emerald">{stats?.solvedChallenges ?? '–'}</p>
          </div>
          <div className="glass-card-static p-5 group hover:border-st-gold/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-st-gold-dim flex items-center justify-center text-lg">💎</div>
              <p className="text-text-muted text-xs uppercase tracking-wider">Celkem Odtěženo</p>
            </div>
            <p className="text-3xl font-bold font-mono text-st-gold">
              {stats ? `${parseFloat(stats.totalReward).toFixed(6)} ST` : '–'}
            </p>
          </div>
        </div>

        {/* How it works — Compact collapsible */}
        <details className="glass-card-static group">
          <summary className="p-5 cursor-pointer flex items-center justify-between hover:bg-white/[0.02] rounded-2xl transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-lg">📖</span>
              <span className="font-semibold">Jak Těžba Funguje</span>
            </div>
            <svg className="w-5 h-5 text-text-muted transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="px-5 pb-5 space-y-3 text-sm text-text-secondary border-t border-glass-border pt-4">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-st-cyan-dim text-st-cyan flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <p>Server vydá kryptografickou výzvu (prefix + obtížnost)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-st-purple-dim text-st-purple flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <p>Váš prohlížeč hledá nonce, jehož SHA-256 hash splňuje obtížnost</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-st-gold-dim text-st-gold flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <p>Řešení se odešle na server k ověření → odměna <span className="text-st-gold font-mono font-semibold">0.0001 ST</span> / 10k hashů</p>
            </div>
            <div className="mt-3 p-3 rounded-xl bg-st-purple-dim/50 border border-st-purple/10">
              <p className="text-xs text-st-purple">
                ⚡ Těžba probíhá ve Web Workeru — neblokuje UI. Server validuje každé řešení.
              </p>
            </div>
          </div>
        </details>
      </div>
    </AppShell>
  );
}
