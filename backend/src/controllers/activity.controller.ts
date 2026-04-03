import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

// GET /activity — public event feed
export async function getGlobalActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await prisma.activityEvent.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ events });
  } catch (error) { next(error); }
}
