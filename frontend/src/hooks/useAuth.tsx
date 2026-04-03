'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '@/lib/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
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
    } catch {
      setUser(null);
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

  const login = async (username: string, password: string) => {
    const { user } = await api.auth.login({ username, password });
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
