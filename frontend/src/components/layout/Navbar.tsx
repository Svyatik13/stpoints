'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '@/lib/constants';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  return (
    <nav className="glass-card-static fixed top-0 left-0 right-0 z-50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/wallet" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-st-cyan to-st-purple flex items-center justify-center text-black font-bold text-sm shadow-lg group-hover:shadow-st-cyan/30 transition-shadow">
            ST
          </div>
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

        {/* User Section */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-text-primary">{user.username}</span>
            <span className="text-xs text-st-cyan font-mono">
              {parseFloat(user.balance).toFixed(6)} ST
            </span>
          </div>
          <button
            onClick={logout}
            className="btn-secondary text-sm px-4 py-2"
            id="logout-button"
          >
            Odhlásit
          </button>
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
