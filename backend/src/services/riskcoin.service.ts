import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { logger } from '../utils/logger';

// Risk-Coin Engine State (Memory only, high performance)
// Target: extreme volatility, rapid updates, crash potential
export interface RiskCoinTick {
  price: string;
  timestamp: string;
}

let currentPrice = 1.0; // Base starting price
let currentMomentum = 0;
const historyMaxPoints = 100; 
export const riskCoinHistory: RiskCoinTick[] = [
  { price: '1.000000', timestamp: new Date().toISOString() }
];

export function getRiskCoinState() {
  return {
    currentPrice: currentPrice.toFixed(6),
    history: riskCoinHistory
  };
}

// 500ms Tick Engine
export function tickRiskCoin() {
  // Volatility scale
  const volatility = 0.05; // 5% absolute max regular noise per tick (super fast)
  
  // Random shift in momentum between -0.01 and +0.01
  const shift = (Math.random() * 2 - 1) * 0.01;
  currentMomentum += shift;

  // Cap momentum
  if (currentMomentum > 0.05) currentMomentum = 0.05;
  if (currentMomentum < -0.05) currentMomentum = -0.05;

  // Decay momentum towards 0 slightly
  currentMomentum *= 0.98;

  let rawNoise = (Math.random() * 2 - 1) * volatility;
  let movePercent = rawNoise + currentMomentum;

  // Rare major crashes or spikes (1% chance per tick)
  if (Math.random() < 0.01) {
    if (Math.random() < 0.3) {
      // 30% chance it's a spike
      movePercent += (Math.random() * 0.5 + 0.2); // +20% to +70%
    } else {
      // 70% chance it's a brutal crash
      movePercent -= (Math.random() * 0.6 + 0.3); // -30% to -90%
    }
  }

  currentPrice = currentPrice * (1 + movePercent);

  // Hard floor to prevent zero
  if (currentPrice < 0.0001) currentPrice = 0.0001;

  // Record history
  riskCoinHistory.push({
    price: currentPrice.toFixed(6),
    timestamp: new Date().toISOString()
  });

  if (riskCoinHistory.length > historyMaxPoints) {
    riskCoinHistory.shift();
  }
}

export function startRiskCoinEngine() {
  setInterval(tickRiskCoin, 500); // Ticks twice per second
}
