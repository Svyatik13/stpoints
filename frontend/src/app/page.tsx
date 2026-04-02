'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/wallet');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <img src="/logo.png" alt="ST-Points Logo" className="w-16 h-16 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl animate-fade-up">
        {/* Logo */}
        <img src="/logo.png" alt="ST-Points Logo" className="w-24 h-24 object-contain mx-auto mb-8 drop-shadow-[0_0_20px_rgba(6,182,212,0.8)]" />

        <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-4">
          <span className="bg-gradient-to-r from-st-cyan via-white to-st-purple bg-clip-text text-transparent">
            ST-Points
          </span>
        </h1>

        <p className="text-text-secondary text-lg sm:text-xl mb-2">
          Elitní Digitální Aktiva
        </p>
        <p className="text-text-muted text-sm mb-10 max-w-md mx-auto">
          Extrémně vzácná aktiva vydávaná centralizovaným ZČU Central Node. 
          Těžte, sbírejte a chraňte svůj zůstatek.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register" className="btn-primary text-center" id="register-cta">
            Vytvořit Účet
          </Link>
          <Link href="/auth/login" className="btn-secondary text-center" id="login-cta">
            Přihlásit se
          </Link>
        </div>

        {/* Footer */}
        <p className="text-text-muted text-xs mt-12">
          Provozováno ZČU Central Node • Všechna práva vyhrazena
        </p>
      </div>
    </div>
  );
}
