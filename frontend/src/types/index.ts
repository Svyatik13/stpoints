export interface User {
  id: string;
  username: string;
  email: string;
  balance: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  lastActiveAt: string | null;
}

export interface Transaction {
  id: string;
  type: 'MINING_REWARD' | 'GIVEAWAY' | 'ADMIN_GRANT' | 'TRANSFER' | 'SYSTEM_DEBIT';
  amount: string;
  description: string | null;
  balanceBefore: string;
  balanceAfter: string;
  senderId: string | null;
  receiverId: string;
  sender: { username: string } | null;
  receiver: { username: string };
  createdAt: string;
  isIncoming: boolean;
}

export interface MiningChallenge {
  challengeId: string;
  prefix: string;
  difficulty: number;
  target: string;
  expiresAt: string;
}

export interface MiningResult {
  success: boolean;
  reward: string;
  newBalance: string;
  message: string;
}

export interface MiningStats {
  totalChallenges: number;
  solvedChallenges: number;
  totalReward: string;
}

export interface MiningProgress {
  type: 'PROGRESS' | 'SOLUTION';
  hashesComputed: number;
  currentHash?: string;
  nonce: number;
  challengeId?: string;
  hash?: string;
}

export interface TerminalAccess {
  hasAccess: boolean;
  requiredBalance: string;
  currentBalance: string;
  deficit: string;
  message: string;
}

export interface Giveaway {
  id: string;
  amount: string;
  reason: string | null;
  pool: number;
  createdAt: string;
  winner: { username: string };
}

export interface PaginatedResponse<T> {
  transactions: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
