'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function ReferralHandler() {
  const [isInvite, setIsInvite] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.startsWith('/invite/') && path.length > 8) {
        const username = path.substring(8).replace(/\/$/, ''); // Remove /invite/ and trailing slash
        if (username) {
          setIsInvite(true);
          // Track click
          api.users.recordReferralClick(username).catch(() => {});
          // Redirect to register with ref
          window.location.href = `/auth/register?ref=${username}`;
        }
      }
    }
  }, []);

  if (isInvite) {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#070b14] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <img src="/logo.png" alt="ST-Points Logo" className="w-16 h-16 object-contain mx-auto mb-4 animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          <p className="text-text-secondary text-sm font-medium tracking-wide">Přijímáme pozvánku...</p>
        </div>
      </div>
    );
  }

  return null;
}
