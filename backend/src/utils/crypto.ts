import crypto from 'crypto';

/**
 * Derive a deterministic 0x-prefixed transaction hash from a transaction ID.
 * Looks like: 0x7a3f2b...
 */
export function txHash(txId: string): string {
  const hash = crypto.createHash('sha256').update(`stpoints-tx:${txId}`).digest('hex');
  return `0x${hash}`;
}

/**
 * Derive a deterministic 0x-prefixed wallet address from a user ID.
 * 20-byte address like Ethereum: 0x7a3f2b1c...
 */
export function walletAddress(userId: string): string {
  const hash = crypto.createHash('sha256').update(`stpoints-wallet:${userId}`).digest('hex');
  return `0x${hash.slice(0, 40)}`;
}
