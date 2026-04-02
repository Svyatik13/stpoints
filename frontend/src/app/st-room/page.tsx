'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

interface Teacher {
  id: string;
  name: string;
  isActive: boolean;
}

interface Session {
  id: string;
  teacherId: string;
  expiresAt: string;
  teacher: Teacher;
}

const TOTAL_SECONDS = 10 * 60; // 10 minutes

function FloatingLogos() {
  const logos = Array.from({ length: 12 });
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {logos.map((_, i) => {
        const size = 80 + Math.random() * 120;
        const delay = i * 1.5;
        const duration = 18 + (i % 5) * 4;
        const left = (i * 8.5) % 100;
        const rotate = (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 8);
        return (
          <div
            key={i}
            className="absolute opacity-[0.05] select-none"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              bottom: '-150px',
              animation: `floatUp ${duration}s ${delay}s linear infinite`,
              transform: `rotate(${rotate}deg)`,
            }}
          >
            <img src="/logo.png" alt="" className="w-full h-full object-contain" />
          </div>
        );
      })}
      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.04; }
          10% { opacity: 0.07; }
          90% { opacity: 0.04; }
          100% { transform: translateY(-120vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
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
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isWarning ? 'bg-st-red' : 'bg-st-cyan'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function StRoomPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
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
      setTeachers(teacherRes.teachers || []);
      if (sessionRes.hasActiveSession) {
        setSession(sessionRes.session);
        setSessionExpired(false);
      } else {
        setSession(null);
      }
    } catch {
      // silent
    } finally {
      setLoadingData(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-expire check
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
    if (!window.confirm(`Zaplatit 50 ST za 10-minutový přístup ke: ${teacher.name}?`)) return;
    setBuying(teacher.id);
    try {
      const res = await api.stRoom.buy({ teacherId: teacher.id });
      setSession(res.session);
      setSessionExpired(false);
      showMsg('success', `Přístup aktivován! Místnost s učitelem: ${teacher.name}`);
      if (refreshUser) refreshUser();
    } catch (err: any) {
      showMsg('error', err.message || 'Chyba při nákupu přístupu.');
    } finally {
      setBuying(null);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <FloatingLogos />
      <div className="relative z-10 space-y-6 animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-st-cyan"
              style={{ textShadow: '0 0 20px rgba(6,182,212,0.4)' }}>
              🔐 ST-ROOM
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Prémiový přístup k výukové místnosti — 50 ST / 10 minut
            </p>
          </div>
          <div className="glass-card-static px-4 py-2 text-center">
            <p className="text-text-muted text-xs">Váš zůstatek</p>
            <p className="text-st-cyan font-mono font-bold">{parseFloat(user.balance || '0').toFixed(4)} ST</p>
          </div>
        </div>

        {/* Message Toast */}
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
            {/* Countdown Card */}
            <div className="glass-card p-8 text-center relative overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(6,182,212,0.15), 0 0 80px rgba(6,182,212,0.05)' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.05) 0%, transparent 70%)' }} />
              
              <div className="mb-6">
                <span className="text-4xl">🔓</span>
                <h2 className="text-xl font-bold text-st-emerald mt-2">PŘÍSTUP AKTIVNÍ</h2>
                <p className="text-text-secondary text-sm mt-1">
                  Místnost s učitelem: <span className="text-st-cyan font-bold">{session.teacher.name}</span>
                </p>
              </div>

              <Countdown expiresAt={session.expiresAt} />
            </div>

            {/* Room Content */}
            <div className="glass-card p-8 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.06) 0%, transparent 60%)' }} />
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <span>📋</span> ST-ROOM Konzole
              </h3>
              <div className="font-mono text-sm space-y-2 bg-black/30 rounded-xl p-6 border border-white/5">
                <p className="text-st-emerald">{'>'} Inicializace zabezpečeného kanálu...</p>
                <p className="text-text-secondary">{'>'} Uživatel: <span className="text-st-gold">{user.username}</span></p>
                <p className="text-text-secondary">{'>'} Oprávnění: <span className="text-st-emerald">OVĚŘENO</span></p>
                <p className="text-text-secondary">{'>'} Místnost: <span className="text-st-cyan">{session.teacher.name}</span></p>
                <p className="text-text-secondary">{'>'} Datum: <span className="text-text-muted">{new Date().toLocaleString('cs-CZ')}</span></p>
                <p className="text-text-secondary">{'>'} Expires: <span className="text-text-muted">{new Date(session.expiresAt).toLocaleTimeString('cs-CZ')}</span></p>
                <br />
                <p className="text-st-purple animate-pulse">{'>'} Kanál aktivní. Připraveno.</p>
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

            <div className="glass-card p-6">
              <h2 className="text-xl font-bold mb-2">Vyberte učitele</h2>
              <p className="text-text-secondary text-sm mb-6">
                Po výběru bude strženo <span className="text-st-gold font-bold">50 ST</span> a získáte <span className="text-st-cyan font-bold">10 minut</span> přístupu do ST-ROOM.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    onClick={() => handleBuy(teacher)}
                    disabled={!!buying || parseFloat(user.balance || '0') < 50}
                    className="relative group glass-card-static p-5 text-left rounded-2xl border border-glass-border hover:border-st-cyan/40 hover:bg-white/[0.06] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'radial-gradient(ellipse at top left, rgba(6,182,212,0.08) 0%, transparent 60%)' }} />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-st-cyan-dim flex items-center justify-center text-st-cyan font-bold text-sm flex-shrink-0">
                        {teacher.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{teacher.name}</p>
                        <p className="text-text-muted text-xs">FAV ZČU</p>
                      </div>
                    </div>
                    {buying === teacher.id && (
                      <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/50">
                        <span className="text-st-cyan text-sm animate-pulse">⏳ Zpracování...</span>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-text-muted">10 min přístup</span>
                      <span className="text-xs font-bold text-st-gold">50 ST</span>
                    </div>
                  </button>
                ))}
              </div>

              {parseFloat(user.balance || '0') < 50 && (
                <div className="mt-6 p-4 rounded-xl bg-st-red-dim border border-st-red/20 text-center">
                  <p className="text-st-red text-sm font-medium">
                    ❌ Nedostatečný zůstatek. Potřebujete alespoň 50 ST.
                  </p>
                  <button onClick={() => router.push('/mining')} className="btn-primary mt-3 text-sm">
                    ⛏️ Jít Těžit
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
