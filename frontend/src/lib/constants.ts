export const APP_NAME = 'ST-Points';
export const APP_DOMAIN = 'stpoints.fun';
export const ST_ROOM_COST = 50;

export const NAV_ITEMS = [
  { href: '/wallet', label: 'Peněženka', icon: '💎' },
  { href: '/mining', label: 'Těžba', icon: '⛏️' },
  { href: '/giveaways', label: 'ST-Drops', icon: '🎁' },
  { href: '/cases', label: 'Cases', icon: '📦' },
  { href: '/st-room', label: 'ST-ROOM', icon: '🔐' },
  { href: '/leaderboard', label: 'Žebříček', icon: '🏆' },
  { href: '/profile', label: 'Profil', icon: '👤' },
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
  ST_ROOM_ACCESS: 'ST-ROOM',
  CASE_OPENING: 'Case',
};

export const TRANSACTION_TYPE_COLORS: Record<string, string> = {
  MINING_REWARD: 'badge-purple',
  GIVEAWAY: 'badge-gold',
  ADMIN_GRANT: 'badge-emerald',
  TRANSFER: 'badge-cyan',
  SYSTEM_DEBIT: 'badge-red',
  ST_ROOM_ACCESS: 'badge-purple',
  CASE_OPENING: 'badge-gold',
};
