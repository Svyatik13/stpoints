import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * CSRF protection via Origin/Referer validation.
 * Only applies to state-changing methods (POST, PUT, DELETE).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // In production, require Origin or Referer to match known domains
  if (env.nodeEnv === 'production') {
    const allowed = env.frontendUrl;
    
    // Check if either Origin or Referer contains our domain
    const isOurDomain = (str?: string) => {
      if (!str) return false;
      const lower = str.toLowerCase();
      return lower.includes('stpoints.fun') || lower.includes(allowed.toLowerCase());
    };

    const originMatch = isOurDomain(origin);
    const refererMatch = isOurDomain(referer);

    if (!originMatch && !refererMatch) {
      console.warn(`[CSRF Blocked] Method: ${req.method}, Path: ${req.path}, Origin: ${origin}, Referer: ${referer}`);
      res.status(403).json({ error: 'Neplatný původ požadavku (CSRF).' });
      return;
    }
  } else {
    // In development, allow localhost origins
    const isLocal = (str?: string) => {
      if (!str) return true; // Allow no origin in dev for Postman etc.
      return str.includes('localhost') || str.includes('127.0.0.1');
    };

    if (!isLocal(origin) && !isLocal(referer)) {
      res.status(403).json({ error: 'Neplatný původ požadavku (CSRF).' });
      return;
    }
  }

  next();
}
