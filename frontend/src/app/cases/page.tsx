'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

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

const RARITY_WEIGHTS = [
  { min: 1, max: 5, color: '#ffd700', label: 'Mythic' },
  { min: 6, max: 15, color: '#a855f7', label: 'Legendary' },
  { min: 16, max: 30, color: '#06b6d4', label: 'Epic' },
  { min: 31, max: 60, color: '#10b981', label: 'Rare' },
  { min: 61, max: 100, color: '#9ca3af', label: 'Common' },
];

function getItemColor(item: CaseItem) {
  if (item.type === 'MYTHIC_PASS') return '#ffd700';
  const pct = item.weight;
  if (pct <= 3) return '#ffd700';
  if (pct <= 8) return '#a855f7';
  if (pct <= 15) return '#06b6d4';
  if (pct <= 25) return '#10b981';
  return '#9ca3af';
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

function CaseCard({ caseData, onOpen, loading, canAfford, dailyUsed }: {
  caseData: Case;
  onOpen: (c: Case) => void;
  loading: boolean;
  canAfford: boolean;
  dailyUsed?: boolean;
}) {
  const price = parseFloat(caseData.price);
  const mythicItem = caseData.items.find(i => i.type === 'MYTHIC_PASS');
  const isDisabled = loading || !canAfford || (caseData.isDaily && dailyUsed);

  const glowColor = caseData.isDaily ? '#06b6d4' : price >= 50 ? '#ffd700' : price >= 25 ? '#a855f7' : price >= 10 ? '#10b981' : '#06b6d4';
  const headerGrad = caseData.isDaily
    ? 'from-st-cyan/20 to-transparent'
    : price >= 50 ? 'from-yellow-500/15 to-transparent'
    : price >= 25 ? 'from-purple-500/15 to-transparent'
    : 'from-emerald-500/15 to-transparent';

  return (
    <div
      className="glass-card overflow-hidden relative group transition-all duration-300"
      style={{ boxShadow: `0 0 0px 0px ${glowColor}22` }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 0 25px 5px ${glowColor}33`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0px 0px ${glowColor}22`}
    >
      {/* Header gradient */}
      <div className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${headerGrad} pointer-events-none`} />

      <div className="p-6 relative">
        {/* Title row */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold">{caseData.name}</h3>
            {caseData.description && (
              <p className="text-text-muted text-xs mt-1 max-w-[220px]">{caseData.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0 ml-2">
            {caseData.isDaily ? (
              <span className="text-st-cyan font-bold text-sm">ZDARMA</span>
            ) : (
              <span className="font-bold font-mono text-sm" style={{ color: glowColor }}>{price} ST</span>
            )}
          </div>
        </div>

        {/* Items preview reel */}
        <div className="flex gap-1.5 mb-5 overflow-hidden">
          {caseData.items.slice(0, 6).map(item => (
            <div
              key={item.id}
              className="flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center relative overflow-hidden"
              style={{ background: `${getItemColor(item)}15`, border: `1px solid ${getItemColor(item)}40` }}
              title={item.label}
            >
              <span className="text-[8px] font-bold leading-tight" style={{ color: getItemColor(item) }}>
                {item.type === 'MYTHIC_PASS' ? '🌈' : item.label}
              </span>
            </div>
          ))}
          {caseData.items.length > 6 && (
            <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 text-text-muted text-xs font-bold">
              +{caseData.items.length - 6}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-text-muted mb-5">
          <span>{caseData.items.length} možných odměn</span>
          {mythicItem && (
            <span className="text-yellow-400" style={{ textShadow: '0 0 8px rgba(255,215,0,0.6)' }}>
              🌈 {mythicItem.weight}% Mythic Pass
            </span>
          )}
        </div>

        {/* Open button */}
        <button
          onClick={() => onOpen(caseData)}
          disabled={isDisabled}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: isDisabled ? undefined : `linear-gradient(135deg, ${glowColor}40, ${glowColor}20)`,
            border: `1px solid ${glowColor}40`,
            color: isDisabled ? undefined : glowColor,
          }}
        >
          {loading ? '⏳ Otevírám...'
            : caseData.isDaily && dailyUsed ? '⏰ Zítra znovu'
            : caseData.isDaily ? '🎁 Otevřít Zdarma'
            : !canAfford ? `Potřebujete ${price} ST`
            : `🔓 Otevřít za ${price === 0 ? 'Zdarma' : price + ' ST'}`}
        </button>
      </div>
    </div>
  );
}

// Reel animation for winning screen
function WinDisplay({ result, onClose }: { result: OpenResult; onClose: () => void }) {
  const isMythic = result.wonItem.type === 'MYTHIC_PASS';
  const color = getItemColor(result.wonItem);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" style={{ animation: 'fadeIn 0.3s ease' }} />
      <div
        className="relative glass-card p-8 max-w-sm w-full text-center z-10"
        style={{
          boxShadow: `0 0 60px ${color}60`,
          border: `1px solid ${color}40`,
          transform: visible ? 'scale(1)' : 'scale(0.7)',
          opacity: visible ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
          animation: 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Background glow */}
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)` }} />

        {/* Win icon */}
        <div className="text-6xl mb-4">{isMythic ? '🌈' : '✨'}</div>

        <h2 className="text-2xl font-black mb-2" style={{ color, textShadow: `0 0 20px ${color}80` }}>
          {isMythic ? 'MYTHIC PASS!' : 'Výhra!'}
        </h2>

        <div className="glass-card-static p-4 my-4 rounded-2xl" style={{ border: `1px solid ${color}40` }}>
          <p className="text-sm text-text-muted mb-1">Získali jste</p>
          {isMythic ? (
            <p className="text-2xl font-black mythic-text">🌈 Mythic Pass</p>
          ) : (
            <p className="text-3xl font-black font-mono" style={{ color }}>
              +{result.wonItem.label}
            </p>
          )}
        </div>

        <p className="text-text-muted text-xs mb-6">
          Nový zůstatek: <span className="text-st-cyan font-mono">{parseFloat(result.newBalance).toFixed(4)} ST</span>
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-bold transition-all"
          style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}
        >
          🎉 Super, zavřít
        </button>
      </div>

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
        @keyframes rainbowText {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}

