import prisma from '../config/database';
import { logger } from '../utils/logger';

export interface RiskCoinTick {
  price: string;
  timestamp: string;
}

let currentPrice = 1.0; 
let currentMomentum = 0;
let cycleMode: 'BULL' | 'BEAR' = 'BULL';
let cycleCounter = 0;
let tickCount = 0;

const historyMaxPoints = 100; 
export let riskCoinHistory: RiskCoinTick[] = [
  { price: '1.000000', timestamp: new Date().toISOString() }
];

export function getRiskCoinState() {
  return {
    currentPrice: currentPrice.toFixed(6),
    history: riskCoinHistory
  };
}

async function loadRiskCoinState() {
  try {
    const priceSetting = await prisma.systemSetting.findUnique({ where: { key: 'risk_coin_price' } });
    const historySetting = await prisma.systemSetting.findUnique({ where: { key: 'risk_coin_history' } });

    if (priceSetting) {
      currentPrice = parseFloat(priceSetting.value);
    }
    if (historySetting) {
      try {
        riskCoinHistory = JSON.parse(historySetting.value);
      } catch (e) {
        logger.error('Failed to parse risk_coin_history from DB:', e);
      }
    }
    logger.info(`Risk-Coin state loaded: Price=${currentPrice}`);
  } catch (error) {
    logger.error('Error loading Risk-Coin state from DB:', error);
  }
}

async function saveRiskCoinState() {
  try {
    await prisma.$transaction([
      prisma.systemSetting.upsert({
        where: { key: 'risk_coin_price' },
        update: { value: currentPrice.toString() },
        create: { key: 'risk_coin_price', value: currentPrice.toString() }
      }),
      prisma.systemSetting.upsert({
        where: { key: 'risk_coin_history' },
        update: { value: JSON.stringify(riskCoinHistory) },
        create: { key: 'risk_coin_history', value: JSON.stringify(riskCoinHistory) }
      })
    ]);
  } catch (error) {
    logger.error('Error saving Risk-Coin state to DB:', error);
  }
}

// 500ms Tick Engine
export function tickRiskCoin() {
  tickCount++;
  cycleCounter++;
  
  // Shift cycle every 10-30 seconds
  if (cycleCounter > (Math.random() * 40 + 20)) {
    cycleMode = Math.random() < 0.45 ? 'BULL' : 'BEAR'; // Slight bear bias for risk
    cycleCounter = 0;
  }

  // Volatility scale
  const volatility = 0.04; 
  
  // Momentum shift
  const momentumShift = (Math.random() * 2 - 1) * 0.008;
  currentMomentum += momentumShift;

  // Cycle bias
  const cycleBias = cycleMode === 'BULL' ? 0.003 : -0.003;
  
  // Recovery bias: If price is super low, force some upward pressure
  let recoveryBias = 0;
  if (currentPrice < 0.1) recoveryBias = 0.005;
  if (currentPrice < 0.01) recoveryBias = 0.015;

  // Cap momentum
  if (currentMomentum > 0.04) currentMomentum = 0.04;
  if (currentMomentum < -0.04) currentMomentum = -0.04;

  // Decay momentum
  currentMomentum *= 0.95;

  let rawNoise = (Math.random() * 2 - 1) * volatility;
  let movePercent = rawNoise + currentMomentum + cycleBias + recoveryBias;

  // Major Spike/Crash (2% chance)
  if (Math.random() < 0.02) {
    if (cycleMode === 'BULL' || Math.random() < 0.4) {
      // Pump
      movePercent += (Math.random() * 0.4 + 0.1); 
    } else {
      // Dump
      movePercent -= (Math.random() * 0.5 + 0.2); 
    }
  }

  currentPrice = currentPrice * (1 + movePercent);

  // Hard floor
  if (currentPrice < 0.0001) currentPrice = 0.0001;
  // Soft ceiling to prevent vertical infinity (though unlikely)
  if (currentPrice > 100000) currentPrice = 100000;

  // Record history
  riskCoinHistory.push({
    price: currentPrice.toFixed(6),
    timestamp: new Date().toISOString()
  });

  if (riskCoinHistory.length > historyMaxPoints) {
    riskCoinHistory.shift();
  }

  // Save to DB every 20 ticks (10 seconds)
  if (tickCount >= 20) {
    saveRiskCoinState();
    tickCount = 0;
  }
}

export async function startRiskCoinEngine() {
  await loadRiskCoinState();
  logger.info('Risk-Coin Engine started.');
  setInterval(tickRiskCoin, 500); 
}
