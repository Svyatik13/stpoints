'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

// ── Types ────────────────────────────────────────────────────────────────────
interface CaseItem {
  id: string;
  type: 'ST_REWARD' | 'MYTHIC_PASS';
  label: string;
  amount: string | null;
  weight: number;
}
interface Case {
  id: string;
  name: string;
  description: string | null;
  price: string;
  isDaily: boolean;
  isActive: boolean;
  sortOrder: number;
  items: CaseItem[];
}
interface OpenResult {
  wonItem: CaseItem;
  newBalance: string;
  opening: { id: string; rewardType: string; rewardAmount: string | null };
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getItemColor(item: CaseItem) {
  if (item.type === 'MYTHIC_PASS') return '#ffd700';
  const w = item.weight;
  if (w <= 3) return '#ffd700';
  if (w <= 8) return '#a855f7';
  if (w <= 15) return '#06b6d4';
  if (w <= 25) return '#10b981';
  return '#9ca3af';
}

function weightedRandom(items: CaseItem[]): CaseItem {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item;
  }
  return items[items.length - 1];
}

function getDailyCountdown() {
  const now = new Date();
  const next = new Date();
  next.setHours(24, 0, 0, 0);
  const diff = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
  const s = (diff % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// ── CSGO Reel Animation ──────────────────────────────────────────────────────
const ITEM_SLOT = 88;   // item width + gap px
const WINNER_INDEX = 38; // position in 50-item reel where winner lands
const REEL_DURATION = 5000; // ms

function CaseReel({
  caseData, winner, actualAmount, onDone,
}: {
  caseData: Case; winner: CaseItem; actualAmount: string | null; onDone: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [translateX, setTranslateX] = useState(-2 * ITEM_SLOT);
  const [animating, setAnimating] = useState(false);
  const [done, setDone] = useState(false);

  // Build a 50-item reel with winner at position WINNER_INDEX
  const reelItems = useMemo<CaseItem[]>(() => {
    const items: CaseItem[] = [];
    for (let i = 0; i < 50; i++) {
      items.push(i === WINNER_INDEX ? winner : weightedRandom(caseData.items));
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const centerX = containerWidth / 2;
      const targetX = -(WINNER_INDEX * ITEM_SLOT - centerX + ITEM_SLOT / 2);
      setAnimating(true);
      setTranslateX(targetX);
    });
    const timer = setTimeout(() => {
      setDone(true);
      onDone();
    }, REEL_DURATION + 200);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const winColor = getItemColor(winner);
  const isMythic = winner.type === 'MYTHIC_PASS';

  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-8 text-center animate-fade-up">
        <p className="text-text-muted text-sm uppercase tracking-widest mb-1">Otevírání case</p>
        <h2 className="text-2xl font-black">{caseData.name}</h2>
      </div>

      {/* Reel container */}
      <div
        ref={containerRef}
        className="w-full max-w-2xl relative overflow-hidden rounded-2xl"
        style={{ height: 116, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Left fade */}
        <div className="absolute left-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.9), transparent)' }} />
        {/* Right fade */}
        <div className="absolute right-0 top-0 bottom-0 w-28 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.9), transparent)' }} />

        {/* Center indicator */}
        <div className="absolute top-0 bottom-0 left-1/2 z-20 pointer-events-none -translate-x-0.5"
          style={{ width: 2, background: '#ffd700', boxShadow: '0 0 12px rgba(255,215,0,0.9)' }} />
        <div className="absolute top-0 left-1/2 z-20 -translate-x-1.5"
          style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '10px solid #ffd700' }} />
        <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1.5"
          style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '10px solid #ffd700' }} />

        {/* Scrolling reel */}
        <div
          className="flex items-center h-full"
          style={{
            paddingLeft: 4,
            gap: 8,
            transform: `translateX(${translateX}px)`,
            transition: animating
              ? `transform ${REEL_DURATION}ms cubic-bezier(0.17, 0.97, 0.38, 1.0)`
              : 'none',
            willChange: 'transform',
          }}
        >
          {reelItems.map((item, i) => {
            const color = getItemColor(item);
            const isWin = i === WINNER_INDEX;
            const isMy = item.type === 'MYTHIC_PASS';
            return (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center justify-center rounded-xl text-center"
                style={{
                  width: 80, height: 96,
                  background: isWin ? `${color}25` : `${color}0d`,
                  border: `1px solid ${color}${isWin ? '70' : '28'}`,
                  boxShadow: isWin ? `0 0 18px ${color}50` : undefined,
                  padding: '6px 4px',
                }}
              >
                <span className="text-xl leading-none mb-1">{isMy ? '🌈' : '💰'}</span>
                <span
                  className="text-[9px] font-bold leading-tight block"
                  style={{ color, textShadow: isWin ? `0 0 8px ${color}` : undefined }}
                >
                  {isMy ? 'Mythic Pass' : item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Winner reveal (shows after anim) */}
      {done && (
        <div className="mt-8 text-center animate-fade-up">
          <p className="text-text-muted text-xs mb-2">Výsledek:</p>
          {isMythic ? (
            <p className="text-2xl font-black mythic-text">🌈 Mythic Pass!</p>
          ) : (
            <p className="text-3xl font-black font-mono" style={{ color: winColor, textShadow: `0 0 20px ${winColor}80` }}>
              +{actualAmount ? parseFloat(actualAmount).toFixed(4) : winner.label} ST
            </p>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        .mythic-text {
          background: linear-gradient(90deg, #ff6b6b, #ffd700, #51cf66, #339af0, #cc5de8, #ff6b6b);
          background-size: 300% 300%;
          animation: rainbowText 3s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        @keyframes rainbowText { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
    </div>
  );
}

// ── Win Display (after reel) ─────────────────────────────────────────────────
function WinDisplay({ result, onClose }: { result: OpenResult; onClose: () => void }) {
  const isMythic = result.wonItem.type === 'MYTHIC_PASS';
  const color = getItemColor(result.wonItem);
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 40); }, []);

  // The actual amount rewarded (with variance applied)
  const displayAmount = result.opening.rewardAmount
    ? parseFloat(result.opening.rewardAmount).toFixed(4)
    : null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative glass-card p-8 max-w-sm w-full text-center z-10"
        onClick={e => e.stopPropagation()}
        style={{
          boxShadow: `0 0 60px ${color}60`,
          border: `1px solid ${color}40`,
          transform: visible ? 'scale(1)' : 'scale(0.65)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)` }} />

        <div className="text-5xl mb-4">{isMythic ? '🌈' : '✨'}</div>
        <h2 className="text-2xl font-black mb-3" style={{ color, textShadow: `0 0 20px ${color}80` }}>
          {isMythic ? 'MYTHIC PASS!' : 'Výhra!'}
        </h2>

        <div className="glass-card-static p-4 my-4 rounded-2xl" style={{ border: `1px solid ${color}30` }}>
          <p className="text-text-muted text-xs mb-1">Získali jste</p>
          {isMythic ? (
            <p className="text-2xl font-black mythic-text">🌈 Mythic Pass</p>
          ) : (
            <>
              <p className="text-3xl font-black font-mono" style={{ color }}>
                +{displayAmount ?? result.wonItem.label} ST
              </p>
              {displayAmount && (
                <p className="text-text-muted text-[10px] mt-1">({result.wonItem.label} × variance)</p>
              )}
            </>
          )}
        </div>

        <p className="text-text-muted text-xs mb-5">
          Nový zůstatek:{' '}
          <span className="text-st-cyan font-mono font-bold">{parseFloat(result.newBalance).toFixed(4)} ST</span>
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
          style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
        >
          🎉 Super, zavřít
        </button>
      </div>
    </div>
  );
}

// ── Case Card ─────────────────────────────────────────────────────────────────
function CaseCard({
  caseData, onOpen, loading, canAfford, dailyUsed,
}: {
  caseData: Case; onOpen: (c: Case) => void; loading: boolean; canAfford: boolean; dailyUsed?: boolean;
}) {
  const price = parseFloat(caseData.price);
  const mythicItem = caseData.items.find(i => i.type === 'MYTHIC_PASS');
  const isDisabled = loading || !canAfford || (caseData.isDaily && dailyUsed);

  const glowColor = caseData.isDaily ? '#06b6d4'
    : price >= 50 ? '#ffd700'
    : price >= 25 ? '#a855f7'
    : '#10b981';

  return (
    <div
      className="glass-card overflow-hidden relative group transition-all duration-300 flex flex-col"
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 0 28px 6px ${glowColor}33`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = ''}
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Title */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-bold leading-tight">{caseData.name}</h3>
            {caseData.description && (
              <p className="text-text-muted text-[11px] mt-1 max-w-[200px] leading-relaxed">{caseData.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            {caseData.isDaily
              ? <span className="text-st-cyan font-bold text-sm">ZDARMA</span>
              : <span className="font-bold font-mono text-sm" style={{ color: glowColor }}>{price} ST</span>}
          </div>
        </div>

        {/* Item preview strip */}
        <div className="flex gap-1.5 mb-4 overflow-hidden flex-wrap flex-1">
          {caseData.items.slice(0, 7).map(item => {
            const c = getItemColor(item);
            return (
              <div
                key={item.id}
                className="w-10 h-10 rounded-lg flex flex-col items-center justify-center"
                style={{ background: `${c}15`, border: `1px solid ${c}35` }}
                title={item.label}
              >
                <span className="text-[8px] font-bold leading-tight text-center px-0.5" style={{ color: c }}>
                  {item.type === 'MYTHIC_PASS' ? '🌈' : item.label}
                </span>
              </div>
            );
          })}
          {caseData.items.length > 7 && (
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5 text-text-muted text-[10px] font-bold">
              +{caseData.items.length - 7}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-between text-[11px] text-text-muted mb-4">
          <span>{caseData.items.length} odměn</span>
          {mythicItem && (
            <span className="text-yellow-400" style={{ textShadow: '0 0 6px rgba(255,215,0,0.5)' }}>
              🌈 {mythicItem.weight}× šance Mythic
            </span>
          )}
        </div>

        {/* Open button */}
        <button
          onClick={() => onOpen(caseData)}
          disabled={isDisabled}
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isDisabled ? undefined : `linear-gradient(135deg, ${glowColor}35, ${glowColor}18)`,
            border: `1px solid ${glowColor}40`,
            color: isDisabled ? undefined : glowColor,
          }}
        >
          {loading ? '⏳ Otevírám...'
            : caseData.isDaily && dailyUsed ? '⏰ Zítra znovu'
            : caseData.isDaily ? '🎁 Otevřít Zdarma'
            : !canAfford ? `Nedostatek ST`
            : `🔓 Otevřít za ${price === 0 ? 'Zdarma' : price + ' ST'}`}
        </button>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CasesPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [passes, setPasses] = useState(0);
  const [dailyUsed, setDailyUsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);

  // Animation & result state
  const [animating, setAnimating] = useState<{ caseData: Case; result: OpenResult } | null>(null);
  const [result, setResult] = useState<OpenResult | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [countdown, setCountdown] = useState(getDailyCountdown());

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    const t = setInterval(() => setCountdown(getDailyCountdown()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [casesRes, passesRes, dailyRes] = await Promise.all([
        api.cases.list(),
        api.cases.passes(),
        api.cases.dailyStatus(),
      ]);
      setCases(casesRes.cases || []);
      setPasses(passesRes.count ?? 0);
      setDailyUsed(!dailyRes.available);
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleOpen(caseData: Case) {
    setOpening(caseData.id);
    try {
      // Fetch result immediately — reel animation plays on top
      const res = await api.cases.open({ caseId: caseData.id });
      if (caseData.isDaily) setDailyUsed(true);
      refreshUser();
      // Start reel animation with the real winner
      setAnimating({ caseData, result: res });
    } catch (err: any) {
      showMsg('error', err.message || 'Chyba při otevírání case.');
    } finally {
      setOpening(null);
    }
  }

  function handleReelDone() {
    if (!animating) return;
    const res = animating.result;
    setAnimating(null);
    setResult(res);
  }

  if (!user) return null;
  const balance = parseFloat(user.balance || '0');

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up relative z-10">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ textShadow: '0 0 20px rgba(6,182,212,0.3)' }}>
              📦 Cases
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Otevírej cases a získej ST nebo vzácný 🌈 Mythic Pass!
            </p>
          </div>
          <div className="flex gap-3">
            {passes > 0 && (
              <div className="glass-card-static px-4 py-2 text-center border border-yellow-500/30">
                <p className="text-text-muted text-xs">Mythic Passy</p>
                <p className="font-bold text-lg mythic-text">{passes}×</p>
              </div>
            )}
            <div className="glass-card-static px-4 py-2 text-center">
              <p className="text-text-muted text-xs">Zůstatek</p>
              <p className="text-st-cyan font-mono font-bold">{balance.toFixed(4)} ST</p>
            </div>
          </div>
        </div>

        {/* Toast */}
        {message && (
          <div className={`glass-card-static p-4 border ${message.type === 'success' ? 'border-st-emerald/30' : 'border-st-red/30'}`}>
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-st-emerald' : 'text-st-red'}`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </p>
          </div>
        )}

        {/* Daily countdown */}
        {dailyUsed && (
          <div className="glass-card-static p-4 border border-st-cyan/20 flex items-center justify-between">
            <p className="text-text-secondary text-sm">⏰ Denní case byl dnes použit</p>
            <p className="text-st-cyan font-mono font-bold">Reset za: {countdown}</p>
          </div>
        )}

        {/* Cases grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl animate-shimmer" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cases.map(c => (
              <CaseCard
                key={c.id}
                caseData={c}
                onOpen={handleOpen}
                loading={opening === c.id}
                canAfford={balance >= parseFloat(c.price)}
                dailyUsed={c.isDaily ? dailyUsed : undefined}
              />
            ))}
          </div>
        )}

        {/* Info */}
        <div className="glass-card-static p-6">
          <h3 className="font-bold mb-4">📊 Jak to funguje?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-text-secondary">
            <div>
              <p className="font-semibold text-text-primary mb-1">🎁 Denní Case</p>
              <p>Zdarma jednou za den. Malé ST odměny nebo velmi vzácný Mythic Pass.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">📦 Placené Cases</p>
              <p>Statisticky spíše nevýdělečné — šance na velkou výhru, ale house edge je reálný.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">🌈 Mythic Pass</p>
              <p>Odemkne Mythic učitele v sekci ST-ROOM. Nelze koupit jinak.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CSGO Reel animation */}
      {animating && (
        <CaseReel
          caseData={animating.caseData}
          winner={animating.result.wonItem}
          actualAmount={animating.result.opening.rewardAmount}
          onDone={handleReelDone}
        />
      )}

      {/* Win modal (after reel) */}
      {result && (
        <WinDisplay result={result} onClose={() => { setResult(null); loadData(); }} />
      )}

      <style jsx global>{`
        .mythic-text {
          background: linear-gradient(90deg, #ff6b6b, #ffd700, #51cf66, #339af0, #cc5de8, #ff6b6b);
          background-size: 300% 300%;
          animation: rainbowText 3s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        @keyframes rainbowText { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      `}</style>
    </AppShell>
  );
}
