import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * CSRF protection via Origin header validation.
 * Only applies to state-changing methods (POST, PUT, DELETE).
 * Allows requests with no Origin (e.g. server-to-server, Postman in dev).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // In production, require Origin or Referer to match frontend URL
  if (env.nodeEnv === 'production') {
    const allowed = env.frontendUrl;
    const originMatch = origin && origin === allowed;
    const refererMatch = referer && referer.startsWith(allowed);

    if (!originMatch && !refererMatch) {
      res.status(403).json({ error: 'Neplatný původ požadavku (CSRF).' });
      return;
    }
  } else {
    // In development, allow localhost origins
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      res.status(403).json({ error: 'Neplatný původ požadavku (CSRF).' });
      return;
    }
  }

  next();
}