export default function CasesPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [passes, setPasses] = useState<number>(0);
  const [dailyUsed, setDailyUsed] = useState(false);
  const [dailyCaseId, setDailyCaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [result, setResult] = useState<OpenResult | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [countdown, setCountdown] = useState(getDailyCountdown());

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  // Countdown timer
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
      setDailyCaseId(dailyRes.caseId || null);
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
      const res = await api.cases.open({ caseId: caseData.id });
      setResult(res);
      refreshUser();
      if (caseData.isDaily) setDailyUsed(true);
    } catch (err: any) {
      showMsg('error', err.message || 'Chyba při otevírání case.');
    } finally {
      setOpening(null);
    }
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
                <p className="mythic-text font-bold text-lg">{passes}×</p>
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
          <div className={`glass-card-static p-4 animate-fade-up border ${message.type === 'success' ? 'border-st-emerald/30' : 'border-st-red/30'}`}>
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-st-emerald' : 'text-st-red'}`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </p>
          </div>
        )}

        {/* Daily countdown for used daily */}
        {dailyUsed && (
          <div className="glass-card-static p-4 border border-st-cyan/20 flex items-center justify-between">
            <p className="text-text-secondary text-sm">⏰ Denní case byl dnes použit</p>
            <p className="text-st-cyan font-mono font-bold">Reset za: {countdown}</p>
          </div>
        )}

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

        {/* Info section */}
        <div className="glass-card-static p-6">
          <h3 className="font-bold mb-4">📊 Jak to funguje?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-text-secondary">
            <div>
              <p className="font-semibold text-text-primary mb-1">🎁 Denní Case</p>
              <p>Zdarma jednou za den. Malé ST odměny nebo velmi vzácný Mythic Pass.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">📦 Placené Cases</p>
              <p>~30 % šance na profit. Čím dražší case, tím větší šance na Mythic Pass.</p>
            </div>
            <div>
              <p className="font-semibold text-text-primary mb-1">🌈 Mythic Pass</p>
              <p>Odemkne Mythic učitele v ST-ROOM. Uplatnit v sekci ST-ROOM.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Win modal */}
      {result && <WinDisplay result={result} onClose={() => { setResult(null); loadData(); }} />}

      <style jsx global>{`
        .mythic-text {
          background: linear-gradient(90deg, #ff6b6b, #ffd700, #51cf66, #339af0, #cc5de8, #ff6b6b);
          background-size: 300% 300%;
          animation: rainbowText 3s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        @keyframes rainbowText {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </AppShell>
  );
}
