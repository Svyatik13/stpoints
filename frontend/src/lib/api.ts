const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // Send httpOnly cookies
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Nastala neočekávaná chyba.');
  }

  return data;
}

// ── Auth ──
export const api = {
  auth: {
    register: (body: { username: string; password: string }) =>
      request<{ user: any }>('/auth/register', { method: 'POST', body }),
    login: (body: { username: string; password: string }) =>
      request<{ user: any }>('/auth/login', { method: 'POST', body }),
    logout: () =>
      request<{ message: string }>('/auth/logout', { method: 'POST' }),
    me: () =>
      request<{ user: any }>('/auth/me'),
    refresh: () =>
      request<{ message: string }>('/auth/refresh', { method: 'POST' }),
  },

  // ── Wallet ──
  wallet: {
    balance: () =>
      request<{ balance: string }>('/wallet/balance'),
    transactions: (page: number = 1, limit: number = 20) =>
      request<any>(`/wallet/transactions?page=${page}&limit=${limit}`),
  },

  // ── Mining ──
  mining: {
    challenge: () =>
      request<any>('/mining/challenge', { method: 'POST' }),
    submit: (body: { challengeId: string; nonce: number; hashesComputed: number }) =>
      request<any>('/mining/submit', { method: 'POST', body }),
    stats: () =>
      request<any>('/mining/stats'),
  },

  // ── ST-ROOM ──
  stRoom: {
    teachers: () => request<any>('/st-room/teachers'),
    session: () => request<any>('/st-room/session'),
    buy: (body: { teacherId: string }) => request<any>('/st-room/buy', { method: 'POST', body }),
    redeemPass: (body: { teacherId: string }) => request<any>('/st-room/redeem-pass', { method: 'POST', body }),
    earlyExit: () => request<any>('/st-room/early-exit', { method: 'POST', body: {} }),
  },

  // ── Cases ──
  cases: {
    list: () => request<any>('/cases'),
    open: (body: { caseId: string }) => request<any>('/cases/open', { method: 'POST', body }),
    dailyStatus: () => request<any>('/cases/daily-status'),
    passes: () => request<any>('/cases/passes'),
  },

  // ── Giveaway ──
  giveaway: {
    recent: (limit: number = 10) =>
      request<{ giveaways: any[] }>(`/giveaway?limit=${limit}`),
    join: (giveawayId: string) =>
      request<{ success: boolean; message: string }>('/giveaway/join', { method: 'POST', body: { giveawayId } }),
  },

  // ── Admin ──
  admin: {
    stats: () =>
      request<any>('/admin/stats'),
    users: (page: number = 1, limit: number = 20, search: string = '') =>
      request<any>(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`),
    grant: (body: { userId: string; amount: string; reason: string }) =>
      request<any>('/admin/grant', { method: 'POST', body }),
    setRole: (body: { userId: string; role: string }) =>
      request<any>('/admin/role', { method: 'POST', body }),
    toggleActive: (body: { userId: string }) =>
      request<any>('/admin/toggle-active', { method: 'POST', body }),
    deleteUser: (userId: string) =>
      request<any>(`/admin/user/${userId}`, { method: 'DELETE' }),
    createGiveaway: (body: { title: string; prizePool: string; winnerCount: number; distribution: string; durationMinutes: number }) =>
      request<any>('/admin/giveaway/create', { method: 'POST', body }),
    drawGiveaway: (body: { giveawayId: string }) =>
      request<any>('/admin/giveaway/draw', { method: 'POST', body }),
    teachers: () =>
      request<any>('/admin/teachers'),
    addTeacher: (body: { name: string }) =>
      request<any>('/admin/teachers', { method: 'POST', body }),
    toggleTeacher: (body: { teacherId: string }) =>
      request<any>('/admin/teachers/toggle', { method: 'POST', body }),
    setTeacherRarity: (body: { teacherId: string; rarity: string }) =>
      request<any>('/admin/teachers/rarity', { method: 'POST', body }),
    // Cases
    getCases: () => request<any>('/admin/cases'),
    createCase: (body: { name: string; description?: string; price: string; isDaily?: boolean }) =>
      request<any>('/admin/cases', { method: 'POST', body }),
    updateCase: (caseId: string, body: { name?: string; description?: string; price?: string; isDaily?: boolean; isActive?: boolean }) =>
      request<any>(`/admin/cases/${caseId}`, { method: 'PUT', body }),
    deleteCase: (caseId: string) =>
      request<any>(`/admin/cases/${caseId}`, { method: 'DELETE' }),
    addCaseItem: (caseId: string, body: { type: string; label: string; amount?: string | null; weight: number }) =>
      request<any>(`/admin/cases/${caseId}/items`, { method: 'POST', body }),
    updateCaseItem: (itemId: string, body: { label?: string; type?: string; amount?: string | null; weight?: number }) =>
      request<any>(`/admin/cases/items/${itemId}`, { method: 'PUT', body }),
    deleteCaseItem: (itemId: string) =>
      request<any>(`/admin/cases/items/${itemId}`, { method: 'DELETE' }),
  },
};
