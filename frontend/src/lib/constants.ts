export const APP_NAME = 'ST-Points';
export const APP_DOMAIN = 'stpoints.fun';
export const TERMINAL_MIN_BALANCE = 500;

export const NAV_ITEMS = [
  { href: '/wallet', label: 'Moje Peněženka', icon: '💎' },
  { href: '/mining', label: 'ZČU Těžební Uzel', icon: '⛏️' },
  { href: '/terminal', label: 'ST-RM Terminál', icon: '🔒' },
] as const;

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  MINING_REWARD: 'Těžba',
  GIVEAWAY: 'ST-Drop',
  ADMIN_GRANT: 'Admin',
  TRANSFER: 'Převod',
  SYSTEM_DEBIT: 'Systém',
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  MINING_REWARD: 'badge-purple',
  GIVEAWAY: 'badge-gold',
  ADMIN_GRANT: 'badge-emerald',
  TRANSFER: 'badge-cyan',
  SYSTEM_DEBIT: 'badge-red',
};
