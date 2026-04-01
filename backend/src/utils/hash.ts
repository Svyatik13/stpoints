import crypto from 'crypto';

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function generateRandomPrefix(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

export function computeTarget(difficulty: number): string {
  // Target: a hex string that the hash must be less than
  // Higher difficulty = more leading zeros required
  const leadingZeros = '0'.repeat(difficulty);
  const rest = 'f'.repeat(64 - difficulty);
  return leadingZeros + rest;
}
