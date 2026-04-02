'use client';

import { useState, useRef, useCallback } from 'react';
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

  const stopMining = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsMining(false);
  }, []);

  const startMining = useCallback(async () => {
    setError(null);
    setResult(null);
    setProgress(null);
    setHashRate(0);

    try {
      // 1. Request challenge from server
      const challengeData = await api.mining.challenge();
      setChallenge(challengeData);

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

          stopMining();
        }
      };

      worker.onerror = (e) => {
        setError('Chyba v těžebním procesu.');
        stopMining();
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
  }, [stopMining]);

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
