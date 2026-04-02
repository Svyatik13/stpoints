export const APP_NAME = 'ST-Points';
export const APP_DOMAIN = 'stpoints.fun';
export const TERMINAL_MIN_BALANCE = 500;

export const NAV_ITEMS = [
  { href: '/wallet', label: 'Peněženka', icon: '💎' },
  { href: '/mining', label: 'Těžba', icon: '⛏️' },
  { href: '/giveaways', label: 'ST-Drops', icon: '🎁' },
  { href: '/terminal', label: 'Terminál', icon: '🔒' },
] as const;

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Admin', icon: '⚙️' },
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
