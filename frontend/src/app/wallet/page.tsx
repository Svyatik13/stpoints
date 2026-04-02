'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Transaction } from '@/types';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_TYPE_COLORS } from '@/lib/constants';
import AppShell from '@/components/layout/AppShell';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, page]);

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
            <div className="flex flex-col items-end gap-2">
              <div className="badge badge-cyan">
                ZČU Central Node
              </div>
              <p className="text-text-muted text-xs font-mono">
                ID: {user.id.slice(0, 12)}...
              </p>
            </div>
          </div>

          {/* Balance bar visual */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>0 ST</span>
              <span>500 ST (ST-RM Access)</span>
            </div>
            <div className="mining-progress-bar">
              <div
                className="mining-progress-fill"
                style={{ width: `${Math.min((balance / 500) * 100, 100)}%` }}
              />
            </div>
            <p className="text-text-muted text-xs mt-1">
              {balance >= 500
                ? '✅ Přístup k ST-RM Terminálu odemčen'
                : `${(500 - balance).toFixed(6)} ST do odemčení ST-RM Terminálu`
              }
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
