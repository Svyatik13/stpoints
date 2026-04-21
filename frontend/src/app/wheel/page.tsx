'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins, Timer, Trophy, History, Users, ArrowUpRight } from 'lucide-react';
import TitleBadge from '@/components/common/TitleBadge';

// Vibrant colors for wheel segments
const SEGMENT_COLORS = [
  '#00e8ff', '#a855f7', '#fbbf24', '#10b981', '#ef4444', 
  '#f472b6', '#6366f1', '#f97316', '#22d3ee', '#d946ef'
];

export default function WheelPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [round, setRound] = useState<any>(null);
  const [betAmount, setBetAmount] = useState('10');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [betting, setBetting] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const prevStatus = useRef<string | null>(null);

  // Poll for current round
  useEffect(() => {
    const fetchRound = async () => {
      try {
        const data = await api.wheel.current();
        setRound(data.round);
        
        // Handle transitions
        if (prevStatus.current === 'COUNTDOWN' && data.round.status === 'FINISHED') {
          handleWinSpin(data.round);
        }
        
        prevStatus.current = data.round.status;
        setLoading(false);
      } catch (err) {
        console.error('Wheel poll error:', err);
      }
    };

    fetchRound();
    const interval = setInterval(fetchRound, 2000);
    return () => clearInterval(interval);
  }, []);

  // Poll history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.wheel.history();
        setHistory(data.history);
      } catch {}
    };
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (round?.status === 'COUNTDOWN' && round.endsAt) {
      const end = new Date(round.endsAt).getTime();
      const update = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((end - now) / 1000));
        setCountdown(diff);
      };
      update();
      const itv = setInterval(update, 1000);
      return () => clearInterval(itv);
    } else {
      setCountdown(null);
    }
  }, [round?.status, round?.endsAt]);

  const handleWinSpin = (finishedRound: any) => {
    if (isSpinning) return;

    setIsSpinning(true);
    // Base rotation + logic to land on winningNumber
    // winningNumber is 0-100. 0 is 0deg, 100 is 360deg.
    // However, wheels spin clockwise, so 0 is top (270deg in SVG space usually)
    // We want the winning segment to be under the pointer (at 0 degrees/top)
    
    const extraSpins = 5; // Spin 5 times
    const targetDeg = (finishedRound.winningNumber / 100) * 360;
    // To land at top (0deg), the wheel needs to rotate such that targetDeg is at the pointer position.
    // Pointer is at top (offset 0). 
    // SVG rotation is -targetDeg to align.
    const finalRotation = rotation + (360 * extraSpins) + (360 - targetDeg);
    
    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const isWinner = finishedRound.winnerId === user?.id;
      if (isWinner) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00e8ff', '#fbbf24', '#ffffff']
        });
        toast('success', `Gratulujeme! Vyhrál jsi ve Wheel!`);
        refreshUser();
      }
    }, 5000); // Animation duration
  };

  const placeBet = async () => {
    if (!betAmount || Number(betAmount) <= 0) return;
    try {
      setBetting(true);
      await api.wheel.bet(betAmount);
      toast('success', `Sázka ${betAmount} ST byla podána.`);
      refreshUser();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setBetting(false);
    }
  };

  if (loading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-st-cyan/20 border-t-st-cyan rounded-full animate-spin" />
      </div>
    </AppShell>
  );

  // Group bets by user for the wheel segments
  const userBets: any[] = [];
  let currentPos = 0;
  
  // Actually, we should use the raw bets for the segments
  const total = Number(round?.totalAmount || 0);

  return (
    <AppShell>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-up">
        
        {/* Main Wheel Area */}
        <div className="lg:col-span-8 flex flex-col items-center gap-8">
          <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
            
            {/* Pointer (at Top) */}
            <div className="absolute top-[-10px] left-1/2 -translate-x-1/2 z-20">
              <div className="w-8 h-10 bg-st-gold clip-path-pointer shadow-[0_0_15px_rgba(251,191,36,0.5)] flex items-center justify-center pb-2">
                 <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              </div>
            </div>

            {/* The SVG Wheel */}
            <motion.div 
              className="w-full h-full rounded-full border-[8px] border-surface-600 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative"
              animate={{ rotate: rotation }}
              transition={{ duration: isSpinning ? 5 : 0, ease: "easeOut" }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {total === 0 ? (
                  <circle cx="50" cy="50" r="50" fill="#1e1b4b" />
                ) : (
                  (round?.bets || []).map((bet: any, i: number) => {
                    const start = (userBets.reduce((acc, b) => acc + Number(b.amount), 0) / total) * 100;
                    const size = (Number(bet.amount) / total) * 100;
                    
                    // Path for a slice
                    const x1 = 50 + 50 * Math.cos(2 * Math.PI * (currentPos / 100));
                    const y1 = 50 + 50 * Math.sin(2 * Math.PI * (currentPos / 100));
                    currentPos += size;
                    const x2 = 50 + 50 * Math.cos(2 * Math.PI * (currentPos / 100));
                    const y2 = 50 + 50 * Math.sin(2 * Math.PI * (currentPos / 100));
                    
                    const longArc = size > 50 ? 1 : 0;
                    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];

                    return (
                      <path
                        key={bet.id}
                        d={`M 50 50 L ${x1} ${y1} A 50 50 0 ${longArc} 1 ${x2} ${y2} Z`}
                        fill={color}
                        stroke="#000"
                        strokeWidth="0.1"
                      />
                    );
                  })
                )}
                <circle cx="50" cy="50" r="8" fill="#0f172a" stroke="#fff" strokeWidth="0.5" />
              </svg>
            </motion.div>

            {/* Center Info */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="w-32 h-32 rounded-full bg-surface-900/80 backdrop-blur-md flex flex-col items-center justify-center border border-white/10">
                 {round?.status === 'COUNTDOWN' ? (
                   <>
                     <span className="text-st-gold text-2xl font-bold font-mono">{countdown}s</span>
                     <span className="text-[10px] text-text-muted uppercase tracking-widest mt-1">Spinning...</span>
                   </>
                 ) : round?.status === 'WAITING' ? (
                   <>
                     <Users className="w-6 h-6 text-st-cyan mb-1" />
                     <span className="text-[10px] text-text-muted uppercase text-center px-4">Waiting for players</span>
                   </>
                 ) : (
                   <div className="animate-pulse flex flex-col items-center">
                     <Trophy className="w-6 h-6 text-st-gold" />
                   </div>
                 )}
               </div>
            </div>
          </div>

          {/* Pot Stat Cards */}
          <div className="grid grid-cols-3 gap-4 w-full">
            <div className="glass-card-static p-4 flex flex-col items-center">
              <Coins className="w-5 h-5 text-st-gold mb-1" />
              <span className="text-xl font-bold font-mono text-st-gold">{total.toFixed(2)}</span>
              <span className="text-[10px] text-text-muted uppercase">Celkový Pot</span>
            </div>
            <div className="glass-card-static p-4 flex flex-col items-center">
              <Users className="w-5 h-5 text-st-cyan mb-1" />
              <span className="text-xl font-bold font-mono text-st-cyan">{round?.bets?.length || 0}</span>
              <span className="text-[10px] text-text-muted uppercase">Hráči</span>
            </div>
            <div className="glass-card-static p-4 flex flex-col items-center">
              <ArrowUpRight className="w-5 h-5 text-st-emerald mb-1" />
              <span className="text-xl font-bold font-mono text-st-emerald">
                {user ? ((Number((round?.bets || []).find((b: any) => b.userId === user.id)?.amount || 0) / (total || 1)) * 100).toFixed(1) : 0}%
              </span>
              <span className="text-[10px] text-text-muted uppercase">Tvá Šance</span>
            </div>
          </div>
        </div>

        {/* Betting Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card-static p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <div className="p-2 bg-st-cyan-dim rounded-lg">
                <Coins className="w-5 h-5 text-st-cyan" />
              </div>
              <h2 className="text-lg font-bold">Podat Sázku</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted mb-1.5 block">Sázka (ST)</label>
                <div className="relative">
                  <input 
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="glass-input text-xl font-bold font-mono pr-12"
                    placeholder="0.00"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted font-bold text-xs">ST</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {['10', '50', '100', '500'].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setBetAmount(val)} 
                      className="py-1.5 text-[10px] font-bold bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 transition-all"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={placeBet}
                disabled={betting || round?.status === 'SPINNING'}
                className="btn-primary w-full py-4 text-sm flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                {betting ? (
                   <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <> podsadit Sázku <ArrowUpRight className="w-4 h-4" /> </>
                )}
              </button>

              <div className="p-3 bg-white/5 rounded-xl text-[10px] text-text-secondary leading-relaxed border border-white/5">
                Šance na výhru je poměrná k vaší sázce v celkovém potu. Poplatek platformy je 3%.
              </div>
            </div>
          </div>

          {/* Current Players List */}
          <div className="glass-card-static overflow-hidden">
             <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
               <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                 <Users className="w-3 h-3 text-st-cyan" /> Hráči v kole
               </h3>
               <span className="text-[10px] font-bold py-0.5 px-2 bg-st-cyan-dim text-st-cyan rounded-full">
                 {round?.bets?.length || 0}
               </span>
             </div>
             <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
               {(round?.bets || []).length === 0 ? (
                 <div className="py-8 text-center text-[11px] text-text-muted">
                    Zatím žádné sázky... Buď první!
                 </div>
               ) : (
                 [...(round?.bets || [])].reverse().map((bet: any, i: number) => {
                    const color = SEGMENT_COLORS[((round?.bets || []).length - 1 - i) % SEGMENT_COLORS.length];
                   return (
                     <div key={bet.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                           <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: color }} />
                           <div className="flex flex-col">
                             <span className="text-sm font-semibold">{bet.user.username}</span>
                             <span className="text-[10px] text-text-muted">{((Number(bet.amount) / total) * 100).toFixed(1)}% podíl</span>
                           </div>
                        </div>
                        <span className="font-mono font-bold text-st-cyan text-sm">{Number(bet.amount).toFixed(2)} ST</span>
                     </div>
                   );
                 })
               )}
             </div>
          </div>
        </div>

        {/* Global History */}
        <div className="lg:col-span-12">
           <div className="glass-card-static p-6">
              <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-st-purple" />
                <h2 className="text-lg font-bold">Poslední Kola</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {history.map((h: any) => (
                  <div key={h.id} className="p-4 border border-white/5 rounded-2xl bg-white/[0.02] flex items-center justify-between group hover:border-st-gold/30 transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-st-gold/10 flex items-center justify-center text-st-gold border border-st-gold/20 group-hover:scale-110 transition-transform">
                          <Trophy className="w-5 h-5" />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-sm font-bold truncate max-w-[100px]">{h.bets.find((b: any) => b.userId === h.winnerId)?.user.username || 'Unknown'}</span>
                          <span className="text-[10px] text-text-muted font-mono">{new Date(h.resolvedAt).toLocaleTimeString()}</span>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-st-gold font-bold font-mono text-sm">+{Number(h.totalAmount * 0.97).toFixed(2)} ST</p>
                       <p className="text-[10px] text-text-muted">{h.bets.length} hráčů</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>

      <style jsx>{`
        .clip-path-pointer {
          clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
        }
      `}</style>
    </AppShell>
  );
}
