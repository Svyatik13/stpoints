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
    register: (body: { username: string; email: string; password: string }) =>
      request<{ user: any }>('/auth/register', { method: 'POST', body }),
    login: (body: { email: string; password: string }) =>
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

  // ── Terminal ──
  terminal: {
    access: () =>
      request<any>('/terminal/access'),
  },

  // ── Giveaway ──
  giveaway: {
    recent: (limit: number = 10) =>
      request<{ giveaways: any[] }>(`/giveaway/recent?limit=${limit}`),
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
    triggerGiveaway: () =>
      request<any>('/admin/giveaway/trigger', { method: 'POST' }),
  },
};
