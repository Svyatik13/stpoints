import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';

const PASS_CODE_KEY = 'PASS_CODE';
const PASS_CODE_MAX_USES_KEY = 'PASS_CODE_MAX_USES';
const PASS_CODE_CURRENT_USES_KEY = 'PASS_CODE_CURRENT_USES';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (no O, 0, I, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Returns current active pass code and its usage stats. */
export async function getPassCodeData(): Promise<{ code: string; maxUses: number; currentUses: number }> {
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: { in: [PASS_CODE_KEY, PASS_CODE_MAX_USES_KEY, PASS_CODE_CURRENT_USES_KEY] }
    }
  });

  const code = settings.find(s => s.key === PASS_CODE_KEY)?.value || '';
  const maxUses = parseInt(settings.find(s => s.key === PASS_CODE_MAX_USES_KEY)?.value || '1', 10);
  const currentUses = parseInt(settings.find(s => s.key === PASS_CODE_CURRENT_USES_KEY)?.value || '0', 10);

  if (!code) {
    const newCode = generateCode();
    await regenerateCode('system', 1);
    return { code: newCode, maxUses: 1, currentUses: 0 };
  }

  return { code, maxUses, currentUses };
}

export async function getActiveCode(): Promise<string> {
  const data = await getPassCodeData();
  return data.code;
}

/** Validates but does NOT rotate — call rotateCodeAfterUse() after successful auth. */
export async function validatePassCode(input: string): Promise<void> {
  const { code, maxUses, currentUses } = await getPassCodeData();
  
  if (input.trim().toUpperCase() !== code.toUpperCase()) {
    throw new AppError('Nesprávný přístupový kód.', 401);
  }

  if (currentUses >= maxUses) {
    throw new AppError('Tento přístupový kód již vypršel.', 401);
  }
}

/**
 * Called AFTER successful login/register.
 * Increments use count and rotates if limit reached.
 */
export async function rotateCodeAfterUse(userId: string, username: string): Promise<void> {
  const { code, maxUses, currentUses } = await getPassCodeData();
  const nextUses = currentUses + 1;

  await prisma.$transaction(async (tx) => {
    // Log use
    await tx.passCodeLog.create({
      data: {
        code: code,
        type: 'USED',
        usedBy: username,
        userId,
      },
    });

    if (nextUses >= maxUses) {
      // Rotate
      const newCode = generateCode();
      await tx.systemSetting.upsert({
        where: { key: PASS_CODE_KEY },
        create: { key: PASS_CODE_KEY, value: newCode },
        update: { value: newCode },
      });
      await tx.systemSetting.upsert({
        where: { key: PASS_CODE_CURRENT_USES_KEY },
        create: { key: PASS_CODE_CURRENT_USES_KEY, value: '0' },
        update: { value: '0' },
      });
    } else {
      // Just increment
      await tx.systemSetting.upsert({
        where: { key: PASS_CODE_CURRENT_USES_KEY },
        create: { key: PASS_CODE_CURRENT_USES_KEY, value: nextUses.toString() },
        update: { value: nextUses.toString() },
      });
    }
  });
}

/** Admin-triggered manual regeneration. */
export async function regenerateCode(adminUsername: string = 'admin', maxUses: number = 1): Promise<string> {
  const data = await getPassCodeData();
  const newCode = generateCode();

  await prisma.$transaction([
    prisma.passCodeLog.create({
      data: {
        code: data.code || 'INIT',
        type: 'ADMIN_CHANGED',
        usedBy: `Admin (${adminUsername})`,
      },
    }),
    prisma.systemSetting.upsert({
      where: { key: PASS_CODE_KEY },
      create: { key: PASS_CODE_KEY, value: newCode },
      update: { value: newCode },
    }),
    prisma.systemSetting.upsert({
      where: { key: PASS_CODE_MAX_USES_KEY },
      create: { key: PASS_CODE_MAX_USES_KEY, value: maxUses.toString() },
      update: { value: maxUses.toString() },
    }),
    prisma.systemSetting.upsert({
      where: { key: PASS_CODE_CURRENT_USES_KEY },
      create: { key: PASS_CODE_CURRENT_USES_KEY, value: '0' },
      update: { value: '0' },
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
