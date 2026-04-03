'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '@/lib/constants';
import { useI18n } from '@/lib/i18n';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { locale, t, setLocale } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setDropdownOpen(false);
  }, [pathname]);

  if (!user) return null;

  return (
    <nav className="glass-card-static fixed top-0 left-0 right-0 z-50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/wallet" className="flex items-center gap-3 group">
          <img src="/logo.png" alt="ST-Points Logo" className="w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] transition-all" />
          <span className="font-bold text-lg tracking-tight text-text-primary">
            ST-Points
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {user.role === 'ADMIN' && ADMIN_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? 'active' : ''}`}
              style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', marginLeft: 4, paddingLeft: 12 }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-st-cyan/30 to-st-purple/30 flex items-center justify-center text-sm font-bold text-st-cyan border border-st-cyan/20">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium text-text-primary leading-tight">{user.username}</span>
              <span className="text-xs text-st-cyan font-mono leading-tight">
                {parseFloat(user.balance).toFixed(6)} ST
              </span>
            </div>
            <svg className={`w-4 h-4 text-text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-glass-border bg-[#0c1222] shadow-2xl py-2 animate-fade-up z-[60]">
              {/* Balance (mobile) */}
              <div className="sm:hidden px-4 py-2 border-b border-glass-border/50 mb-1">
                <p className="text-xs text-text-muted">{t.wallet.balance}</p>
                <p className="text-sm font-mono font-bold text-st-cyan">{parseFloat(user.balance).toFixed(6)} ST</p>
              </div>

              <Link
                href={`/u/${user.username}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/[0.06] transition-colors"
              >
                <span>👤</span> {t.nav.profile}
              </Link>
              <Link
                href="/leaderboard"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/[0.06] transition-colors"
              >
                <span>🏆</span> {t.nav.leaderboard}
              </Link>
              <Link
                href="/affiliate"
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/[0.06] transition-colors"
              >
                <span>👥</span> {t.nav.affiliate}
              </Link>

              <div className="border-t border-glass-border/50 my-1" />

              <button
                onClick={() => {
                  setLocale(locale === 'cs' ? 'en' : 'cs');
                  setDropdownOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-white/[0.06] transition-colors w-full text-left"
              >
                <span>{locale === 'cs' ? '🇬🇧' : '🇨🇿'}</span>
                {locale === 'cs' ? 'English' : 'Čeština'}
              </button>

              <div className="border-t border-glass-border/50 my-1" />

              <button
                onClick={() => { setDropdownOpen(false); logout(); }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-st-red hover:bg-st-red-dim/30 transition-colors w-full text-left"
              >
                <span>🚪</span> {t.nav.logout}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden flex items-center gap-1 mt-3 overflow-x-auto pb-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link whitespace-nowrap text-sm ${pathname === item.href ? 'active' : ''}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
