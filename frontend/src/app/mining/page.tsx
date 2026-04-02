'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

const ST_PER_SECOND = 0.00005;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MiningPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [isMining, setIsMining] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedReward, setEstimatedReward] = useState(0);
  const [result, setResult] = useState<{ reward: string; elapsedSeconds: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  // Poll session on mount to resume if already mining
  useEffect(() => {
    if (!user) return;
    api.mining.session().then((s: any) => {
      if (s.active) {
        setIsMining(true);
        setElapsedSeconds(s.elapsedSeconds || 0);
      }
    }).catch(() => {});
    api.mining.stats().then(setStats).catch(() => {});
  }, [user]);

  // Timer tick
  useEffect(() => {
    if (isMining) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          setEstimatedReward(next * ST_PER_SECOND);
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isMining]);

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
        const hue = isMining ? 180 + Math.sin(Date.now() / 1000 + i) * 40 : 270;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${isMining ? 0.35 : 0.12})`;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.offsetHeight && Math.random() > 0.98) drops[i] = 0;
        drops[i] += isMining ? 0.6 : 0.15;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [isMining]);

  const handleStart = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await api.mining.startSession() as any;
      setIsMining(true);
      if (res.elapsedSeconds) setElapsedSeconds(res.elapsedSeconds);
    } catch (err: any) {
      setError(err.message || 'Nelze zahájit těžbu.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsMining(false);
    setLoading(true);
    setError('');
    try {
      const res = await api.mining.stopSession() as any;
      setResult(res);
      setElapsedSeconds(0);
      setEstimatedReward(0);
      refreshUser();
      api.mining.stats().then(setStats).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Chyba při zastavování těžby.');
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  if (!user) return null;


  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Hero Mining Control */}
        <div className="mining-hero" style={{ position: 'relative', overflow: 'hidden', borderRadius: 20 }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: isMining ? 'radial-gradient(ellipse at center, rgba(168,85,247,0.15) 0%, rgba(6,6,16,0.8) 70%)' : 'radial-gradient(ellipse at center, rgba(0,232,255,0.08) 0%, rgba(6,6,16,0.85) 70%)', zIndex: 1, transition: 'background 1s ease' }} />

          <div style={{ position: 'relative', zIndex: 2 }} className="p-8 md:p-12 flex flex-col items-center text-center">
            {/* Ring */}
            <div className={`mining-ring ${isMining ? 'mining-ring--active' : ''}`}>
              <div className={`mining-ring-inner ${isMining ? 'mining-ring-inner--active' : ''}`}>
                <span style={{ fontSize: 40, lineHeight: 1 }}>{isMining ? '⚡' : '⛏️'}</span>
              </div>
            </div>

            {/* Status badge */}
            <div className="mt-6 mb-2">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest ${isMining ? 'bg-st-emerald-dim text-st-emerald' : 'bg-white/[0.06] text-text-secondary'}`}>
                <span className={`w-2 h-2 rounded-full ${isMining ? 'bg-st-emerald animate-pulse' : 'bg-text-muted'}`} />
                {isMining ? 'Probíhá těžba' : 'Neaktivní'}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3">ZČU Těžební Uzel</h1>
            <p className="text-text-secondary text-sm mt-2 max-w-md">
              {isMining ? 'Těžba probíhá — zastavte kdykoli tlačítkem níže' : 'Spusťte těžbu a nechte ji běžet. Zastavte až budete chtít.'}
            </p>

            {/* Live stats during mining */}
            {isMining && (
              <div className="flex flex-wrap items-center justify-center gap-8 mt-6 mb-2">
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold font-mono text-st-cyan text-glow-cyan">{formatTime(elapsedSeconds)}</p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">Čas těžby</p>
                </div>
                <div className="w-px h-10 bg-glass-border hidden sm:block" />
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold font-mono text-st-gold text-glow-gold">~{estimatedReward.toFixed(4)}</p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">Odhadovaná ST</p>
                </div>
              </div>
            )}


            <button
              onClick={isMining ? handleStop : handleStart}
              disabled={loading}
              id="mining-toggle"
              className={`mt-4 group relative overflow-hidden rounded-2xl font-bold text-lg px-12 py-4 transition-all duration-300 disabled:opacity-50 ${
                isMining
                  ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.25)] hover:shadow-[0_0_40px_rgba(239,68,68,0.4)]'
                  : 'bg-gradient-to-r from-st-cyan to-[#0099cc] text-black shadow-[0_0_30px_rgba(0,232,255,0.2)] hover:shadow-[0_0_50px_rgba(0,232,255,0.35)] hover:scale-[1.03]'
              }`}
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Zpracování...</>
                ) : isMining ? (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> Zastavit a získat ST</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg> Zahájit Těžbu</>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="glass-card p-6 animate-fade-up glow-gold" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-st-gold-dim">💰</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">Těžba dokončena!</h3>
                <p className="text-text-secondary text-sm">Těžil jsi {Math.floor(result.elapsedSeconds / 60)}m {result.elapsedSeconds % 60}s</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-st-gold text-glow-gold">+{parseFloat(result.reward).toFixed(6)}</p>
                <p className="text-xs text-text-muted">ST</p>
              </div>
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-st-cyan-dim flex items-center justify-center text-lg">🎯</div>
              <p className="text-text-muted text-xs uppercase tracking-wider">Celkem Sessions</p>
            </div>
            <p className="text-3xl font-bold font-mono">{stats?.totalChallenges ?? '–'}</p>
          </div>
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-st-emerald-dim flex items-center justify-center text-lg">✅</div>
              <p className="text-text-muted text-xs uppercase tracking-wider">Dokončeno</p>
            </div>
            <p className="text-3xl font-bold font-mono text-st-emerald">{stats?.solvedChallenges ?? '–'}</p>
          </div>
          <div className="glass-card-static p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-st-gold-dim flex items-center justify-center text-lg">💎</div>
              <p className="text-text-muted text-xs uppercase tracking-wider">Celkem Odtěženo</p>
            </div>
            <p className="text-3xl font-bold font-mono text-st-gold">
              {stats ? `${parseFloat(stats.totalReward).toFixed(6)} ST` : '–'}
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="glass-card-static p-5 flex items-start gap-4">
          <span className="text-2xl">ℹ️</span>
          <div className="text-sm text-text-secondary space-y-1">
            <p><strong className="text-text-primary">Jak těžba funguje:</strong> Spusť těžbu a nechej ji běžet jak dlouho chceš. Po zastavení dostaneš odměnu podle doby těžby.</p>
            <p>Sazba: <span className="text-st-cyan font-mono">~0.18 ST/hod</span> (s náhodnou odchylkou ±15 %). Žádný časový limit.</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
