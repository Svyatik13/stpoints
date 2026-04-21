import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

import prisma from '../config/database';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.cookies?.access_token;

  if (!token) {
    res.status(401).json({ error: 'Přístup odepřen. Přihlaste se.', code: 'UNAUTHORIZED' });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;

    // Lockdown Check: performed asynchronously
    (async () => {
      try {
        const lockdown = await prisma.systemSetting.findUnique({ where: { key: 'is_lockdown' } });
        if (lockdown?.value === 'true') {
          const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { username: true } });
          if (user?.username !== 'st_admin') {
            res.status(403).json({ error: 'WEBSITE ON MAINTENANCE', code: 'MAINTENANCE' });
            return;
          }
        }
        next();
      } catch (err) {
        next(err);
      }
    })();
  } catch (error) {
    res.status(401).json({ error: 'Neplatný nebo vypršelý token.', code: 'TOKEN_EXPIRED' });
  }
};

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Přístup pouze pro administrátory.' });
    return;
  }
  next();
}
