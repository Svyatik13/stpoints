'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

const APY_OPTIONS = [
  { days: 7, apy: 5 },
  { days: 30, apy: 12 },
  { days: 90, apy: 25 },
  { days: 180, apy: 35 },
  { days: 365, apy: 50 },
];

export default function VaultPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [stakes, setStakes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeDuration, setStakeDuration] = useState(7);
  const [isStaking, setIsStaking] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchStakes();
    }
  }, [user]);

  async function fetchStakes() {
    setLoading(true);
    try {
      const res = await api.vault.get();
      setStakes(res.stakes);
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStake() {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    setIsStaking(true);
    try {
      await api.vault.stake({
        amount: parseFloat(stakeAmount),
        durationDays: stakeDuration,
      });
      toast('success', 'ST úspěšně uzamčeny v trezoru!');
      setStakeAmount('');
      fetchStakes();
      window.location.reload(); // Refresh balance
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setIsStaking(false);
    }
  }

  async function handleEarlyUnstake(id: string) {
    if (!confirm('Opravdu chcete vybrat předčasně? Ztratíte 25 % z úroku!')) return;
    try {
      await api.vault.earlyUnstake(id);
      toast('success', 'Trezor předčasně odemčen.');
      fetchStakes();
      window.location.reload(); // Refresh balance
    } catch (err: any) {
      toast('error', err.message);
    }
  }

  // Countdown timer internal hook for stakes
  function TimeLeft({ unlocksAt, status }: { unlocksAt: string, status: string }) {
    const [timeLeft, setTimeLeft] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
      if (status !== 'ACTIVE') return;
      const target = new Date(unlocksAt).getTime();
      const created = new Date(unlocksAt).getTime() - (90 * 24 * 60 * 60 * 1000); // Approximate progress

      const interval = setInterval(() => {
        const now = Date.now();
        const diff = target - now;

        if (diff <= 0) {
          setTimeLeft('Dokončeno (Očekává se vyplacení)');
          setProgress(100);
          clearInterval(interval);
          return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      }, 1000);

      return () => clearInterval(interval);
    }, [unlocksAt, status]);

    if (status !== 'ACTIVE') return <span className="text-text-muted">Odemčeno</span>;
    return <span className="font-mono text-st-cyan">{timeLeft || 'Počítám...'}</span>;
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight text-white mb-3">Trezor</h1>
          <p className="text-text-secondary">Zamkněte své ST a nechte je vydělávat za vás s garantovaným ročním výnosem (APY).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Stake Form */}
          <div className="glass-card-static p-6 sm:p-8 relative overflow-hidden h-fit">
            <div className="absolute top-0 right-0 -m-20 w-48 h-48 bg-st-gold/5 rounded-full blur-3xl pointer-events-none"></div>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span className="text-st-gold">🏦</span> Nový Vklad
            </h2>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Částka k uzamčení</label>
                  <span className="text-xs font-mono text-text-muted">K dispozici: {parseFloat(user.balance).toFixed(2)} ST</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="glass-input font-mono text-lg"
                    placeholder="0.00"
                  />
                  <button 
                    onClick={() => setStakeAmount(user.balance)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-white transition-colors uppercase"
                  >
                    Max
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-3">Doba uzamčení</label>
                <div className="grid grid-cols-5 gap-2">
                  {APY_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      onClick={() => setStakeDuration(opt.days)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border ${
                        stakeDuration === opt.days 
                          ? 'border-st-gold bg-st-gold/10' 
                          : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xs font-bold text-white mb-1">{opt.days}D</span>
                      <span className={`text-[10px] font-mono font-bold ${stakeDuration === opt.days ? 'text-st-gold' : 'text-text-muted'}`}>
                        {opt.apy}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {stakeAmount && parseFloat(stakeAmount) > 0 && (
                <div className="bg-st-cyan/5 border border-st-cyan/20 rounded-xl p-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-text-secondary">Očekávaný výnos ({stakeDuration} dnů):</span>
                    <span className="font-mono text-st-cyan font-bold">
                      +{(parseFloat(stakeAmount) * (APY_OPTIONS.find(o => o.days === stakeDuration)!.apy / 100) * (stakeDuration / 365)).toFixed(4)} ST
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={handleStake}
                disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0 || parseFloat(stakeAmount) > parseFloat(user.balance)}
                className="w-full btn-primary py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(to right, #ea580c, #fbbf24)' }}
              >
                {isStaking ? 'Uzamykání...' : 'Uzamknout ST'}
              </button>
            </div>
          </div>

          {/* Active Stakes List */}
          <div className="glass-card-static p-6 sm:p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <span>Moje Trezory</span>
            </h2>

            {loading ? (
               <div className="space-y-4">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className="h-20 rounded-xl bg-white/[0.02] animate-pulse" />
               ))}
             </div>
            ) : stakes.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <p className="text-4xl mb-4 opacity-50">📭</p>
                <p className="text-sm">Nemáte žádné aktivní trezory.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stakes.map((stake) => (
                  <div key={stake.id} className="bg-white/5 border border-white/5 rounded-xl p-4 hover:bg-white/[0.07] transition-all flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-mono font-black text-white">{parseFloat(stake.amount).toFixed(2)} ST</p>
                        <p className="text-xs text-st-gold font-bold">🎯 +{parseFloat(stake.expectedYield).toFixed(4)} ST ({stake.apy}% APY)</p>
                      </div>
                      <div className="text-right">
                        {stake.status === 'ACTIVE' ? (
                          <div className="inline-block px-2 py-1 bg-st-cyan/10 border border-st-cyan/30 text-st-cyan rounded text-[10px] uppercase font-bold tracking-wider">
                            Aktivní
                          </div>
                        ) : (
                          <div className="inline-block px-2 py-1 bg-st-emerald/10 border border-st-emerald/30 text-st-emerald rounded text-[10px] uppercase font-bold tracking-wider">
                            Vyplaceno
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
                      <div className="text-xs text-text-secondary">
                        <span className="block mb-0.5 uppercase tracking-wider text-[9px] opacity-70">Zbývá času</span>
                        <TimeLeft unlocksAt={stake.unlocksAt} status={stake.status} />
                      </div>
                      {stake.status === 'ACTIVE' && (
                        <button 
                          onClick={() => handleEarlyUnstake(stake.id)}
                          className="text-[10px] uppercase font-bold tracking-wider text-st-red hover:bg-st-red/10 px-2 py-1 rounded transition-colors"
                        >
                          Předčasný Výběr (-25% výnos)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
