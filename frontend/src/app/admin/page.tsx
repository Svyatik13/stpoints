'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AppShell from '@/components/layout/AppShell';
import AdminSidebar, { AdminSection } from './components/AdminSidebar';
import DashboardSection from './components/DashboardSection';
import BroadcastSection from './components/BroadcastSection';
import CoinflipSection from './components/CoinflipSection';
import AuditLogSection from './components/AuditLogSection';
import UserDetailModal from './components/UserDetailModal';

interface AdminUser {
  id: string; username: string; balance: string; role: string;
  address: string; isActive: boolean; lastActiveAt: string | null;
  createdAt: string; miningCount: number; giveawayCount: number;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<AdminSection>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [passCode, setPassCode] = useState<any>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [grantModal, setGrantModal] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [detailUser, setDetailUser] = useState<string | null>(null);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkFilter, setBulkFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  // Giveaway state
  const [gaTitle, setGaTitle] = useState('');
  const [gaPool, setGaPool] = useState('');
  const [gaWinners, setGaWinners] = useState('');
  const [gaDist, setGaDist] = useState<'EQUAL'|'WEIGHTED'>('EQUAL');
  const [gaTime, setGaTime] = useState('');

  // Teachers state
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newTeacherName, setNewTeacherName] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) router.replace('/wallet');
  }, [user, authLoading, router]);

  const loadStats = useCallback(async () => { try { const d = await api.admin.stats(); setStats(d); } catch {} }, []);
  const loadPassCode = useCallback(async () => { try { const d = await api.admin.getPassCode(); setPassCode(d); } catch {} }, []);
  const loadUsers = useCallback(async () => {
    try { const d = await api.admin.users(userPage, 15, userSearch); setUsers(d.users); setUserTotal(d.pagination.total); } catch {}
  }, [userPage, userSearch]);
  const loadTeachers = useCallback(async () => { try { const d = await api.admin.teachers(); setTeachers(d.teachers); } catch {} }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') { loadStats(); loadUsers(); loadTeachers(); loadPassCode(); }
  }, [user, loadStats, loadUsers, loadTeachers, loadPassCode]);

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleGrant() {
    if (!grantModal || !grantAmount || !grantReason) return;
    setActionLoading(true);
    try {
      await api.admin.grant({ userId: grantModal.id, amount: grantAmount, reason: grantReason });
      showMessage('success', `${grantAmount} ST → ${grantModal.username}`);
      setGrantModal(null); setGrantAmount(''); setGrantReason('');
      loadUsers(); loadStats();
    } catch (err: any) { showMessage('error', err.message); }
    setActionLoading(false);
  }

  async function handleBulkGrant() {
    if (!bulkAmount || !bulkReason) return;
    setActionLoading(true);
    try {
      const r = await api.admin.bulkGrant({ amount: bulkAmount, reason: bulkReason, filter: bulkFilter });
      showMessage('success', `${bulkAmount} ST → ${r.usersAffected} uživatelů`);
      setBulkModal(false); setBulkAmount(''); setBulkReason('');
      loadUsers(); loadStats();
    } catch (err: any) { showMessage('error', err.message); }
    setActionLoading(false);
  }

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <AppShell>
      <div className="flex gap-4 min-h-[calc(100vh-80px)]">
        <AdminSidebar active={section} onChange={setSection} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        <div className="flex-1 min-w-0 space-y-5 animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">⚙️ Admin Panel</h1>
              <p className="text-text-secondary text-sm mt-0.5">ZČU Central Node — Správa systému</p>
            </div>
            <div className="badge badge-red text-xs">ADMIN</div>
          </div>

          {/* Toast */}
          {message && (
            <div className={`glass-card-static p-3 animate-fade-up ${message.type === 'success' ? 'border-st-emerald/30' : 'border-st-red/30'}`}
              style={{ borderColor: message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
              <p className={`text-sm font-medium ${message.type === 'success' ? 'text-st-emerald' : 'text-st-red'}`}>
                {message.type === 'success' ? '✅' : '❌'} {message.text}
              </p>
            </div>
          )}

          {/* ═══ DASHBOARD ═══ */}
          {section === 'dashboard' && (
            <DashboardSection stats={stats} passCode={passCode} onMessage={showMessage} onRefresh={() => { loadStats(); loadPassCode(); }} />
          )}

          {/* ═══ BROADCAST ═══ */}
          {section === 'broadcast' && <BroadcastSection onMessage={showMessage} />}

          {/* ═══ COINFLIP ═══ */}
          {section === 'coinflip' && <CoinflipSection onMessage={showMessage} />}

          {/* ═══ AUDIT LOG ═══ */}
          {section === 'audit' && <AuditLogSection />}

          {/* ═══ USERS ═══ */}
          {section === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <input type="text" placeholder="Hledat uživatele..." value={userSearch} onChange={e => { setUserSearch(e.target.value); setUserPage(1); }} className="glass-input flex-1 min-w-[200px]" />
                <button onClick={loadUsers} className="btn-secondary px-4">🔍</button>
                <button onClick={() => setBulkModal(true)} className="px-4 py-2 text-xs rounded-xl bg-st-purple-dim text-st-purple font-semibold">💰 Bulk Grant</button>
                <a href={api.admin.exportUsersCSV()} target="_blank" rel="noreferrer" className="px-4 py-2 text-xs rounded-xl bg-st-emerald-dim text-st-emerald font-semibold flex items-center gap-1">📥 Export CSV</a>
              </div>

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
                        <tr key={u.id} className="border-b border-glass-border/50 hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setDetailUser(u.id)}>
                          <td className="p-4">
                            <p className="font-semibold flex items-center gap-2">
                              {u.username}
                              {!u.isActive && <span className="badge badge-red text-[9px]">BAN</span>}
                            </p>
                          </td>
                          <td className="p-4 text-right"><span className="font-mono font-semibold text-st-cyan">{parseFloat(u.balance).toFixed(4)} ST</span></td>
                          <td className="p-4 text-center"><span className={`badge ${u.role === 'ADMIN' ? 'badge-red' : 'badge-cyan'} text-[10px]`}>{u.role}</span></td>
                          <td className="p-4 text-center font-mono text-text-secondary">{u.miningCount}</td>
                          <td className="p-4" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => setGrantModal(u)} className="px-2.5 py-1.5 text-xs rounded-lg bg-st-gold-dim text-st-gold" title="Přidělit ST">💰</button>
                              <button onClick={async () => { try { await api.admin.toggleActive({ userId: u.id }); showMessage('success', `${u.username} ${u.isActive ? 'BAN' : 'UNBAN'}`); loadUsers(); } catch (e:any) { showMessage('error', e.message); }}}
                                className={`px-2.5 py-1.5 text-xs rounded-lg ${u.isActive ? 'bg-st-red-dim text-st-red' : 'bg-st-emerald-dim text-st-emerald'}`}>{u.isActive ? '🚫' : '✅'}</button>
                              <button onClick={async () => { try { await api.admin.setRole({ userId: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' }); showMessage('success', `${u.username} → ${u.role === 'ADMIN' ? 'USER' : 'ADMIN'}`); loadUsers(); } catch (e:any) { showMessage('error', e.message); }}}
                                className="px-2.5 py-1.5 text-xs rounded-lg bg-st-purple-dim text-st-purple">{u.role === 'ADMIN' ? '👤' : '👑'}</button>
                              <button onClick={async () => { if (!window.confirm(`SMAZAT ${u.username}?`)) return; try { await api.admin.deleteUser(u.id); showMessage('success', 'Smazáno'); loadUsers(); loadStats(); } catch (e:any) { showMessage('error', e.message); }}}
                                className="px-2.5 py-1.5 text-xs rounded-lg bg-st-red-dim text-st-red">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between p-4 border-t border-glass-border">
                  <p className="text-text-muted text-xs">Celkem: {userTotal}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage <= 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">← Zpět</button>
                    <span className="text-text-secondary text-xs py-1.5 px-2">Strana {userPage}</span>
                    <button onClick={() => setUserPage(p => p + 1)} disabled={users.length < 15} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">Další →</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ GIVEAWAY ═══ */}
          {section === 'giveaway' && (
            <div className="space-y-4">
              <div className="glass-card p-6 glow-gold">
                <h2 className="text-xl font-bold mb-4">🎰 Vytvořit ST-Drop</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div><label className="text-sm font-medium text-text-secondary block mb-1">Název</label><input type="text" value={gaTitle} onChange={e => setGaTitle(e.target.value)} className="glass-input" placeholder="Vánoční drop" /></div>
                  <div><label className="text-sm font-medium text-text-secondary block mb-1">Pool ST</label><input type="number" step="0.000001" value={gaPool} onChange={e => setGaPool(e.target.value)} className="glass-input" placeholder="10.0" /></div>
                  <div><label className="text-sm font-medium text-text-secondary block mb-1">Výherců</label><input type="number" value={gaWinners} onChange={e => setGaWinners(e.target.value)} className="glass-input" placeholder="3" /></div>
                  <div><label className="text-sm font-medium text-text-secondary block mb-1">Minuty</label><input type="number" value={gaTime} onChange={e => setGaTime(e.target.value)} className="glass-input" placeholder="60" /></div>
                  <div className="md:col-span-2"><label className="text-sm font-medium text-text-secondary block mb-2">Rozdělení</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={gaDist==='EQUAL'} onChange={()=>setGaDist('EQUAL')} className="accent-st-gold" /> Rovnoměrně</label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" checked={gaDist==='WEIGHTED'} onChange={()=>setGaDist('WEIGHTED')} className="accent-st-gold" /> Odstupňovaně</label>
                    </div>
                  </div>
                </div>
                <button onClick={async () => { setActionLoading(true); try { await api.admin.createGiveaway({ title: gaTitle, prizePool: gaPool, winnerCount: parseInt(gaWinners), distribution: gaDist, durationMinutes: parseInt(gaTime) }); showMessage('success', 'ST-Drop vytvořen!'); setGaTitle(''); setGaPool(''); setGaWinners(''); setGaTime(''); loadStats(); } catch (e:any) { showMessage('error', e.message); } setActionLoading(false); }}
                  disabled={actionLoading || !gaTitle || !gaPool || !gaWinners || !gaTime} className="btn-primary w-full text-lg py-3 disabled:opacity-50">
                  {actionLoading ? '⏳' : '🎁'} Spustit ST-Drop
                </button>
              </div>
            </div>
          )}

          {/* ═══ TEACHERS ═══ */}
          {section === 'teachers' && (
            <div className="space-y-4">
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-4">🧑‍🏫 Správa Učitelů</h2>
                <div className="flex gap-3 mb-6">
                  <input type="text" placeholder="Jméno učitele..." value={newTeacherName} onChange={e => setNewTeacherName(e.target.value)} className="glass-input flex-1" />
                  <button onClick={async () => { if (!newTeacherName.trim()) return; setActionLoading(true); try { await api.admin.addTeacher({ name: newTeacherName.trim() }); showMessage('success', `${newTeacherName} přidán`); setNewTeacherName(''); loadTeachers(); } catch (e:any) { showMessage('error', e.message); } setActionLoading(false); }}
                    disabled={actionLoading || !newTeacherName.trim()} className="btn-primary px-5 disabled:opacity-50">+ Přidat</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {teachers.map(t => {
                    const rc: Record<string,string> = { COMMON:'text-gray-400', RARE:'text-st-emerald', EPIC:'text-st-cyan', LEGENDARY:'text-st-purple', MYTHIC:'text-yellow-400' };
                    return (
                      <div key={t.id} className={`glass-card-static p-4 rounded-xl space-y-3 ${!t.isActive ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-st-cyan-dim flex items-center justify-center text-st-cyan font-bold text-xs">{t.name.charAt(0)}</div>
                            <div><p className="font-semibold text-sm">{t.name}</p><p className={`text-xs font-bold ${rc[t.rarity]||'text-gray-400'}`}>{t.rarity}</p></div>
                          </div>
                          <button onClick={async () => { try { await api.admin.toggleTeacher({ teacherId: t.id }); loadTeachers(); } catch (e:any) { showMessage('error', e.message); }}}
                            className={`px-2 py-1 text-[10px] rounded-lg font-semibold ${t.isActive ? 'bg-st-red-dim text-st-red' : 'bg-st-emerald-dim text-st-emerald'}`}>{t.isActive ? '🙈' : '👁️'}</button>
                        </div>
                        <select value={t.rarity||'COMMON'} onChange={async (e) => { try { await api.admin.setTeacherRarity({ teacherId: t.id, rarity: e.target.value }); loadTeachers(); } catch (err:any) { showMessage('error', err.message); }}} className="glass-input text-xs w-full">
                          <option value="COMMON">⬜ Common</option><option value="RARE">🟩 Rare</option><option value="EPIC">🟦 Epic</option><option value="LEGENDARY">🟪 Legendary</option><option value="MYTHIC">🌈 Mythic</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}
      {detailUser && <UserDetailModal userId={detailUser} onClose={() => setDetailUser(null)} />}

      {grantModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setGrantModal(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="glass-card p-6 w-full max-w-md relative z-10 animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">💰 Přidělit ST</h3>
            <p className="text-text-secondary text-sm mb-4">Uživatel: <span className="text-st-cyan font-semibold">{grantModal.username}</span> · <span className="font-mono">{parseFloat(grantModal.balance).toFixed(4)} ST</span></p>
            <div className="space-y-3 mb-6">
              <input type="number" step="0.000001" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} className="glass-input" placeholder="Částka ST" />
              <input type="text" value={grantReason} onChange={e => setGrantReason(e.target.value)} className="glass-input" placeholder="Důvod" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleGrant} disabled={actionLoading || !grantAmount || !grantReason} className="btn-primary flex-1 disabled:opacity-50">✅ Potvrdit</button>
              <button onClick={() => setGrantModal(null)} className="btn-secondary flex-1">Zrušit</button>
            </div>
          </div>
        </div>
      )}

      {bulkModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setBulkModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="glass-card p-6 w-full max-w-md relative z-10 animate-fade-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">💰 Bulk Grant</h3>
            <p className="text-text-secondary text-sm mb-4">Přidělte ST všem uživatelům najednou.</p>
            <div className="space-y-3 mb-6">
              <input type="number" step="0.000001" value={bulkAmount} onChange={e => setBulkAmount(e.target.value)} className="glass-input" placeholder="Částka ST na uživatele" />
              <input type="text" value={bulkReason} onChange={e => setBulkReason(e.target.value)} className="glass-input" placeholder="Důvod" />
              <select value={bulkFilter} onChange={e => setBulkFilter(e.target.value)} className="glass-input">
                <option value="all">Všichni uživatelé</option>
                <option value="active_24h">Aktivní (24h)</option>
                <option value="active_7d">Aktivní (7 dní)</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBulkGrant} disabled={actionLoading || !bulkAmount || !bulkReason} className="btn-primary flex-1 disabled:opacity-50">{actionLoading ? '⏳' : '✅'} Rozdat</button>
              <button onClick={() => setBulkModal(false)} className="btn-secondary flex-1">Zrušit</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
