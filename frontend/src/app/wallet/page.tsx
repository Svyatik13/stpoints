'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Transaction } from '@/types';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '@/lib/constants';
import AppShell from '@/components/layout/AppShell';
import { useToast } from '@/components/ui/Toast';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [walletAddress, setWalletAddress] = useState<string>('');

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferFee, setTransferFee] = useState<string | null>(null);
  const [transferTotal, setTransferTotal] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (showTransfer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showTransfer]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      api.wallet.balance().then(data => {
        setWalletAddress(data.address);
      }).catch(() => {});
    }
  }, [user, page]);

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const data = await api.wallet.transactions(page, 10);
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
    } catch {
    } finally {
      setTxLoading(false);
    }
  }

  useEffect(() => {
    if (!transferAmount || parseFloat(transferAmount) <= 0) {
      setTransferFee(null);
      setTransferTotal(null);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const data = await api.wallet.transferFee(transferAmount);
        setTransferFee(data.fee);
        setTransferTotal(data.total);
      } catch {
        setTransferFee(null);
        setTransferTotal(null);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [transferAmount]);

  async function handleTransfer() {
    if (!transferRecipient || !transferAmount) return;
    setTransferLoading(true);
    try {
      const result = await api.wallet.transfer({
        recipient: transferRecipient,
        amount: transferAmount,
        note: transferNote || undefined,
      });
      toast('success', `${result.amount} ST odesláno uživateli ${result.recipient} (poplatek: ${result.fee} ST)`);
      setShowTransfer(false);
      setTransferRecipient('');
      setTransferAmount('');
      setTransferNote('');
      fetchTransactions();
      window.location.reload();
    } catch (err: any) {
      toast('error', err.message);
    } finally {
      setTransferLoading(false);
    }
  }

  if (!user) return null;

  const balance = parseFloat(user.balance);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">

        {/* Balance Card — Clean & Minimal */}
        <div className="glass-card-static p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -m-20 w-48 h-48 bg-st-cyan/8 rounded-full blur-3xl pointer-events-none"></div>

          <p className="text-text-muted text-xs font-medium tracking-widest uppercase mb-3">
            Zůstatek
          </p>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-st-cyan drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
              {balance.toFixed(2)}
            </span>
            <span className="text-text-muted text-xl font-semibold tracking-wider">ST</span>
          </div>

          {walletAddress && (
            <p className="text-xs text-text-muted font-mono mb-6">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-st-emerald mr-1.5 animate-pulse"></span>
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-6)}
            </p>
          )}

          <button
            onClick={() => setShowTransfer(true)}
            className="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
            </svg>
            Provést Převod
          </button>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
            📝 Poslední Transakce
          </h2>

          {txLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-text-muted">
              <p className="text-3xl mb-2 opacity-50">📭</p>
              <p className="text-sm">Žádné transakce</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        tx.isIncoming ? 'bg-st-emerald' : 'bg-st-red'
                      }`}></div>
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {tx.description || 'Transakce'}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {new Date(tx.createdAt).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span className={`font-mono font-bold text-sm shrink-0 ml-3 ${
                      tx.isIncoming ? 'text-st-emerald' : 'text-st-red'
                    }`}>
                      {tx.isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} ST
                    </span>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-glass-border/20">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-xs text-text-muted hover:text-white disabled:opacity-30 transition-colors"
                  >
                    ← Předchozí
                  </button>
                  <span className="text-text-muted text-xs font-mono">{page}/{totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-xs text-text-muted hover:text-white disabled:opacity-30 transition-colors"
                  >
                    Další →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransfer && createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[999] flex items-center justify-center p-4" onClick={() => setShowTransfer(false)}>
          <div className="glass-card w-full max-w-md p-8 shadow-2xl border-white/[0.05]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold tracking-tight">Převod ST</h2>
              <button onClick={() => setShowTransfer(false)} className="text-text-muted hover:text-white text-lg">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1.5">Příjemce</label>
                <input
                  type="text"
                  value={transferRecipient}
                  onChange={e => setTransferRecipient(e.target.value)}
                  className="glass-input"
                  placeholder="@username nebo 0x..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1.5">Částka (ST)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  max={user.balance}
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="glass-input font-mono text-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-text-secondary block mb-1.5">Zpráva (Volitelné)</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={e => setTransferNote(e.target.value)}
                  className="glass-input"
                  placeholder="Důvod převodu..."
                  maxLength={100}
                />
              </div>

              {transferFee && transferTotal && (
                <div className="rounded-xl bg-st-cyan/5 border border-st-cyan/20 p-3">
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>Poplatek (2%)</span>
                    <span className="font-mono">{transferFee} ST</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white border-t border-st-cyan/20 pt-2 mt-2">
                    <span>Celkem</span>
                    <span className="font-mono text-st-cyan">{transferTotal} ST</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleTransfer}
                disabled={transferLoading || !transferRecipient || !transferAmount}
                className="w-full btn-primary py-3 rounded-xl font-bold tracking-wide disabled:opacity-50 mt-2"
              >
                {transferLoading ? 'Zpracování...' : 'Potvrdit Odeslání'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
}
