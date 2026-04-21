'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, password: string, passCode: string, ref?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.auth.me();
      setUser(user);
    } catch (error: any) {
      // Only clear user if it's a definitive auth error
      if (error instanceof ApiError && (error.status === 401 || error.code === 'TOKEN_EXPIRED')) {
        setUser(null);
      }
      // Log error for debugging but don't force logout on 500/network error
      console.error('Refresh user failed:', error);
    }
  }, []);

  useEffect(() => {
    const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('stpoints_logged_out') === 'true';
    if (isLoggedOut) {
      setLoading(false);
      return;
    }
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    const { user } = await api.auth.login({ username, password, rememberMe });
    localStorage.removeItem('stpoints_logged_out');
    setUser(user);
  };

  const register = async (username: string, password: string, passCode: string, ref?: string) => {
    const { user } = await api.auth.register({ username, password, passCode, ref });
    localStorage.removeItem('stpoints_logged_out');
    setUser(user);
  };

  const logout = async () => {
    await api.auth.logout();
    localStorage.setItem('stpoints_logged_out', 'true');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth musí být použit uvnitř AuthProvider');
  return context;
}
