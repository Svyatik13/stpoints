import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: 'Přístup odepřen. Přihlaste se.', code: 'UNAUTHORIZED' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Neplatný nebo vypršelý token.', code: 'TOKEN_EXPIRED' });
    return;
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Přístup pouze pro administrátory.' });
    return;
  }
  next();
}
