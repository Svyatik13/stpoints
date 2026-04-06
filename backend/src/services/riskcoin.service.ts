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
let targetCycleTicks = 60; // 30s initial
let isSuperCycle = false;
let tickCount = 0;

// Track 5-minute highs for breakouts (600 ticks)
let priceHistory5m: number[] = [];
let maxPrice5m = 1.0;

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
      maxPrice5m = currentPrice;
    }
    if (historySetting) {
      try {
        riskCoinHistory = JSON.parse(historySetting.value);
      } catch (e) {
        logger.error('Failed to parse risk_coin_history from DB:', e);
      }
    }
    logger.info(`Risk-Coin state loaded: Price=${currentPrice}${isSuperCycle ? ' [SUPERCYCLE]' : ''}`);
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
  
  // Shift cycle based on target duration
  if (cycleCounter >= targetCycleTicks) {
    // 5% chance for a SuperCycle (Moon/Doom)
    if (Math.random() < 0.05) {
      isSuperCycle = true;
      targetCycleTicks = Math.floor(Math.random() * 600 + 600); // 5-10 minutes
      cycleMode = Math.random() < 0.8 ? 'BULL' : 'BEAR'; // SuperCycles are 80% likely to be Bull
      logger.info(`☣️ RISK-COIN: ${cycleMode} SUPERCYCLE STARTED! Duration: ${targetCycleTicks} ticks.`);
    } else {
      isSuperCycle = false;
      targetCycleTicks = Math.floor(Math.random() * 80 + 40); // 20-60 seconds
      cycleMode = Math.random() < 0.45 ? 'BULL' : 'BEAR'; // Slight bear bias for risk
    }
    cycleCounter = 0;
  }

  // Base volatility scales slightly with price (log scale)
  // Higher price = more explosive moves
  const priceMultiplier = Math.max(1, Math.log10(currentPrice + 9));
  const volatility = 0.035 * priceMultiplier; 
  
  // Momentum shift
  const momentumShift = (Math.random() * 2 - 1) * 0.01 * priceMultiplier;
  currentMomentum += momentumShift;

  // Cycle bias - Stronger during SuperCycles
  const biasMagnitude = isSuperCycle ? 0.008 : 0.0035;
  const cycleBias = cycleMode === 'BULL' ? biasMagnitude : -biasMagnitude;
  
  // Breakout Logic: If currentPrice > maxPrice5m, add a "Booster"
  let breakoutBoost = 0;
  if (currentPrice > maxPrice5m && cycleMode === 'BULL') {
    breakoutBoost = 0.005; // Extra 0.5% push per tick during breakouts
  }

  // Recovery bias: If price is super low, force some upward pressure
  let recoveryBias = 0;
  if (currentPrice < 0.2) recoveryBias = 0.006 * priceMultiplier;
  if (currentPrice < 0.02) recoveryBias = 0.02 * priceMultiplier;

  // Cap momentum - Higher ceiling at higher prices
  const momentumCap = 0.05 * priceMultiplier;
  if (currentMomentum > momentumCap) currentMomentum = momentumCap;
  if (currentMomentum < -momentumCap) currentMomentum = -momentumCap;

  // Decay momentum - Slower decay during Bull SuperCycles
  const decayFactor = (isSuperCycle && cycleMode === 'BULL') ? 0.98 : 0.94;
  currentMomentum *= decayFactor;

  let rawNoise = (Math.random() * 2 - 1) * volatility;
  let movePercent = rawNoise + currentMomentum + cycleBias + recoveryBias + breakoutBoost;

  // Major Spike/Crash (2.5% chance)
  if (Math.random() < 0.025) {
    const magnitude = isSuperCycle ? 0.6 : 0.4;
    if (cycleMode === 'BULL' || Math.random() < 0.35) {
      // Pump
      movePercent += (Math.random() * magnitude + 0.15); 
    } else {
      // Dump
      movePercent -= (Math.random() * magnitude + 0.2); 
    }
  }

  currentPrice = currentPrice * (1 + movePercent);

  // Hard floor
  if (currentPrice < 0.0001) currentPrice = 0.0001;
  // Soft ceiling
  if (currentPrice > 1000000) currentPrice = 1000000;

  // Track 5-minute high
  priceHistory5m.push(currentPrice);
  if (priceHistory5m.length > 600) {
    priceHistory5m.shift();
  }
  maxPrice5m = Math.max(...priceHistory5m);

  // Record history
  riskCoinHistory.push({
    price: currentPrice.toFixed(18),
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
