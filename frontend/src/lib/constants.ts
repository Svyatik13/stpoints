export const APP_NAME = 'ST-Points';
export const APP_DOMAIN = 'stpoints.fun';
export const ST_ROOM_COST = 50;

// Main nav items (always visible)
export const NAV_ITEMS = [
  { href: '/wallet', label: 'Peněženka', icon: '💎' },
  { href: '/mining', label: 'Těžba', icon: '⛏️' },
  { href: '/giveaways', label: 'ST-Drops', icon: '🎁' },
  { href: '/st-room', label: 'ST-ROOM', icon: '🔐' },
] as const;

// Gambling section — shown as a dropdown
export const GAMBLING_ITEMS = [
  { href: '/coinflip', label: 'Coinflip', icon: '🪙' },
] as const;

// Market is its own item
export const MARKET_ITEMS = [
  { href: '/market', label: 'Tržiště', icon: '🏪' },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Admin', icon: '⚙️' },
] as const;

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  MINING_REWARD: 'Těžba',
  GIVEAWAY: 'ST-Drop',
  ADMIN_GRANT: 'Admin',
  TRANSFER: 'Převod',
  TIP: 'Spropitné',
  SYSTEM_DEBIT: 'Systém',
  ST_ROOM_ACCESS: 'ST-ROOM',
  MARKET_SALE: 'Tržiště',
  MARKET_PURCHASE: 'Tržiště',
  HANDLE_CREATE: 'Handle',
  REFERRAL_REWARD: 'Affiliate',
  COINFLIP_WIN: 'Coinflip',
  COINFLIP_LOSS: 'Coinflip',
  DAILY_REWARD: 'Streak',
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  MINING_REWARD: 'badge-purple',
  GIVEAWAY: 'badge-gold',
  ADMIN_GRANT: 'badge-emerald',
  TRANSFER: 'badge-cyan',
  TIP: 'badge-emerald',
  SYSTEM_DEBIT: 'badge-red',
  ST_ROOM_ACCESS: 'badge-purple',
  MARKET_SALE: 'badge-emerald',
  MARKET_PURCHASE: 'badge-red',
  HANDLE_CREATE: 'badge-cyan',
  REFERRAL_REWARD: 'badge-emerald',
  COINFLIP_WIN: 'badge-gold',
  COINFLIP_LOSS: 'badge-red',
  DAILY_REWARD: 'badge-emerald',
};

// Activity feed event formatting
export const ACTIVITY_ICONS: Record<string, string> = {
  COINFLIP: '🪙',
  TIP: '💰',
  TRANSFER: '💸',
  MINING: '⛏️',
  GIVEAWAY: '🎁',
  STREAK: '🔥',
  BID: '🔨',
  WIN: '🏆',
};
