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

  // Helper to check if the request is coming from our official domain
  const isOurDomain = (str?: string) => {
    if (!str) return false;
    const lower = str.toLowerCase();
    return (
      lower.includes('stpoints.fun') || 
      lower.includes('localhost') || 
      lower.includes('127.0.0.1') || 
      lower.includes('141.147.53.229')
    );
  };


  // In production, we are strict but allow all our subdomains.
  // In development, we allow localhost but ALSO our production domain (to prevent lockouts).
  const originMatch = isOurDomain(origin);
  const refererMatch = isOurDomain(referer);

  if (!originMatch && !refererMatch) {
    console.warn(`[CSRF Blocked] Mode: ${env.nodeEnv}, Method: ${req.method}, Origin: ${origin}, Referer: ${referer}`);
    res.status(403).json({ error: 'Neplatný původ požadavku (CSRF).' });
    return;
  }

  next();
}
