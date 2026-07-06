import { Request, Response } from 'express';
import prisma from '../config/db';

export async function getAnalyticsSummary(req: Request, res: Response) {
  try {
    const totalCount = await prisma.notification.count();
    const deliveredCount = await prisma.notification.count({ where: { status: 'DELIVERED' } });
    const failedCount = await prisma.notification.count({ where: { status: 'FAILED' } });
    const pendingCount = await prisma.notification.count({ where: { status: 'PENDING' } });
    const processingCount = await prisma.notification.count({ where: { status: 'PROCESSING' } });

    // Opened / Clicked status details from logs/delivery status
    const openCount = await prisma.deliveryStatus.count({ where: { status: 'OPENED' } });
    const clickCount = await prisma.deliveryStatus.count({ where: { status: 'CLICKED' } });

    const successRate = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

    // Notifications by channel
    const channels = ['EMAIL', 'SMS', 'PUSH'];
    const byChannel = await Promise.all(
      channels.map(async (ch) => {
        const count = await prisma.notification.count({ where: { channel: ch as any } });
        return { channel: ch, count };
      })
    );

    // Dynamic timeline chart data (past 7 days)
    const timeline: any[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const count = await prisma.notification.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      const success = await prisma.notification.count({
        where: {
          status: 'DELIVERED',
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      const failed = await prisma.notification.count({
        where: {
          status: 'FAILED',
          createdAt: {
            gte: date,
            lt: nextDay,
          },
        },
      });

      timeline.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        total: count,
        success,
        failed,
      });
    }

    res.json({
      summary: {
        total: totalCount,
        delivered: deliveredCount,
        failed: failedCount,
        pending: pendingCount,
        processing: processingCount,
        openRate: deliveredCount > 0 ? Math.round((openCount / deliveredCount) * 100) : 0,
        clickRate: deliveredCount > 0 ? Math.round((clickCount / deliveredCount) * 100) : 0,
        successRate,
      },
      byChannel,
      timeline,
    });
  } catch (err) {
    console.error('Failed to get analytics summary:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
