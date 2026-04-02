'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';

interface SystemStats {
  totalUsers: number;
  activeUsers24h: number;
  totalBalance: string;
  totalMined: string;
  totalGiveaways: string;
  giveawayCount: number;
  recentTransactions24h: number;
}

interface AdminUser {
  id: string;
  username: string;
  balance: string;
  role: string;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  miningCount: number;
  giveawayCount: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'dashboard' | 'users' | 'giveaway' | 'teachers'>('dashboard');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [grantModal, setGrantModal] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [giveawayResult, setGiveawayResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newTeacherName, setNewTeacherName] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.replace('/wallet');
    }
  }, [user, authLoading, router]);

  const loadStats = useCallback(async () => {
    try {
      const data = await api.admin.stats();
      setStats(data);
    } catch {}
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.admin.users(userPage, 15, userSearch);
      setUsers(data.users);
      setUserTotal(data.pagination.total);
    } catch {}
  }, [userPage, userSearch]);

  const loadTeachers = useCallback(async () => {
    try {
      const data = await api.admin.teachers();
      setTeachers(data.teachers);
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadStats();
      loadUsers();
      loadTeachers();
    }
  }, [user, loadStats, loadUsers, loadTeachers]);

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleGrant() {
    if (!grantModal || !grantAmount || !grantReason) return;
    setActionLoading(true);
    try {
      await api.admin.grant({ userId: grantModal.id, amount: grantAmount, reason: grantReason });
      showMessage('success', `${grantAmount} ST přiděleno uživateli ${grantModal.username}`);
      setGrantModal(null);
      setGrantAmount('');
      setGrantReason('');
      loadUsers();
      loadStats();
    } catch (err: any) {
      showMessage('error', err.message);
    }
    setActionLoading(false);
  }

  async function handleToggleActive(u: AdminUser) {
    try {
      await api.admin.toggleActive({ userId: u.id });
      showMessage('success', `${u.username} ${u.isActive ? 'zablokován' : 'odblokován'}`);
      loadUsers();
    } catch (err: any) {
      showMessage('error', err.message);
    }
  }

  async function handleSetRole(u: AdminUser, role: string) {
    try {
      await api.admin.setRole({ userId: u.id, role });
      showMessage('success', `${u.username} → ${role}`);
      loadUsers();
    } catch (err: any) {
      showMessage('error', err.message);
    }
  }

  async function handleDeleteUser(u: AdminUser) {
    if (!window.confirm(`OPRAVDU chcete TRVALE SMAZAT z celého systému uživatele ${u.username}? Tato akce smaže i všechny jeho transakce, těžby a drops.`)) return;
    setActionLoading(true);
    try {
      await api.admin.deleteUser(u.id);
      showMessage('success', `Uživatel ${u.username} byl trvale smazán ze všeho.`);
      loadUsers();
      loadStats();
    } catch (err: any) {
      showMessage('error', err.message);
    }
    setActionLoading(false);
  }

  const [gaTitle, setGaTitle] = useState('');
  const [gaPool, setGaPool] = useState('');
  const [gaWinners, setGaWinners] = useState('');
  const [gaDist, setGaDist] = useState<'EQUAL'|'WEIGHTED'>('EQUAL');
  const [gaTime, setGaTime] = useState('');

  async function handleCreateGiveaway() {
    setActionLoading(true);
    try {
      await api.admin.createGiveaway({
        title: gaTitle,
        prizePool: gaPool,
        winnerCount: parseInt(gaWinners),
        distribution: gaDist,
        durationMinutes: parseInt(gaTime)
      });
      showMessage('success', 'Giveaway přidán!');
      setGaTitle('');
      setGaPool('');
      setGaWinners('');
      setGaTime('');
      loadStats();
    } catch (err: any) {
      showMessage('error', err.message);
    }
    setActionLoading(false);
  }

  async function handleForceDraw(giveawayId: string) {
    setActionLoading(true);
    try {
      await api.admin.drawGiveaway({ giveawayId });
      showMessage('success', 'ST-Drop byl úspěšně vyhodnocen.');
      loadStats();
      // A quick reload workaround since we don't fetch giveaways array in admin page yet
    } catch (err: any) {
      showMessage('error', err.message);
    }
    setActionLoading(false);
  }

  if (!user || user.role !== 'ADMIN') return null;

  const tabs = [
    { id: 'dashboard' as const, label: '📊 Dashboard', },
    { id: 'users' as const, label: '👥 Uživatelé', },
    { id: 'giveaway' as const, label: '🎁 Giveaway', },
    { id: 'teachers' as const, label: '🧑‍🏫 Učitelé', },
  ];

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">⚙️ Admin Panel</h1>
            <p className="text-text-secondary text-sm mt-1">ZČU Central Node — Správa systému</p>
          </div>
          <div className="badge badge-red text-xs">ADMIN</div>
        </div>

        {/* Message Toast */}
        {message && (
          <div className={`glass-card-static p-4 animate-fade-up ${message.type === 'success' ? 'border-st-emerald/30' : 'border-st-red/30'}`}
            style={{ borderColor: message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}
          >
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-st-emerald' : 'text-st-red'}`}>
              {message.type === 'success' ? '✅' : '❌'} {message.text}
            </p>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-st-cyan-dim text-st-cyan border border-st-cyan/20'
                  : 'bg-white/[0.04] text-text-secondary hover:bg-white/[0.08] border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══ DASHBOARD TAB ═══ */}
        {tab === 'dashboard' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Uživatelé', value: stats.totalUsers, icon: '👥', color: 'text-st-cyan' },
                { label: 'Aktivní (24h)', value: stats.activeUsers24h, icon: '🟢', color: 'text-st-emerald' },
                { label: 'Transakce (24h)', value: stats.recentTransactions24h, icon: '📈', color: 'text-st-purple' },
                { label: 'ST-Drops', value: stats.giveawayCount, icon: '🎁', color: 'text-st-gold' },
              ].map(s => (
                <div key={s.label} className="glass-card-static p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{s.icon}</span>
                    <span className="text-text-muted text-xs uppercase tracking-wider">{s.label}</span>
                  </div>
                  <p className={`text-3xl font-bold font-mono ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Celkový Zůstatek', value: `${parseFloat(stats.totalBalance).toFixed(4)} ST`, color: 'text-st-cyan' },
                { label: 'Celkem Odtěženo', value: `${parseFloat(stats.totalMined).toFixed(4)} ST`, color: 'text-st-purple' },
                { label: 'Celkem Giveaway', value: `${parseFloat(stats.totalGiveaways).toFixed(4)} ST`, color: 'text-st-gold' },
              ].map(s => (
                <div key={s.label} className="glass-card-static p-5">
                  <p className="text-text-muted text-xs uppercase tracking-wider mb-2">{s.label}</p>
                  <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ USERS TAB ═══ */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Hledat uživatele..."
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                className="glass-input flex-1"
              />
              <button onClick={loadUsers} className="btn-secondary px-4">🔍</button>
            </div>

            {/* User Table */}
            <div className="glass-card-static overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border">
                      <th className="text-left p-4 text-text-muted text-xs uppercase tracking-wider">Uživatel</th>
                      <th className="text-right p-4 text-text-muted text-xs uppercase tracking-wider">Zůstatek</th>
                      <th className="text-center p-4 text-text-muted text-xs uppercase tracking-wider">Role</th>
                      <th className="text-center p-4 text-text-muted text-xs uppercase tracking-wider">Těžba</th>
                      <th className="text-right p-4 text-text-muted text-xs uppercase tracking-wider">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-glass-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              {u.username}
                              {!u.isActive && <span className="badge badge-red text-[9px]">BAN</span>}
                            </p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-mono font-semibold text-st-cyan">{parseFloat(u.balance).toFixed(6)} ST</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-red' : 'badge-cyan'} text-[10px]`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-center font-mono text-text-secondary">
                          {u.miningCount}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setGrantModal(u)}
                              className="px-3 py-1.5 text-xs rounded-lg bg-st-gold-dim text-st-gold hover:bg-st-gold/20 transition-colors font-semibold"
                              title="Přidělit ST"
                            >
                              💰
                            </button>
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                                u.isActive
                                  ? 'bg-st-red-dim text-st-red hover:bg-st-red/20'
                                  : 'bg-st-emerald-dim text-st-emerald hover:bg-st-emerald/20'
                              }`}
                              title={u.isActive ? 'Zablokovat' : 'Odblokovat'}
                            >
                              {u.isActive ? '🚫' : '✅'}
                            </button>
                            <button
                              onClick={() => handleSetRole(u, u.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                              className="px-3 py-1.5 text-xs rounded-lg bg-st-purple-dim text-st-purple hover:bg-st-purple/20 transition-colors font-semibold"
                              title="Změnit roli"
                            >
                              {u.role === 'ADMIN' ? '👤' : '👑'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="px-3 py-1.5 text-xs rounded-lg bg-st-red-dim text-st-red hover:bg-st-red/20 transition-colors font-semibold"
                              title="Trvale smazat"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-glass-border">
                <p className="text-text-muted text-xs">Celkem: {userTotal} uživatelů</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setUserPage(p => Math.max(1, p - 1))}
                    disabled={userPage <= 1}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                  >
                    ← Zpět
                  </button>
                  <span className="text-text-secondary text-xs py-1.5 px-2">Strana {userPage}</span>
                  <button
                    onClick={() => setUserPage(p => p + 1)}
                    disabled={users.length < 15}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30"
                  >
                    Další →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ GIVEAWAY TAB ═══ */}
        {tab === 'giveaway' && (
          <div className="space-y-4">
            <div className="glass-card p-6 glow-gold">
              <h2 className="text-xl font-bold mb-4">🎰 Vytvořit ST-Drop</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Název</label>
                  <input type="text" value={gaTitle} onChange={e => setGaTitle(e.target.value)} className="glass-input" placeholder="Např. Vánoční drop" />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Celková Odměna (Pool ST)</label>
                  <input type="number" step="0.000001" value={gaPool} onChange={e => setGaPool(e.target.value)} className="glass-input" placeholder="10.0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Počet výherců</label>
                  <input type="number" value={gaWinners} onChange={e => setGaWinners(e.target.value)} className="glass-input" placeholder="3" />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Doba trvání (minuty)</label>
                  <input type="number" value={gaTime} onChange={e => setGaTime(e.target.value)} className="glass-input" placeholder="60 (1 hodina)" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-text-secondary block mb-2">Rozdělení odměny</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={gaDist === 'EQUAL'} onChange={() => setGaDist('EQUAL')} className="accent-st-gold" />
                      Rovnoměrně (Všichni stejně)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-sm">
                      <input type="radio" checked={gaDist === 'WEIGHTED'} onChange={() => setGaDist('WEIGHTED')} className="accent-st-gold" />
                      Odstupňovaně (1. místo bere víc)
                    </label>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCreateGiveaway}
                disabled={actionLoading || !gaTitle || !gaPool || !gaWinners || !gaTime}
                className="btn-primary w-full text-lg py-3 disabled:opacity-50"
              >
                {actionLoading ? '⏳ Vytvářím...' : '🎁 Spustit nový ST-Drop'}
              </button>
            </div>
            
            <div className="glass-card-static p-6">
              <h3 className="font-bold mb-2">Jak to funguje?</h3>
              <p className="text-text-secondary text-sm">
                Nový ST-Drop se objeví na hlavní stránce /giveaways. Uživatelé musí přijít a ručně se přihlásit tlačítkem "Připojit se" (a musí být aktivní v posledních 24 hodinách). Jakmile odpočet vyprší, systém minutu po skončení automaticky rozlosuje výherce. Výsledky se ukážou v historii obou stran.
              </p>
            </div>
          </div>
        )}

        {/* ═══ TEACHERS TAB ═══ */}
        {tab === 'teachers' && (
          <div className="space-y-4">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold mb-4">🧑‍🏫 Správa Učitelů ST-ROOM</h2>
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="Jméno nového učitele..."
                  value={newTeacherName}
                  onChange={e => setNewTeacherName(e.target.value)}
                  className="glass-input flex-1"
                />
                <button
                  onClick={async () => {
                    if (!newTeacherName.trim()) return;
                    setActionLoading(true);
                    try {
                      await api.admin.addTeacher({ name: newTeacherName.trim() });
                      showMessage('success', `Učitel ${newTeacherName} přidán!`);
                      setNewTeacherName('');
                      loadTeachers();
                    } catch (err: any) { showMessage('error', err.message); }
                    setActionLoading(false);
                  }}
                  disabled={actionLoading || !newTeacherName.trim()}
                  className="btn-primary px-5 disabled:opacity-50"
                >
                  + Přidat
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {teachers.map(t => {
                  const rarityColors: Record<string, string> = {
                    COMMON: 'text-gray-400', RARE: 'text-st-emerald', EPIC: 'text-st-cyan', LEGENDARY: 'text-st-purple', MYTHIC: 'text-yellow-400'
                  };
                  const rarityCosts: Record<string, number> = { COMMON: 50, RARE: 65, EPIC: 75, LEGENDARY: 85, MYTHIC: 0 };
                  return (
                    <div key={t.id} className={`glass-card-static p-4 rounded-xl space-y-3 ${!t.isActive ? 'opacity-40' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-st-cyan-dim flex items-center justify-center text-st-cyan font-bold text-xs">
                            {t.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{t.name}</p>
                            <p className={`text-xs font-bold ${rarityColors[t.rarity] || 'text-gray-400'}`}>
                              {t.rarity} {t.rarity !== 'MYTHIC' ? `— ${rarityCosts[t.rarity]} ST` : '— Pass Only'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try { await api.admin.toggleTeacher({ teacherId: t.id }); loadTeachers(); }
                            catch (err: any) { showMessage('error', err.message); }
                          }}
                          className={`px-2 py-1 text-[10px] rounded-lg font-semibold transition-colors ${t.isActive ? 'bg-st-red-dim text-st-red' : 'bg-st-emerald-dim text-st-emerald'}`}
                        >
                          {t.isActive ? '🙈' : '👁️'}
                        </button>
                      </div>
                      <select
                        value={t.rarity || 'COMMON'}
                        onChange={async (e) => {
                          try {
                            await api.admin.setTeacherRarity({ teacherId: t.id, rarity: e.target.value });
                            showMessage('success', `${t.name} → ${e.target.value}`);
                            loadTeachers();
                          } catch (err: any) { showMessage('error', err.message); }
                        }}
                        className="glass-input text-xs w-full"
                      >
                        <option value="COMMON">⬜ Common — 50 ST</option>
                        <option value="RARE">🟩 Rare — 65 ST</option>
                        <option value="EPIC">🟦 Epic — 75 ST</option>
                        <option value="LEGENDARY">🟪 Legendary — 85 ST</option>
                        <option value="MYTHIC">🌈 Mythic — Pass Only</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══ GRANT MODAL ═══ */}
        {grantModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setGrantModal(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="glass-card p-6 w-full max-w-md relative z-10 animate-fade-up" onClick={e => e.stopPropagation()}>
              <h3 className="text-xl font-bold mb-4">💰 Přidělit ST tokeny</h3>
              <p className="text-text-secondary text-sm mb-4">
                Uživatel: <span className="text-st-cyan font-semibold">{grantModal.username}</span>
                <br />
                Aktuální zůstatek: <span className="font-mono">{parseFloat(grantModal.balance).toFixed(6)} ST</span>
              </p>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Částka (ST)</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={grantAmount}
                    onChange={e => setGrantAmount(e.target.value)}
                    className="glass-input"
                    placeholder="0.001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Důvod</label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={e => setGrantReason(e.target.value)}
                    className="glass-input"
                    placeholder="Bonus za testování..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleGrant}
                  disabled={actionLoading || !grantAmount || !grantReason}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {actionLoading ? '⏳' : '✅'} Potvrdit
                </button>
                <button onClick={() => setGrantModal(null)} className="btn-secondary flex-1">
                  Zrušit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
