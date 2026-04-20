'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useI18n } from '@/lib/i18n';

const ST_PER_SECOND = 0.004166; // Halved: ~0.25 ST/min

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface ClickCircle {
  id: number;
  x: number;
  y: number;
  expiresAt: number;
}

export default function MiningPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [isMining, setIsMining] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalBoostSeconds, setTotalBoostSeconds] = useState(0);
  const [boostActiveUntil, setBoostActiveUntil] = useState(0);
  const [circles, setCircles] = useState<ClickCircle[]>([]);
  
  const [estimatedReward, setEstimatedReward] = useState(0);
  const [result, setResult] = useState<{ reward: string; elapsedSeconds: number; boostSeconds: number } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const { t } = useI18n();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const circleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isBoosted = Date.now() < boostActiveUntil;

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  // Poll session on mount
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

  // Tab Visibility Guard
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isMining) {
        handleStop(); // Stop and collect if user leaves tab
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isMining]);

  // Timer tick
  useEffect(() => {
    if (isMining) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const currentlyBoosted = now < boostActiveUntil;
        
        if (currentlyBoosted) {
          setTotalBoostSeconds(prev => prev + 1);
        }

        setElapsedSeconds(prev => {
          const next = prev + 1;
          // Local estimate: (total - boost) * rate + (boost * rate * 2)
          // Since we increment totalBoostSeconds separately, we use a simpler calc for display
          return next;
        });
      }, 1000);

      // Circle spawner
      circleTimerRef.current = setInterval(() => {
        if (Math.random() > 0.4) { // 60% chance to spawn every 4s
          const newCircle: ClickCircle = {
            id: Date.now(),
            x: 10 + Math.random() * 80, // 10-90%
            y: 20 + Math.random() * 60, // 20-80%
            expiresAt: Date.now() + 3000,
          };
          setCircles(prev => [...prev, newCircle]);
          
          // Cleanup after 3s
          setTimeout(() => {
            setCircles(prev => prev.filter(c => c.id !== newCircle.id));
          }, 3000);
        }
      }, 4000);

    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (circleTimerRef.current) clearInterval(circleTimerRef.current);
      setCircles([]);
    }
    return () => { 
      if (timerRef.current) clearInterval(timerRef.current); 
      if (circleTimerRef.current) clearInterval(circleTimerRef.current);
    };
  }, [isMining, boostActiveUntil]);

  // Update Estimated Reward
  useEffect(() => {
    const baseSec = elapsedSeconds - totalBoostSeconds;
    const effectiveSec = baseSec + (totalBoostSeconds * 2);
    setEstimatedReward(effectiveSec * ST_PER_SECOND);
  }, [elapsedSeconds, totalBoostSeconds]);

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
        // If boosted, shift colors to gold
        const hue = isBoosted ? 45 : (isMining ? 180 + Math.sin(Date.now() / 1000 + i) * 40 : 270);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${isMining ? (isBoosted ? 0.6 : 0.35) : 0.12})`;
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.offsetHeight && Math.random() > 0.98) drops[i] = 0;
        drops[i] += isMining ? (isBoosted ? 1.2 : 0.6) : 0.15;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [isMining, isBoosted]);

  const handleStart = async () => {
    setError('');
    setResult(null);
    setLoading(true);
    setTotalBoostSeconds(0);
    setBoostActiveUntil(0);
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
    if (circleTimerRef.current) clearInterval(circleTimerRef.current);
    setIsMining(false);
    setCircles([]);
    setLoading(true);
    setError('');
    try {
      const res = await api.mining.stopSession({ boostSeconds: totalBoostSeconds }) as any;
      setResult(res);
      setElapsedSeconds(0);
      setTotalBoostSeconds(0);
      setEstimatedReward(0);
      refreshUser();
      api.mining.stats().then(setStats).catch(() => {});
    } catch (err: any) {
      setError(err.message || 'Chyba při zastavování těžby.');
    } finally {
      setLoading(false);
    }
  }, [refreshUser, totalBoostSeconds]);

  const handleCircleClick = (id: number) => {
    setCircles(prev => prev.filter(c => c.id !== id));
    setBoostActiveUntil(Date.now() + 3000);
  };

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Hero Mining Control */}
        <div className="mining-hero" style={{ position: 'relative', overflow: 'hidden', borderRadius: 20 }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: isMining ? (isBoosted ? 'radial-gradient(ellipse at center, rgba(251,191,36,0.2) 0%, rgba(6,6,16,0.8) 70%)' : 'radial-gradient(ellipse at center, rgba(168,85,247,0.15) 0%, rgba(6,6,16,0.8) 70%)') : 'radial-gradient(ellipse at center, rgba(0,232,255,0.08) 0%, rgba(6,6,16,0.85) 70%)', zIndex: 1, transition: 'background 0.5s ease' }} />

          {/* Interactive Circles Overlay */}
          {isMining && (
            <div className="absolute inset-0 z-[5] pointer-events-none">
              {circles.map(circle => (
                <button
                  key={circle.id}
                  onClick={(e) => { e.stopPropagation(); handleCircleClick(circle.id); }}
                  className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center animate-ping-subtle"
                  style={{
                    left: `${circle.x}%`,
                    top: `${circle.y}%`,
                    width: 60,
                    height: 60,
                  }}
                >
                  <div className="w-12 h-12 rounded-full bg-st-gold shadow-[0_0_20px_rgba(251,191,36,0.6)] flex items-center justify-center text-xl border-4 border-white/20 hover:scale-110 transition-transform">
                    ✨
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ position: 'relative', zIndex: 2 }} className="p-8 md:p-12 flex flex-col items-center text-center">
            {/* Ring */}
            <div className={`mining-ring ${isMining ? (isBoosted ? 'mining-ring--boost' : 'mining-ring--active') : ''}`}>
              <div className={`mining-ring-inner ${isMining ? 'mining-ring-inner--active' : ''} ${isBoosted ? 'bg-st-gold' : ''}`}>
                <span style={{ fontSize: 40, lineHeight: 1 }}>{isBoosted ? '🔥' : (isMining ? '⚡' : '⛏️')}</span>
              </div>
            </div>

            {/* Status badge */}
            <div className="mt-6 mb-2">
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest ${isMining ? (isBoosted ? 'bg-st-gold text-black' : 'bg-st-emerald-dim text-st-emerald') : 'bg-white/[0.06] text-text-secondary'}`}>
                <span className={`w-2 h-2 rounded-full ${isMining ? (isBoosted ? 'bg-black animate-pulse' : 'bg-st-emerald animate-pulse') : 'bg-text-muted'}`} />
                {isBoosted ? 'BOOST ACTIVE (2X)' : (isMining ? t.mining.active : t.mining.inactive)}
              </div>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-3">{t.mining.title}</h1>
            <p className="text-text-secondary text-sm mt-2 max-w-md">
              {isMining ? 'Mining active. Keep this tab open. Click circles for a 2x boost!' : 'Start mining and keep this tab open to earn ST-Points.'}
            </p>

            {/* Live stats during mining */}
            {isMining && (
              <div className="flex flex-wrap items-center justify-center gap-8 mt-6 mb-2">
                <div className="text-center">
                  <p className="text-3xl md:text-4xl font-bold font-mono text-st-cyan text-glow-cyan">{formatTime(elapsedSeconds)}</p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">{t.mining.elapsed}</p>
                </div>
                <div className="w-px h-10 bg-glass-border hidden sm:block" />
                <div className="text-center">
                  <p className={`text-3xl md:text-4xl font-bold font-mono transition-colors duration-300 ${isBoosted ? 'text-st-gold text-glow-gold' : 'text-st-cyan text-glow-cyan'}`}>
                    ~{estimatedReward.toFixed(4)}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">{t.mining.estimated}</p>
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
                  <><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t.common.loading}</>
                ) : isMining ? (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg> {t.mining.stop}</>
                ) : (
                  <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg> {t.mining.start}</>
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
                <h3 className="text-lg font-bold">{t.mining.completed}</h3>
                <p className="text-text-secondary text-sm">
                  {t.mining.minedFor} {Math.floor(result.elapsedSeconds / 60)}m {result.elapsedSeconds % 60}s
                  {result.boostSeconds > 0 && <span className="text-st-gold font-bold ml-2">({result.boostSeconds}s boosted)</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-st-gold text-glow-gold">+{parseFloat(result.reward).toFixed(6)}</p>
                <p className="text-xs text-text-muted">ST</p>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="glass-card-static p-5 flex items-start gap-4">
          <span className="text-2xl">⚠️</span>
          <div className="text-sm text-text-secondary space-y-1">
            <p><strong className="text-text-primary">Important:</strong> Mining only works while this tab is active. If you switch tabs, mining will stop automatically.</p>
            <p><strong className="text-text-gold">Boost:</strong> Click the golden circles appearing in the matrix field to activate a <span className="text-st-gold font-bold">2x multiplier</span> for 3 seconds.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
          <div className="glass-card-static p-5">
            <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">{t.mining.sessions}</p>
            <p className="text-3xl font-bold">{stats?.totalChallenges ?? '–'}</p>
          </div>
          <div className="glass-card-static p-5">
            <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">{t.mining.completedSessions}</p>
            <p className="text-3xl font-bold text-st-emerald">{stats?.solvedChallenges ?? '–'}</p>
          </div>
          <div className="glass-card-static p-5">
            <p className="text-text-muted text-[10px] uppercase tracking-widest mb-1">{t.mining.totalMined}</p>
            <p className="text-3xl font-bold text-st-gold">
              {stats ? `${parseFloat(stats.totalReward).toFixed(6)} ST` : '–'}
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
