'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { MiningChallenge, MiningProgress, MiningResult } from '@/types';

interface UseMinerReturn {
  isMining: boolean;
  progress: MiningProgress | null;
  challenge: MiningChallenge | null;
  result: MiningResult | null;
  error: string | null;
  hashRate: number;
  startMining: () => Promise<void>;
  stopMining: () => void;
}

export function useMiner(): UseMinerReturn {
  const [isMining, setIsMining] = useState(false);
  const [progress, setProgress] = useState<MiningProgress | null>(null);
  const [challenge, setChallenge] = useState<MiningChallenge | null>(null);
  const [result, setResult] = useState<MiningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hashRate, setHashRate] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const lastProgressTime = useRef<number>(0);
  const lastProgressHashes = useRef<number>(0);
  const challengeRef = useRef<MiningChallenge | null>(null);
  const progressRef = useRef<MiningProgress | null>(null);
  const isSubmitting = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Multi-tab prevention via BroadcastChannel
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('stpoints-mining');
      channelRef.current = channel;

      channel.onmessage = (e) => {
        if (e.data === 'MINING_STARTED') {
          // Another tab started mining — stop ours
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            setIsMining(false);
            setError('Těžba zahájena v jiném okně. Zde byla zastavena.');
          }
        }
      };

      return () => channel.close();
    } catch {
      // BroadcastChannel not supported — skip
    }
  }, []);

  // Pause mining when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && workerRef.current && challengeRef.current && progressRef.current) {
        // Tab went hidden — submit what we have and stop
        submitPartialAndStop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  async function submitPartialAndStop() {
    if (isSubmitting.current) return;
    isSubmitting.current = true;

    const currentChallenge = challengeRef.current;
    const currentProgress = progressRef.current;

    // Kill worker immediately
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsMining(false);

    if (currentChallenge && currentProgress && currentProgress.hashesComputed > 0) {
      try {
        // Submit partial work — server will calculate reward from hashesComputed
        const submitResult = await api.mining.submit({
          challengeId: currentChallenge.challengeId,
          nonce: currentProgress.nonce,
          hashesComputed: currentProgress.hashesComputed,
        });
        setResult(submitResult);
      } catch (err: any) {
        // Don't show error for partial submissions — solution hash might not match
        // This is expected when stopping early
        setError(null);
      }
    }
    isSubmitting.current = false;
  }

  const stopMining = useCallback(() => {
    if (isSubmitting.current) return;

    const currentChallenge = challengeRef.current;
    const currentProgress = progressRef.current;

    // Kill worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsMining(false);

    // Submit partial work if we have enough hashes
    if (currentChallenge && currentProgress && currentProgress.hashesComputed >= 10000) {
      isSubmitting.current = true;
      api.mining.submit({
        challengeId: currentChallenge.challengeId,
        nonce: currentProgress.nonce,
        hashesComputed: currentProgress.hashesComputed,
      }).then(submitResult => {
        setResult(submitResult);
      }).catch(() => {
        // Partial submission might fail if hash doesn't meet target — ok
      }).finally(() => {
        isSubmitting.current = false;
      });
    }
  }, []);

  const startMining = useCallback(async () => {
    setError(null);
    setResult(null);
    setProgress(null);
    setHashRate(0);

    // Notify other tabs
    try {
      channelRef.current?.postMessage('MINING_STARTED');
    } catch {}

    try {
      // 1. Request challenge from server
      const challengeData = await api.mining.challenge();
      setChallenge(challengeData);
      challengeRef.current = challengeData;

      // 2. Start Web Worker
      setIsMining(true);
      lastProgressTime.current = Date.now();
      lastProgressHashes.current = 0;

      const worker = new Worker('/worker/miner.js');
      workerRef.current = worker;

      worker.onmessage = async (e: MessageEvent<MiningProgress>) => {
        const msg = e.data;

        if (msg.type === 'PROGRESS') {
          setProgress(msg);
          progressRef.current = msg;

          // Calculate hash rate
          const now = Date.now();
          const elapsed = (now - lastProgressTime.current) / 1000;
          if (elapsed > 0) {
            const rate = Math.round((msg.hashesComputed - lastProgressHashes.current) / elapsed);
            setHashRate(rate);
          }
          lastProgressTime.current = now;
          lastProgressHashes.current = msg.hashesComputed;
        }

        if (msg.type === 'SOLUTION') {
          // 3. Submit solution to server
          try {
            const submitResult = await api.mining.submit({
              challengeId: challengeData.challengeId,
              nonce: msg.nonce,
              hashesComputed: msg.hashesComputed,
            });
            setResult(submitResult);
          } catch (err: any) {
            setError(err.message || 'Chyba při odesílání řešení.');
          }

          // Kill worker after solution
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
          setIsMining(false);
        }
      };

      worker.onerror = () => {
        setError('Chyba v těžebním procesu.');
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        setIsMining(false);
      };

      // Send challenge to worker
      worker.postMessage({
        prefix: challengeData.prefix,
        target: challengeData.target,
        challengeId: challengeData.challengeId,
      });
    } catch (err: any) {
      setError(err.message || 'Nepodařilo se zahájit těžbu.');
      setIsMining(false);
    }
  }, []);

  return {
    isMining,
    progress,
    challenge,
    result,
    error,
    hashRate,
    startMining,
    stopMining,
  };
}
