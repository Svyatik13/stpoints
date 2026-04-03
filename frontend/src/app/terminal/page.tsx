'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { TerminalAccess } from '@/types';
import AppShell from '@/components/layout/AppShell';

export default function TerminalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [access, setAccess] = useState<TerminalAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      checkAccess();
    }
  }, [user]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  async function checkAccess() {
    setAccessLoading(true);
    try {
      const data = await api.terminal.access();
      setAccess(data);
    } catch {
      // silent fail
    } finally {
      setAccessLoading(false);
    }
  }

  async function startFaceIDSimulation() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);

      // Simulate scan progress
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.random() * 15;
        if (prog >= 100) {
          prog = 100;
          clearInterval(interval);
          setScanComplete(true);
          // Stop camera after scan
          setTimeout(() => {
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(t => t.stop());
            }
          }, 2000);
        }
        setScanProgress(prog);
      }, 500);
    } catch {
      // Camera permission denied or not available
      setScanComplete(true);
    }
  }

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6 animate-fade-up">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">🔒 ST-RM Terminál (Anderle)</h1>
          <p className="text-text-secondary text-sm mt-1">
            Zabezpečená sekce — vyžaduje minimální zůstatek 500 ST
          </p>
        </div>

        {accessLoading ? (
          <div className="glass-card p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto animate-pulse mb-4">
              <span className="text-2xl">🔄</span>
            </div>
            <p className="text-text-secondary">Ověřování přístupu...</p>
          </div>
        ) : access && !access.hasAccess ? (
          /* ── LOCKED STATE ── */
          <div className="glass-card p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-st-red-dim border-2 border-st-red/30 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-st-red mb-2">Přístup Odepřen</h2>
            <p className="text-text-secondary mb-6">{access.message}</p>

            <div className="glass-card-static inline-block p-6 mb-6">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-text-muted text-xs uppercase mb-1">Váš zůstatek</p>
                  <p className="text-xl font-mono font-bold text-st-red">{parseFloat(access.currentBalance).toFixed(6)} ST</p>
                </div>
                <div className="text-text-muted text-2xl">→</div>
                <div className="text-center">
                  <p className="text-text-muted text-xs uppercase mb-1">Požadavek</p>
                  <p className="text-xl font-mono font-bold text-st-gold">{parseFloat(access.requiredBalance).toFixed(6)} ST</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="mining-progress-bar">
                  <div
                    className="mining-progress-fill"
                    style={{ width: `${Math.min((parseFloat(access.currentBalance) / 500) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-text-muted text-xs mt-2">
                  Chybí: <span className="text-st-gold font-mono">{parseFloat(access.deficit).toFixed(6)} ST</span>
                </p>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => router.push('/mining')}
                className="btn-primary"
              >
                ⛏️ Jít Těžit
              </button>
            </div>
          </div>
        ) : (
          /* ── UNLOCKED STATE ── */
          <div className="space-y-6">
            {/* Access Granted Banner */}
            <div className="glass-card p-6 glow-cyan">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-st-emerald-dim flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-st-emerald">Přístup Povolen</h2>
                  <p className="text-text-secondary text-sm">
                    Vítejte v zabezpečeném ST-RM Terminálu, {user.username}.
                  </p>
                </div>
              </div>
            </div>

            {/* FaceID Simulation */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">🔍 FaceID Verifikace</h3>

              {!cameraActive && !scanComplete ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-white/[0.04] border-2 border-glass-border flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">📷</span>
                  </div>
                  <p className="text-text-secondary mb-4">
                    Spusťte simulaci biometrické verifikace FaceID
                  </p>
                  <button
                    onClick={startFaceIDSimulation}
                    className="btn-primary"
                    id="faceid-start"
                  >
                    Spustit FaceID
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Camera View */}
                  <div className="camera-frame max-w-md mx-auto aspect-[4/3]">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="camera-overlay">
                      {!scanComplete && <div className="scan-line" />}
                      {scanComplete && (
                        <div className="text-center">
                          <span className="text-6xl">✅</span>
                          <p className="text-st-cyan font-bold mt-2">Verifikováno</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="max-w-md mx-auto">
                    <div className="flex justify-between text-xs text-text-muted mb-1">
                      <span>Skenování...</span>
                      <span>{Math.round(scanProgress)}%</span>
                    </div>
                    <div className="mining-progress-bar">
                      <div
                        className="mining-progress-fill"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Console */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4">💻 ST-RM Konzole</h3>
              <div className="terminal-container space-y-2">
                <p className="terminal-line">Připojeno k ZČU Central Node...</p>
                <p className="terminal-line">Uživatel: <span className="text-st-gold">{user.username}</span></p>
                <p className="terminal-line">Oprávnění: <span className="text-st-emerald">OVĚŘENO</span></p>
                <p className="terminal-line">Zůstatek: <span className="text-st-cyan">{parseFloat(user.balance).toFixed(6)} ST</span></p>
                <p className="terminal-line">Session: <span className="text-text-secondary">{user.id}</span></p>
                <p className="terminal-line">Čas: <span className="text-text-secondary">{new Date().toLocaleString('cs-CZ')}</span></p>
                <br />
                <p className="terminal-line text-st-emerald">Systém je plně operativní. Všechny moduly aktivní.</p>
                <p className="text-text-muted text-xs mt-4 opacity-60">
                  ST-RM Terminál v0.1.0 — Anderle Edition
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
