import { Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const MAX_MESSAGE_LENGTH = 500;
const PAGE_SIZE = 50;

/**
 * GET /api/chat
 * Fetch the last 50 messages with user info (titles)
 */
export async function getMessages(_req: Request, res: Response) {
  const messages = await prisma.chatMessage.findMany({
    take: PAGE_SIZE,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          username: true,
          activeTitle: true,
        },
      },
    },
  });

  // Return in chronological order for the client
  res.json({ messages: messages.reverse() });
}

/**
 * POST /api/chat/send
 * Send a new message
 */
export async function sendMessage(req: Request, res: Response) {
  const userId = req.user!.userId;
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    throw new AppError('Zpráva je povinná.', 400);
  }

  const trimmed = message.trim();
  if (trimmed.length === 0) {
    throw new AppError('Zpráva nesmí být prázdná.', 400);
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new AppError(`Zpráva je příliš dlouhá (max ${MAX_MESSAGE_LENGTH} znaků).`, 400);
  }

  // Rate limiting: 1 message per 2 seconds
  const lastMessage = await prisma.chatMessage.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (lastMessage && Date.now() - lastMessage.createdAt.getTime() < 2000) {
    throw new AppError('Zprávy posíláte příliš rychle. Počkejte chvíli.', 429);
  }

  const newMessage = await prisma.chatMessage.create({
    data: {
      userId,
      message: trimmed,
    },
    include: {
      user: {
        select: {
          username: true,
          activeTitle: true,
        },
      },
    },
  });

  res.json({ message: newMessage });
}
