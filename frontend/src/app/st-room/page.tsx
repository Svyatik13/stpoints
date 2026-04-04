'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

// ─── Rarity Config ─────────────────────────────────────────────────────────
const RARITY_CONFIG: Record<string, {
  label: string;
  cost: number;
  color: string;
  textColor: string;
  borderColor: string;
  glowColor: string;
  badgeBg: string;
  isMythic?: boolean;
}> = {
  COMMON: {
    label: 'Common',
    cost: 50,
    color: '#9ca3af',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/30',
    glowColor: 'rgba(156,163,175,0.2)',
    badgeBg: 'bg-gray-500/20 text-gray-400',
  },
  RARE: {
    label: 'Rare',
    cost: 65,
    color: '#10b981',
    textColor: 'text-st-emerald',
    borderColor: 'border-st-emerald/30',
    glowColor: 'rgba(16,185,129,0.2)',
    badgeBg: 'bg-st-emerald-dim text-st-emerald',
  },
  EPIC: {
    label: 'Epic',
    cost: 75,
    color: '#06b6d4',
    textColor: 'text-st-cyan',
    borderColor: 'border-st-cyan/30',
    glowColor: 'rgba(6,182,212,0.2)',
    badgeBg: 'bg-st-cyan-dim text-st-cyan',
  },
  LEGENDARY: {
    label: 'Legendary',
    cost: 85,
    color: '#a855f7',
    textColor: 'text-st-purple',
    borderColor: 'border-st-purple/30',
    glowColor: 'rgba(168,85,247,0.25)',
    badgeBg: 'bg-st-purple-dim text-st-purple',
  },
  MYTHIC: {
    label: 'Mythic',
    cost: 0,
    color: 'rainbow',
    textColor: 'text-transparent bg-clip-text',
    borderColor: 'border-transparent',
    glowColor: 'rgba(255,200,0,0.25)',
    badgeBg: 'bg-gradient-to-r from-pink-500/20 to-yellow-500/20',
    isMythic: true,
  },
};

const RARITY_ORDER = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];

interface Teacher {
  id: string;
  name: string;
  rarity: string;
  isActive: boolean;
  cost: number;
}

interface Session {
  id: string;
  teacherId: string;
  expiresAt: string;
  teacher: Teacher;
}

