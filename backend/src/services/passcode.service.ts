import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const PASS_CODE_KEY = 'PASS_CODE';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (no O, 0, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Returns current active pass code or creates one if none exists. */
export async function getActiveCode(): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: PASS_CODE_KEY } });
  if (!setting) {
    const code = generateCode();
    await prisma.systemSetting.create({ data: { key: PASS_CODE_KEY, value: code } });
    return code;
  }
  return setting.value;
}

/** Validates but does NOT rotate — call rotateCodeAfterUse() after successful auth. */
export async function validatePassCode(input: string): Promise<void> {
  const code = await getActiveCode();
  if (input.trim().toUpperCase() !== code.toUpperCase()) {
    throw new AppError('Nesprávný přístupový kód.', 401);
  }
}

/**
 * Called AFTER successful login/register.
 * Logs the old code as USED by this user and generates a new one.
 */
export async function rotateCodeAfterUse(userId: string, username: string): Promise<string> {
  const oldCode = await getActiveCode();
  const newCode = generateCode();

  await prisma.$transaction([
    // Log old code as used
    prisma.passCodeLog.create({
      data: {
        code: oldCode,
        type: 'USED',
        usedBy: username,
        userId,
      },
    }),
    // Set new code
    prisma.systemSetting.update({
      where: { key: PASS_CODE_KEY },
      data: { value: newCode },
    }),
  ]);

  return newCode;
}

/** Admin-triggered manual regeneration. */
export async function regenerateCode(adminUsername: string = 'admin'): Promise<string> {
  const oldCode = await getActiveCode();
  const newCode = generateCode();

  await prisma.$transaction([
    prisma.passCodeLog.create({
      data: {
        code: oldCode,
        type: 'ADMIN_CHANGED',
        usedBy: `Admin (${adminUsername})`,
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: PASS_CODE_KEY },
      create: { key: PASS_CODE_KEY, value: newCode },
      update: { value: newCode },
    }),
  ]);

  return newCode;
}

/** Last N pass code log entries for admin panel. */
export async function getCodeHistory(limit: number = 5) {
  return prisma.passCodeLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
