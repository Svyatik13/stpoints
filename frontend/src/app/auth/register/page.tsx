'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref') || undefined;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passCode, setPassCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Manual Referral State
  const [showManualRef, setShowManualRef] = useState(false);
  const [manualRef, setManualRef] = useState('');
  const [isRefVerified, setIsRefVerified] = useState(false);
  const [verifyingRef, setVerifyingRef] = useState(false);
  const [refError, setRefError] = useState('');

  const handleVerifyRef = async () => {
    if (!manualRef) return;
    setVerifyingRef(true);
    setRefError('');
    try {
      const { profile } = await api.users.profile(manualRef);
      if (profile) {
        setIsRefVerified(true);
        setError(''); // Clear any previous general error if ref is valid
      }
    } catch (err: any) {
      setRefError('Profil nenalezen.');
      setIsRefVerified(false);
    } finally {
      setVerifyingRef(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Hesla se neshodují.');
      return;
    }

    if (password.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků.');
      return;
    }

    setLoading(true);
    try {
      // Prioritize manual verified ref over URL ref
      const finalRef = isRefVerified ? manualRef : ref;
      await register(username, password, passCode, finalRef);
      router.push('/wallet');
    } catch (err: any) {
      setError(err.message || 'Registrace se nezdařila.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-md p-8 animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <img src="/logo.png" alt="ST-Points Logo" className="w-16 h-16 object-contain mx-auto mb-4 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Registrace</h1>
          <p className="text-text-secondary text-sm mt-1">Vytvořte si účet v systému ST-Points</p>
          
          {ref && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-st-emerald/10 border border-st-emerald/20 text-st-emerald text-xs font-medium">
              <span>🎟️</span> Pozvání od: <span className="font-bold">{ref}</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-st-red-dim border border-st-red/20 text-st-red text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-2">
              Uživatelské jméno
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="glass-input"
              placeholder="vas_nickname"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
            />
            <p className="text-text-muted text-xs mt-1">Pouze písmena, čísla a podtržítka (3–20 znaků)</p>
          </div>



          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-text-secondary mb-2">
              Heslo
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input pr-10"
                placeholder="Minimálně 8 znaků"
                required
                minLength={8}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-text-secondary mb-2">
              Potvrzení hesla
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="glass-input pr-10"
                placeholder="Zopakujte heslo"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-primary transition-colors"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reg-pass-code" className="block text-sm font-medium text-text-secondary mb-2">
              🔐 Přístupový kód
            </label>
            <input
              id="reg-pass-code"
              type="text"
              value={passCode}
              onChange={(e) => setPassCode(e.target.value.toUpperCase())}
              className="glass-input tracking-widest font-mono text-center text-lg"
              placeholder="XXXXXX"
              maxLength={6}
              required
              autoComplete="off"
            />
            <p className="text-text-muted text-xs mt-1">Denní přístupový kód — bez něj nelze vytvořit účet</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
            id="register-submit"
          >
            {loading ? 'Vytváření účtu...' : 'Registrovat'}
          </button>
        </form>

        {/* Manual Referral Entry */}
        <div className="mt-6 border-t border-glass-border pt-6">
          {!isRefVerified && !ref && (
            <>
              {!showManualRef ? (
                <button 
                  onClick={() => setShowManualRef(true)}
                  className="text-text-muted hover:text-text-primary text-sm flex items-center justify-center gap-1 w-full transition-colors"
                >
                  <span>Byl jsi někým pozván?</span>
                </button>
              ) : (
                <div className="space-y-3 animate-fade-in">
                  <label className="block text-xs font-medium text-text-muted uppercase tracking-wider">
                    Affiliate kód (nickname/adresa)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualRef}
                      onChange={(e) => {
                        setManualRef(e.target.value);
                        setRefError('');
                      }}
                      className="glass-input text-sm"
                      placeholder="např. svyatik"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyRef}
                      disabled={verifyingRef || !manualRef}
                      className="btn-secondary text-xs px-4 whitespace-nowrap"
                    >
                      {verifyingRef ? '...' : 'Ověřit'}
                    </button>
                  </div>
                  {refError && <p className="text-red-400 text-[10px] uppercase font-bold">{refError}</p>}
                </div>
              )}
            </>
          )}

          {isRefVerified && (
            <div className="flex items-center justify-center gap-2 text-st-emerald animate-fade-in font-medium text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
              <span>Pozvání od uživatele <span className="font-bold underline">{manualRef}</span> bylo potvrzeno!</span>
            </div>
          )}

          {ref && !isRefVerified && (
            <div className="text-center text-text-muted text-[10px] uppercase font-bold tracking-widest">
              Referral aktivní z odkazu
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted text-sm mt-6">
          Máte již účet?{' '}
          <Link href="/auth/login" className="text-st-cyan hover:underline">
            Přihlásit se
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card p-12 animate-pulse">Načítám registrační formulář...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