// ─── Floating Logos ─────────────────────────────────────────────────────────
function FloatingLogos() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {Array.from({ length: 14 }).map((_, i) => {
        const size = 70 + (i % 5) * 30;
        const delay = i * 1.8;
        const duration = 16 + (i % 6) * 4;
        const left = (i * 7.3) % 100;
        return (
          <div
            key={i}
            className="absolute select-none"
            style={{
              width: size, height: size,
              left: `${left}%`,
              bottom: '-180px',
              opacity: 0,
              animation: `stRoomFloat ${duration}s ${delay}s linear infinite`,
            }}
          >
            <img src="/logo.png" alt="" className="w-full h-full object-contain" />
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes stRoomFloat {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 0; }
          8%   { opacity: 0.06; }
          92%  { opacity: 0.05; }
          100% { transform: translateY(-115vh) rotate(270deg) scale(0.7); opacity: 0; }
        }
        @keyframes rainbowText {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes rainbowBorder {
          0%   { border-color: #ff6b6b; box-shadow: 0 0 20px rgba(255,107,107,0.3); }
          17%  { border-color: #ffd700; box-shadow: 0 0 20px rgba(255,215,0,0.3); }
          33%  { border-color: #51cf66; box-shadow: 0 0 20px rgba(81,207,102,0.3); }
          50%  { border-color: #339af0; box-shadow: 0 0 20px rgba(51,154,240,0.3); }
          67%  { border-color: #cc5de8; box-shadow: 0 0 20px rgba(204,93,232,0.3); }
          83%  { border-color: #ff6b6b; box-shadow: 0 0 20px rgba(255,107,107,0.3); }
          100% { border-color: #ff6b6b; box-shadow: 0 0 20px rgba(255,107,107,0.3); }
        }
        .mythic-border { animation: rainbowBorder 3s linear infinite; border-width: 1px; border-style: solid; }
        .mythic-text {
          background: linear-gradient(90deg, #ff6b6b, #ffd700, #51cf66, #339af0, #cc5de8, #ff6b6b);
          background-size: 300% 300%;
          animation: rainbowText 3s ease infinite;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .mythic-badge {
          background: linear-gradient(90deg, rgba(255,107,107,0.2), rgba(255,215,0,0.2), rgba(81,207,102,0.2), rgba(51,154,240,0.2), rgba(204,93,232,0.2));
          background-size: 300%;
          animation: rainbowText 3s ease infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Countdown ──────────────────────────────────────────────────────────────
const TOTAL_SECONDS = 10 * 60;
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    const calc = () => setSecondsLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const secs = (secondsLeft % 60).toString().padStart(2, '0');
  const pct = (secondsLeft / TOTAL_SECONDS) * 100;
  const isWarning = secondsLeft < 60;
  return (
    <div className="text-center">
      <p className="text-text-muted text-xs uppercase tracking-widest mb-2">Zbývající čas přístupu</p>
      <div className={`text-7xl font-black font-mono tabular-nums transition-colors ${isWarning ? 'text-st-red' : 'text-st-cyan'}`}
        style={{ textShadow: isWarning ? '0 0 30px rgba(239,68,68,0.6)' : '0 0 30px rgba(6,182,212,0.6)' }}>
        {mins}:{secs}
      </div>
      <div className="mt-4 max-w-xs mx-auto">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-st-red' : 'bg-st-cyan'}`}
            style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Teacher Card ────────────────────────────────────────────────────────────
function TeacherCard({ teacher, onBuy, disabled }: { teacher: Teacher; onBuy: (t: Teacher) => void; disabled: boolean }) {
  const rc = RARITY_CONFIG[teacher.rarity] || RARITY_CONFIG.COMMON;
  const isMythic = teacher.rarity === 'MYTHIC';

  return (
    <button
      onClick={() => onBuy(teacher)}
      disabled={disabled}
      className={`relative group text-left rounded-2xl p-5 transition-all w-full disabled:cursor-not-allowed glass-card-static ${!isMythic ? `border ${rc.borderColor} hover:bg-white/[0.06]` : 'mythic-border'}`}
      style={!isMythic ? {
        boxShadow: `0 0 0px 0px ${rc.glowColor}`,
        transition: 'box-shadow 0.3s ease',
      } : {}}
      onMouseEnter={e => { if (!isMythic) (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px 4px ${rc.glowColor}`; }}
      onMouseLeave={e => { if (!isMythic) (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0px 0px ${rc.glowColor}`; }}
    >
      {/* Rarity badge */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${isMythic ? 'mythic-badge' : rc.badgeBg}`}>
          {isMythic ? <span className="mythic-text">{rc.label}</span> : rc.label}
        </span>
        <span className="text-xs font-bold font-mono">
          {isMythic ? <span className="mythic-text">Pass Only</span> : <span style={{ color: rc.color }}>{rc.cost} ST</span>}
        </span>
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isMythic ? 'mythic-badge' : rc.badgeBg}`}>
          <span className={isMythic ? 'mythic-text' : rc.textColor}>{teacher.name.charAt(0)}</span>
        </div>
        <div>
          <p className={`font-semibold text-sm ${isMythic ? '' : ''}`}>
            {isMythic ? <span className="mythic-text">{teacher.name}</span> : teacher.name}
          </p>
          <p className="text-text-muted text-xs">FAV ZČU</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 text-xs" style={{ color: rc.isMythic ? undefined : rc.color }}>
        {isMythic
          ? <span className="mythic-text">🎲 Jen přes speciální Pass z Case</span>
          : `10 min přístup — ${rc.cost} ST`}
      </div>
    </button>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function StRoomPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [earlyExiting, setEarlyExiting] = useState(false);
  const [passCode, setPassCode] = useState('');
  const [redeemTeacherId, setRedeemTeacherId] = useState('');
  const [myPassCount, setMyPassCount] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      const [teacherRes, sessionRes] = await Promise.all([
        api.stRoom.teachers(),
        api.stRoom.session(),
      ]);
      // Sort by rarity order
      const sorted = (teacherRes.teachers || []).sort((a: Teacher, b: Teacher) =>
        RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
      );
      setTeachers(sorted);
      if (sessionRes.hasActiveSession) { setSession(sessionRes.session); setSessionExpired(false); }
      else setSession(null);

      // Load pass count
      try {
        const passRes = await api.cases.passes();
        setMyPassCount(passRes.count ?? 0);
      } catch {}
    } catch { /* silent */ }
    finally { setLoadingData(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!session) return;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    if (ms <= 0) { setSession(null); setSessionExpired(true); return; }
    const t = setTimeout(() => { setSession(null); setSessionExpired(true); }, ms);
    return () => clearTimeout(t);
  }, [session]);

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  async function handleBuy(teacher: Teacher) {
    if (teacher.rarity === 'MYTHIC') {
      showMsg('error', 'Mythic učitel vyžaduje speciální Pass. Nelze zakoupit za ST.');
      return;
    }
    if (!window.confirm(`Zaplatit ${teacher.cost} ST za 10-minutový přístup ke: ${teacher.name}?`)) return;
    setBuying(teacher.id);
    try {
      const res = await api.stRoom.buy({ teacherId: teacher.id });
      setSession(res.session);
      setSessionExpired(false);
      showMsg('success', `Přístup aktivován! Místnost s učitelem: ${teacher.name}`);
      refreshUser();
    } catch (err: any) { showMsg('error', err.message || 'Chyba při nákupu.'); }
    finally { setBuying(null); }
  }

  async function handleEarlyExit() {
    if (!window.confirm('Opustit ST-ROOM předčasně? Bude strženo 5 ST.')) return;
    setEarlyExiting(true);
    try {
      await api.stRoom.earlyExit();
      setSession(null);
      setSessionExpired(false);
      showMsg('success', 'Opustili jste ST-ROOM. Strženo 5 ST.');
      refreshUser();
    } catch (err: any) { showMsg('error', err.message || 'Chyba při odchodu.'); }
    finally { setEarlyExiting(false); }
  }

  async function handleRedeemPass() {
    if (!redeemTeacherId) return;
    if (!window.confirm('Uplatnit Mythic Pass pro vybraného učitele?')) return;
    try {
      const res = await api.stRoom.redeemPass({ teacherId: redeemTeacherId });
      setSession(res.session);
      setSessionExpired(false);
      setMyPassCount(c => Math.max(0, c - 1));
      showMsg('success', 'Mythic Pass uplatněn! Přístup aktivován.');
      refreshUser();
    } catch (err: any) { showMsg('error', err.message || 'Chyba při uplatnění passu.'); }
  }

  if (!user) return null;

  const balance = parseFloat(user.balance || '0');
  const rc = session ? (RARITY_CONFIG[session.teacher.rarity] || RARITY_CONFIG.COMMON) : null;

  return (
    <AppShell>
      <FloatingLogos />
      <div className="relative z-10 space-y-6 animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-st-cyan" style={{ textShadow: '0 0 20px rgba(6,182,212,0.4)' }}>
              🔐 ST-ROOM
            </h1>
            <p className="text-text-secondary text-sm mt-1">Prémiová výuková místnost (+ 2x bonus k těžbě! ⛏️)</p>
          </div>
          <div className="glass-card-static px-4 py-2 text-center">
            <p className="text-text-muted text-xs">Váš zůstatek</p>
            <p className="text-st-cyan font-mono font-bold">{balance.toFixed(4)} ST</p>
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

        {loadingData ? (
          <div className="glass-card p-16 text-center">
            <img src="/logo.png" alt="" className="w-16 h-16 object-contain mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
            <p className="text-text-secondary">Načítání ST-ROOM...</p>
          </div>
        ) : session ? (
          /* ── ACTIVE SESSION ── */
          <div className="space-y-6">
            <div
              className={`glass-card p-8 text-center relative overflow-hidden ${session.teacher.rarity === 'MYTHIC' ? 'mythic-border' : `border ${rc?.borderColor}`}`}
              style={session.teacher.rarity !== 'MYTHIC' ? { boxShadow: `0 0 50px ${rc?.glowColor}` } : {}}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${rc?.glowColor} 0%, transparent 70%)` }} />
              <div className="mb-6">
                <span className="text-4xl">🔓</span>
                <h2 className="text-xl font-bold text-st-emerald mt-2">PŘÍSTUP AKTIVNÍ</h2>
                <p className="text-text-secondary text-sm mt-1">
                  Místnost s: {session.teacher.rarity === 'MYTHIC'
                    ? <span className="mythic-text font-bold">{session.teacher.name}</span>
                    : <span className="font-bold" style={{ color: rc?.color }}>{session.teacher.name}</span>}
                </p>
                <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${session.teacher.rarity === 'MYTHIC' ? 'mythic-badge' : rc?.badgeBg}`}>
                  {session.teacher.rarity === 'MYTHIC' ? <span className="mythic-text">{rc?.label}</span> : rc?.label}
                </span>
              </div>
              <Countdown expiresAt={session.expiresAt} />

              {/* Early exit button */}
              <div className="mt-8 border-t border-white/5 pt-6">
                <button
                  onClick={handleEarlyExit}
                  disabled={earlyExiting}
                  className="mx-auto flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 bg-st-red-dim border border-st-red/20 text-st-red hover:bg-st-red/20"
                >
                  {earlyExiting ? '⏳ Odcházím...' : '🚪 Odejít dříve (−5 ST)'}
                </button>
              </div>
            </div>

            {/* Room content */}
            <div className="glass-card p-8">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><span>📋</span> ST-ROOM Konzole</h3>
              <div className="font-mono text-sm space-y-2 bg-black/30 rounded-xl p-6 border border-white/5">
                <p className="text-st-emerald">{'>'} Inicializace zabezpečeného kanálu...</p>
                <p className="text-text-secondary">{'>'} Uživatel: <span className="text-st-gold">{user.username}</span></p>
                <p className="text-text-secondary">{'>'} Oprávnění: <span className="text-st-emerald">OVĚŘENO</span></p>
                <p className="text-text-secondary">{'>'} Místnost:&nbsp;
                  {session.teacher.rarity === 'MYTHIC'
                    ? <span className="mythic-text">{session.teacher.name}</span>
                    : <span style={{ color: rc?.color }}>{session.teacher.name}</span>}
                </p>
                <p className="text-text-secondary">{'>'} Datum: <span className="text-text-muted">{new Date().toLocaleString('cs-CZ')}</span></p>
                <p className="text-text-secondary">{'>'} Expiruje: <span className="text-text-muted">{new Date(session.expiresAt).toLocaleTimeString('cs-CZ')}</span></p>
                <br />
                <p className="text-st-purple animate-pulse">{'>'} Kanál aktivní. Systém připraven.</p>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: '📅', label: 'Konzultační hodiny', desc: 'Po domluvě přes IS/STAG' },
                  { icon: '📧', label: 'Kontakt', desc: 'Přes UIS ZČU' },
                  { icon: '🏫', label: 'Katedra', desc: 'FAV – ZČU v Plzni' },
                ].map(item => (
                  <div key={item.label} className="glass-card-static p-4 text-center">
                    <span className="text-2xl">{item.icon}</span>
                    <p className="text-sm font-semibold mt-2">{item.label}</p>
                    <p className="text-text-muted text-xs mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── TEACHER SELECTION ── */
          <div className="space-y-6">
            {sessionExpired && (
              <div className="glass-card-static p-4 border border-st-red/30 text-center">
                <p className="text-st-red font-semibold">⏰ Vaše relace vypršela. Zakupte si nový přístup.</p>
              </div>
            )}

            {/* Legend */}
            <div className="glass-card-static p-4 flex flex-wrap gap-3 items-center">
              <span className="text-text-muted text-xs mr-1">Rarity:</span>
              {RARITY_ORDER.map(r => {
                const c = RARITY_CONFIG[r];
                return (
                  <span key={r} className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${r === 'MYTHIC' ? 'mythic-badge' : c.badgeBg}`}>
                    {r === 'MYTHIC' ? <span className="mythic-text">{c.label} (Pass)</span> : `${c.label} – ${c.cost} ST`}
                  </span>
                );
              })}
            </div>

            <div className="glass-card p-6">
              <h2 className="text-xl font-bold mb-2">Vyberte učitele</h2>
              <p className="text-text-secondary text-sm mb-6">
                Cena závisí na raritě. Během relace získáváš <span className="text-st-gold font-bold">2x ST pointy</span> z těžby!
              </p>

              {/* Group by rarity */}
              {RARITY_ORDER.map(rarity => {
                const group = teachers.filter(t => t.rarity === rarity);
                if (group.length === 0) return null;
                const rc2 = RARITY_CONFIG[rarity];
                return (
                  <div key={rarity} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-glass-border" />
                      <span className={`text-[11px] font-bold uppercase tracking-widest ${rarity === 'MYTHIC' ? 'mythic-text' : rc2.textColor}`}>
                        {rc2.label}
                      </span>
                      <div className="h-px flex-1 bg-glass-border" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {group.map(teacher => (
                        <TeacherCard
                          key={teacher.id}
                          teacher={teacher}
                          onBuy={handleBuy}
                          disabled={!!buying || (teacher.rarity !== 'MYTHIC' && balance < teacher.cost)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {balance < 50 && (
                <div className="mt-4 p-4 rounded-xl bg-st-red-dim border border-st-red/20 text-center">
                  <p className="text-st-red text-sm font-medium">❌ Nedostatečný zůstatek. Potřebujete alespoň 50 ST.</p>
                  <button onClick={() => router.push('/mining')} className="btn-primary mt-3 text-sm">⛏️ Jít Těžit</button>
                </div>
              )}
            </div>

            {/* Pass Redemption */}
            <div className="glass-card p-6 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,107,107,0.06) 0%, transparent 60%)' }} />
              <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                🎲 <span className="mythic-text">Mythic Pass</span>
                {myPassCount > 0 && (
                  <span className="ml-2 text-xs font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{myPassCount}× dostupný</span>
                )}
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                {myPassCount > 0
                  ? 'Máte Mythic Pass! Vyberte učitele a uplatněte ho.'
                  : 'Získejte Mythic Pass otevřením case v sekci Cases.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={redeemTeacherId}
                  onChange={e => setRedeemTeacherId(e.target.value)}
                  className="glass-input flex-1"
                  disabled={myPassCount === 0}
                >
                  <option value="">Vyberte Mythic učitele...</option>
                  {teachers.filter(t => t.rarity === 'MYTHIC').map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleRedeemPass}
                  disabled={!redeemTeacherId || myPassCount === 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,107,107,0.3), rgba(255,215,0,0.3), rgba(204,93,232,0.3))',
                    border: '1px solid rgba(255,215,0,0.3)',
                    color: '#ffd700',
                  }}
                >
                  🌈 Uplatnit Pass
                </button>
              </div>
              {myPassCount === 0 && (
                <button
                  onClick={() => router.push('/cases')}
                  className="mt-3 text-xs text-st-cyan hover:underline"
                >
                  📦 Jít na Cases →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
