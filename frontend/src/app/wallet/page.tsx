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
import { useI18n } from '@/lib/i18n';

export default function WalletPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [networkTotal, setNetworkTotal] = useState<string>('0');
  const [price, setPrice] = useState<{ price: string; change24h: string; marketCap: string; volume24h: number; holders: number } | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferFee, setTransferFee] = useState<string | null>(null);
  const [transferTotal, setTransferTotal] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  // Lock body scroll when modal is open
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

  async function fetchNetworkStats() {
    try {
      const data = await api.mining.stats();
      setNetworkTotal(data.networkTotal || '0');
    } catch {}
  }

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchNetworkStats();
    }
  }, [user, page]);

  useEffect(() => {
    if (!user) return;
    api.wallet.price().then(setPrice).catch(() => {});
    api.wallet.balance().then(data => {
      setWalletAddress(data.address);
    }).catch(() => {});
  }, [user]);

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

  // Fetch fee when amount changes
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
            <h1 className="text-3xl font-bold tracking-tight">💎 {t.wallet.title}</h1>
            <p className="text-text-secondary text-sm mt-1">{t.wallet.subtitle}</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="glass-card p-6 sm:p-8 glow-cyan">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="text-text-secondary text-sm uppercase tracking-wider">{t.wallet.balance}</p>
                {price && (
                  <span className="text-xs font-mono text-st-gold bg-st-gold/10 px-2 py-0.5 rounded-full">
                    ${price.price} <span className={parseFloat(price.change24h) >= 0 ? 'text-st-emerald' : 'text-st-red'}>{parseFloat(price.change24h) >= 0 ? '▲' : '▼'}{price.change24h}%</span>
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-black font-mono text-st-cyan text-glow-cyan">
                  {balance.toFixed(6)}
                </span>
                <span className="text-text-secondary text-lg font-semibold">ST</span>
              </div>
              {walletAddress && (
                <button
                  onClick={() => { navigator.clipboard.writeText(walletAddress); toast('success', 'Address copied!'); }}
                  className="mt-2 flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors font-mono"
                  title={walletAddress}
                >
                  📋 {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </button>
              )}
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-2 mb-1">
                <div className="badge badge-cyan">ZČU Central Node</div>
                <div className="badge badge-purple font-mono">STATUS: ACTIVE</div>
              </div>
              {price && (
                <div className="text-right">
                  <p className="text-xs text-text-muted uppercase tracking-wider">ST/USD</p>
                  <p className="text-lg font-bold font-mono text-st-gold">${price.price}</p>
                  <p className={`text-xs font-mono ${parseFloat(price.change24h) >= 0 ? 'text-st-emerald' : 'text-st-red'}`}>
                    {parseFloat(price.change24h) >= 0 ? '▲' : '▼'} {price.change24h}%
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowTransfer(true)}
                className="btn-primary text-sm px-5 py-2"
              >
                📤 {t.wallet.transfer}
              </button>
            </div>
          </div>
        </div>

        {/* Transfer Modal — portaled to body for proper centering */}
        {showTransfer && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={() => setShowTransfer(false)}>
            <div className="glass-card w-full max-w-md p-6 animate-fade-up max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-xl font-bold mb-4">📤 {t.wallet.transfer}</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">{t.wallet.transferRecipient}</label>
                  <input
                    type="text"
                    value={transferRecipient}
                    onChange={e => setTransferRecipient(e.target.value)}
                    className="glass-input"
                    placeholder="Username nebo Adresa (0x...)"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">{t.wallet.transferAmount}</label>
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
                  <label className="text-sm font-medium text-text-secondary block mb-1">{t.wallet.transferNote}</label>
                  <input
                    type="text"
                    value={transferNote}
                    onChange={e => setTransferNote(e.target.value)}
                    className="glass-input"
                    placeholder="Důvod převodu..."
                    maxLength={100}
                  />
                </div>

                {/* Fee preview */}
                {transferFee && transferTotal && (
                  <div className="rounded-xl bg-white/[0.03] border border-glass-border/30 p-3 space-y-1">
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>⛽ Gas poplatek (2%)</span>
                      <span className="font-mono text-st-gold">{transferFee} ST</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-text-primary">
                      <span>Celkem</span>
                      <span className="font-mono text-st-cyan">{transferTotal} ST</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowTransfer(false)} className="btn-secondary flex-1">
                    {t.common.cancel}
                  </button>
                  <button
                    onClick={handleTransfer}
                    disabled={transferLoading || !transferRecipient || !transferAmount}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    {transferLoading ? t.wallet.transferSending : t.common.send}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Network Bar */}
        <div className="glass-card-static px-5 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs">
          <span className="text-text-muted">MCap <span className="font-mono text-st-gold font-semibold">${price?.marketCap || '–'}</span></span>
          <span className="text-text-muted">Supply <span className="font-mono text-st-cyan font-semibold">{parseFloat(networkTotal).toFixed(2)} ST</span></span>
          <span className="text-text-muted">24h Vol <span className="font-mono text-text-primary font-semibold">{price?.volume24h ?? '–'} txs</span></span>
          <span className="text-text-muted">Holders <span className="font-mono text-st-purple font-semibold">{price?.holders ?? '–'}</span></span>
          <span className="text-text-muted">Gas <span className="font-mono text-st-emerald font-semibold">2%</span></span>
        </div>

        {/* Transaction History */}
        <div className="glass-card-static p-6">
          <h2 className="text-xl font-bold mb-4">📋 {t.wallet.history}</h2>

          {txLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg animate-shimmer" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <p className="text-4xl mb-3">📭</p>
              <p>{t.wallet.noTransactions}</p>
              <p className="text-sm">{t.wallet.startMining}</p>
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
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span>{new Date(tx.createdAt).toLocaleString('cs-CZ')}</span>
                          {(tx as any).hash && (
                            <span className="font-mono text-text-muted/60" title={(tx as any).hash}>
                              {(tx as any).hash.slice(0, 10)}...
                            </span>
                          )}
                        </div>
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
                    {t.wallet.previous}
                  </button>
                  <span className="text-text-secondary text-sm">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    {t.wallet.nextPage}
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
