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
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-st-cyan to-st-purple flex items-center justify-center text-black font-bold text-xl animate-pulse">
          ST
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-2xl animate-fade-up">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-st-cyan to-st-purple flex items-center justify-center text-black font-black text-3xl mx-auto mb-8 shadow-2xl glow-cyan">
          ST
        </div>

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

        {/* Stats Badge */}
        <div className="glass-card-static inline-flex items-center gap-6 px-8 py-4 mb-10">
          <div className="text-center">
            <div className="text-st-cyan font-mono font-bold text-lg">∞</div>
            <div className="text-text-muted text-xs">Obtížnost</div>
          </div>
          <div className="w-px h-8 bg-glass-border" />
          <div className="text-center">
            <div className="text-st-gold font-mono font-bold text-lg">0.0001</div>
            <div className="text-text-muted text-xs">ST / 10k hashů</div>
          </div>
          <div className="w-px h-8 bg-glass-border" />
          <div className="text-center">
            <div className="text-st-purple font-mono font-bold text-lg">SHA-256</div>
            <div className="text-text-muted text-xs">Algoritmus</div>
          </div>
        </div>

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
