import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  userId: string;
  role: string;
  rememberMe?: boolean;
}

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiry as any,
  };
  return jwt.sign(payload as object, env.jwt.secret, options);
}

export function signRefreshToken(payload: TokenPayload, longLived: boolean = false): string {
  const options: SignOptions = {
    expiresIn: longLived ? '30d' : (env.jwt.refreshExpiry as any),
  };
  return jwt.sign(payload as object, env.jwt.refreshSecret, options);
}


export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwt.secret) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as TokenPayload;
}
