import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../config/db';
import { enqueueNotification } from '../services/sqs';

export async function createNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const { title, subject, message, priority, channel, scheduledFor, expiresAt, templateId, targetUserId } = req.body;
    const authorUserId = req.user?.id;

    if (!title || !message || !channel) {
      return res.status(400).json({ error: 'Title, message, and channel are required fields' });
    }

    const scheduledDate = scheduledFor ? new Date(scheduledFor) : null;
    const expiresDate = expiresAt ? new Date(expiresAt) : null;

    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        title,
        subject,
        message,
        priority: priority || 'MEDIUM',
        channel,
        status: scheduledDate && scheduledDate > new Date() ? 'PENDING' : 'PENDING',
        scheduledFor: scheduledDate,
        expiresAt: expiresDate,
        userId: targetUserId || authorUserId, // target user preferences will control delivery
        templateId: templateId || null,
      },
    });

    await prisma.deliveryStatus.create({
      data: {
        notificationId: notification.id,
        status: 'PENDING',
      },
    });

    // Enqueue if immediately processed (scheduledFor is null or in the past)
    if (!scheduledDate || scheduledDate <= new Date()) {
      await enqueueNotification(notification.id);
    } else {
      console.log(`[Scheduler] Notification ${notification.id} scheduled for ${scheduledDate}`);
    }

    res.status(201).json(notification);
  } catch (err: any) {
    console.error('Failed to create notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { channel, priority, status, search, sort, page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const where: any = {};
    if (role !== 'ADMIN') {
      where.userId = userId;
    } else if (req.query.targetUserId) {
      where.userId = req.query.targetUserId as string;
    }

    if (channel) where.channel = channel;
    if (priority) where.priority = priority;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
        { message: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sort === 'oldest') {
      orderBy.createdAt = 'asc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          user: { select: { name: true, email: true } },
          template: { select: { name: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({
      notifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getNotificationDetails(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        logs: { orderBy: { createdAt: 'desc' } },
        statuses: { orderBy: { timestamp: 'asc' } },
        user: { select: { name: true, email: true } },
        template: true,
      },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (err) {
    console.error('Failed to fetch notification details:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancelNotification(req: AuthenticatedRequest, res: Response) {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: { queueItem: true },
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // Mark status cancelled
    await prisma.notification.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    // Remove from queue
    if (notification.queueItem) {
      await prisma.notificationQueue.delete({
        where: { notificationId: id },
      });
    }

    await prisma.deliveryStatus.create({
      data: {
        notificationId: id,
        status: 'CANCELLED',
      },
    });

    res.json({ message: 'Notification cancelled successfully' });
  } catch (err) {
    console.error('Failed to cancel notification:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
