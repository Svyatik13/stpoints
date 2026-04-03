import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  username: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export async function registerUser(input: RegisterInput): Promise<{ user: any; tokens: AuthTokens }> {
  // Check for existing user
  const existing = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existing) {
    throw new AppError('Toto uživatelské jméno je obsazené.', 409);
  }

  // Validate password strength
  if (input.password.length < 8) {
    throw new AppError('Heslo musí mít alespoň 8 znaků.', 400);
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
    },
    select: {
      id: true,
      username: true,
      balance: true,
      role: true,
      createdAt: true,
    },
  });

  const payload: TokenPayload = { userId: user.id, role: user.role };
  const tokens: AuthTokens = {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };

  logger.success(`Nový uživatel registrován: ${user.username}`);

  return { user, tokens };
}

export async function loginUser(input: LoginInput): Promise<{ user: any; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    select: {
      id: true,
      username: true,
      passwordHash: true,
      balance: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('Neplatné přihlašovací údaje.', 401);
  }

  if (!user.isActive) {
    throw new AppError('Účet byl deaktivován.', 403);
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError('Neplatné přihlašovací údaje.', 401);
  }

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const payload: TokenPayload = { userId: user.id, role: user.role };
  const tokens: AuthTokens = {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };

  const { passwordHash, ...safeUser } = user;

  logger.info(`Uživatel přihlášen: ${user.username}`);

  return { user: safeUser, tokens };
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    const payload = verifyRefreshToken(refreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new AppError('Token obnovy neplatný.', 401);
    }

    const newPayload: TokenPayload = { userId: user.id, role: user.role };

    return {
      accessToken: signAccessToken(newPayload),
      refreshToken: signRefreshToken(newPayload),
    };
  } catch (error) {
    throw new AppError('Token obnovy neplatný nebo vypršel.', 401);
  }
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      balance: true,
      role: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  if (!user) {
    throw new AppError('Uživatel nenalezen.', 404);
  }

  return user;
}
