const API_BASE = (typeof window !== 'undefined' 
  ? `${window.location.origin}/api` 
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'));

interface ApiOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

let refreshPromise: Promise<void> | null = null;

async function rawRequest<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type');
  let data: any = {};

  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new Error('Node Centrála se aktualizuje. Prosím, zkuste to za 30 sekund.');
  } else {
    // If not JSON and not a known gateway error, but not OK
    if (!res.ok) {
      throw new Error('Nastala chyba spojení se serverem. Zkuste to prosím za chvíli.');
    }
  }

  if (!res.ok) {
    throw new Error(data.error || 'Nastala neočekávaná chyba.');
  }

  return data;
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(endpoint, options);
  } catch (error: any) {
    const isRefreshEndpoint = endpoint === '/auth/refresh';
    const isTokenError = error?.code === 'TOKEN_EXPIRED' || error?.message?.includes('token');

    if (isTokenError && !isRefreshEndpoint) {
      if (!refreshPromise) {
        refreshPromise = rawRequest<any>('/auth/refresh', { method: 'POST' })
          .finally(() => { refreshPromise = null; });
      }
      await refreshPromise;
      return await rawRequest<T>(endpoint, options);
    }
    throw error;
  }
}

// ── Auth ──
export const api = {
  auth: {
    register: (body: { username: string; password: string; passCode: string; ref?: string }) =>
      request<{ user: any }>('/auth/register', { method: 'POST', body }),
    login: (body: { username: string; password: string; rememberMe?: boolean }) =>
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
      request<{ balance: string; address: string }>('/wallet/balance'),
    transactions: (page: number = 1, limit: number = 20) =>
      request<any>(`/wallet/transactions?page=${page}&limit=${limit}`),
    price: () =>
      request<{ price: string; change24h: string; totalSupply: string; holders: number; volume24h: number; marketCap: string }>('/wallet/price'),
    transferFee: (amount: string) =>
      request<{ amount: string; fee: string; total: string }>(`/wallet/transfer/fee?amount=${amount}`),
    transfer: (body: { recipient: string; amount: string; note?: string }) =>
      request<{ amount: string; fee: string; totalCost: string; newBalance: string; recipient: string }>('/wallet/transfer', { method: 'POST', body }),
    send: (body: { toWalletId: string; amount: string }) =>
      request<{ success: boolean; message: string }>('/wallet/send', { method: 'POST', body }),
  },

  // ── Leaderboard ──
  leaderboard: {
    get: (type: string = 'balance', limit: number = 20) =>
      request<{ leaderboard: any[]; type: string }>(
        `/leaderboard?type=${type}&limit=${limit}`
      ),
  },

  // ── Profile ──
  profile: {
    get: () =>
      request<{
        user: any;
        stats: {
          miningSessionsCompleted: number;
          totalMined: string;
          transfersSent: number;
          transfersReceived: number;
          giveawayWins: number;
          totalEarned: string;
        };
      }>('/profile'),
  },

  // ── Mining ──
  mining: {
    challenge: () =>
      request<any>('/mining/challenge', { method: 'POST' }),
    submit: (body: { challengeId: string; nonce: number; hashesComputed: number }) =>
      request<any>('/mining/submit', { method: 'POST', body }),
    stats: () =>
      request<any>('/mining/stats'),
    // Session-based
    startSession: () =>
      request<any>('/mining/session/start', { method: 'POST' }),
    stopSession: () =>
      request<any>('/mining/session/stop', { method: 'POST' }),
    session: () =>
      request<any>('/mining/session'),
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
    drawGiveaway: (body: { giveawayId: string }) =>
      request<any>('/admin/giveaway/draw', { method: 'POST', body }),

    // PassCode
    getPassCode: () =>
      request<{ code: string; history: any[] }>('/admin/passcode'),
    regeneratePassCode: () =>
      request<{ code: string; history: any[] }>('/admin/passcode/regenerate', { method: 'POST' }),
    // ═══ NEW ═══
    // User Detail
    getUserDetail: (userId: string) =>
      request<any>(`/admin/user/${userId}/detail`),
    // Broadcast
    getBroadcast: () =>
      request<{ message: string | null; updatedAt: string | null }>('/admin/broadcast'),
    setBroadcast: (message: string) =>
      request<any>('/admin/broadcast', { method: 'POST', body: { message } }),
    clearBroadcast: () =>
      request<any>('/admin/broadcast', { method: 'DELETE' }),

    // Audit Log
    getAuditLog: (page: number = 1) =>
      request<any>(`/admin/audit-log?page=${page}&limit=30`),
    // Coinflip
    getCoinflips: (status?: string) =>
      request<any>(`/admin/coinflips${status ? `?status=${status}` : ''}`),
    cancelCoinflip: (gameId: string) =>
      request<any>(`/admin/coinflips/${gameId}/cancel`, { method: 'POST' }),

    // Bulk Grant
    bulkGrant: (body: { amount: string; reason: string; filter: string }) =>
      request<any>('/admin/bulk-grant', { method: 'POST', body }),
    // Export
    exportUsersCSV: () => `${API_BASE}/admin/users/export`,
  },

  // ── Usernames ──
  usernames: {
    me: () => request<{ usernames: any[] }>('/usernames/me'),
    create: (body: { handle: string }) => request<{ username: any }>('/usernames', { method: 'POST', body }),
    check: (handle: string) => request<{ available: boolean }>(`/usernames/check?handle=${handle}`),
    delete: (id: string) => request<{ success: boolean }>(`/usernames/${id}`, { method: 'DELETE' }),
    profile: (handle: string) => request<{ profile: any }>(`/users/profile/${handle}`),
  },

  // ── Market ──
  market: {
    list: (type?: string, filter?: string, sort?: string) => {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (filter) params.append('filter', filter);
      if (sort) params.append('sort', sort);
      return request<{ listings: any[] }>(`/market?${params.toString()}`);
    },
    getListing: (id: string) => request<{ listing: any }>(`/market/${id}`),
    my: () => request<{ listings: any[] }>('/market/my'),
    create: (body: { type: string; price: string; passId?: string; usernameId?: string; isAuction?: boolean; durationHours?: number; minIncrement?: string; note?: string }) =>
      request<{ listing: any }>('/market', { method: 'POST', body }),
    buy: (id: string) => request<{ listing: any; message: string }>(`/market/${id}/buy`, { method: 'POST' }),
    bid: (id: string, amount: string) => request<{ listing: any; message: string }>(`/market/${id}/bid`, { method: 'POST', body: { amount } }),
    cancel: (id: string) => request<{ success: boolean }>(`/market/${id}`, { method: 'DELETE' }),
  },

  // ── Activity ──
  activity: {
    list: () => request<{ events: any[] }>('/activity'),
    feed: () => request<any>('/activity'),
  },

  // ── Coinflip ──
  coinflip: {
    create: (body: { amount: number | string; side: string }) =>
      request<any>('/coinflip/create', { method: 'POST', body }),
    join: (id: string) =>
      request<any>(`/coinflip/join/${id}`, { method: 'POST' }),
    cancel: (id: string) =>
      request<any>(`/coinflip/cancel/${id}`, { method: 'POST' }),
    games: () => request<any>('/coinflip/games'),
    history: () => request<any>('/coinflip/history'),
  },

  // ── Rewards ──
  rewards: {
    streak: () => request<any>('/rewards/streak'),
    claimDaily: () => request<any>('/rewards/daily-claim', { method: 'POST' }),
    titles: () => request<any>('/rewards/titles'),
    setTitle: (title: string | null) =>
      request<any>('/rewards/title', { method: 'POST', body: { title } }),
  },

  // ── Chat ──
  chat: {
    messages: () => request<any>('/chat'),
    send: (message: string) => request<any>('/chat/send', { method: 'POST', body: { message } }),
  },



  // ── Public Profiles ──
  users: {
    profile: (handle: string) => request<{ profile: any }>(`/users/profile/${handle}`),
    recordReferralClick: (username: string) =>
      request<{ success: boolean }>(`/users/referral-click/${username}`, { method: 'POST' }),
    tip: (handle: string, amount: string, message?: string) => 
      request<{ message: string; balance: string }>(`/users/tip/${handle}`, { method: 'POST', body: { amount, message } }),
  },

  // ── Terminal ──
  terminal: {
    access: () => request<any>('/terminal/access'),
    command: (body: { command: string }) => request<any>('/terminal/execute', { method: 'POST', body }),
  },

};
