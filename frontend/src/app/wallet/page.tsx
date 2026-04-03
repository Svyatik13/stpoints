'use client';

import { useEffect, useState } from 'react';
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
  const [networkTotal, setNetworkTotal] = useState<string>('0');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchNetworkStats();
    }
  }, [user, page]);

  async function fetchNetworkStats() {
    try {
      const data = await api.mining.stats();
      setNetworkTotal(data.networkTotal || '0');
    } catch {}
  }

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const data = await api.wallet.transactions(page, 15);
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
    } catch {
      // silent fail
    } finally {
      setTxLoading(false);
    }
  }

  async function handleTransfer() {
    if (!transferRecipient || !transferAmount) return;
    setTransferLoading(true);
    try {
      const result = await api.wallet.transfer({
        recipient: transferRecipient,
        amount: transferAmount,
        note: transferNote || undefined,
      });
      toast('success', `${result.amount} ST odesláno uživateli ${result.recipient}`);
      setShowTransfer(false);
      setTransferRecipient('');
      setTransferAmount('');
      setTransferNote('');
      fetchTransactions();
      // Refresh user balance
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
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">💎 Moje Peněženka</h1>
            <p className="text-text-secondary text-sm mt-1">Přehled vašeho zůstatku a transakcí</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="glass-card p-8 glow-cyan">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-text-secondary text-sm uppercase tracking-wider mb-2">
                Aktuální Zůstatek
              </p>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-black font-mono text-st-cyan text-glow-cyan">
                  {balance.toFixed(6)}
                </span>
                <span className="text-text-secondary text-lg font-semibold">ST</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="badge badge-cyan">
                ZČU Central Node
              </div>
              <button
                onClick={() => setShowTransfer(true)}
                className="btn-primary text-sm px-5 py-2"
              >
                📤 Převést ST
              </button>
            </div>
          </div>
        </div>

        {/* Transfer Modal */}
        {showTransfer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTransfer(false)}>
            <div className="glass-card w-full max-w-md p-6 animate-fade-up" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">📤 Převést ST</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Příjemce</label>
                  <input
                    type="text"
                    value={transferRecipient}
                    onChange={e => setTransferRecipient(e.target.value)}
                    className="glass-input"
                    placeholder="Uživatelské jméno"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Částka (ST)</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0.000001"
                    max={user.balance}
                    value={transferAmount}
                    onChange={e => setTransferAmount(e.target.value)}
                    className="glass-input"
                    placeholder="0.000000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Poznámka (volitelné)</label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={e => setTransferNote(e.target.value)}
                    className="glass-input"
                    placeholder="Důvod převodu..."
                    maxLength={100}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowTransfer(false)} className="btn-secondary flex-1">
                    Zrušit
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={transferLoading || !transferRecipient || !transferAmount}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {transferLoading ? 'Odesílám...' : 'Odeslat'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="glass-card-static p-5">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Status</p>
            <p className="text-st-emerald font-semibold">● Online</p>
          </div>
          <div className="glass-card-static p-5">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Role</p>
            <p className="text-text-primary font-semibold">{user.role === 'ADMIN' ? '👑 Administrátor' : '👤 Uživatel'}</p>
          </div>
          <div className="glass-card-static p-5">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Účet vytvořen</p>
            <p className="text-text-primary font-semibold text-sm">{new Date(user.createdAt).toLocaleDateString('cs-CZ')}</p>
          </div>
          <div className="glass-card-static p-5 border-st-gold/20 glow-gold relative overflow-hidden group">
            <div className="absolute inset-0 bg-st-gold opacity-0 group-hover:opacity-5 transition-opacity" />
            <p className="text-text-muted text-xs uppercase tracking-wider mb-1">ST-Points v Oběhu</p>
            <p className="text-st-gold font-mono font-bold text-lg">{parseFloat(networkTotal).toFixed(2)} ST</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="glass-card-static p-6">
          <h2 className="text-xl font-bold mb-4">📋 Historie Transakcí</h2>

          {txLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-4xl mb-3">📭</p>
              <p>Zatím žádné transakce</p>
              <p className="text-sm">Začněte těžit a získejte ST-Points!</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {transactions.map((tx, i) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`badge ${TRANSACTION_TYPE_COLORS[tx.type] || 'badge-cyan'}`}>
                        {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                      </span>
                      <div>
                        <p className="text-sm text-text-primary">{tx.description || 'Transakce'}</p>
                        <p className="text-xs text-text-muted">
                          {new Date(tx.createdAt).toLocaleString('cs-CZ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-semibold text-sm ${tx.isIncoming ? 'text-st-emerald' : 'text-st-red'}`}>
                        {tx.isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(6)} ST
                      </p>
                      <p className="text-xs text-text-muted font-mono">
                        → {parseFloat(tx.balanceAfter).toFixed(6)} ST
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    ← Předchozí
                  </button>
                  <span className="text-text-secondary text-sm">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    Další →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
