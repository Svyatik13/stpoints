import prisma from '../config/database';

export type ActivityType = 'BID' | 'STAKE' | 'WIN' | 'TIP' | 'MARKET_SALE' | 'CASE_OPENING';

export async function logActivity(type: ActivityType, payload: any) {
  try {
    const event = await prisma.activityEvent.create({
      data: {
        type,
        payload,
      },
    });

    // Optional: Only keep the last 100 events to keep DB clean
    const count = await prisma.activityEvent.count();
    if (count > 150) {
      const oldest = await prisma.activityEvent.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (oldest) {
        await prisma.activityEvent.delete({ where: { id: oldest.id } });
      }
    }

    return event;
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
