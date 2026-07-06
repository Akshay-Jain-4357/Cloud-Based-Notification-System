import { Request, Response } from 'express';
import prisma from '../config/db';
import { enqueueNotification, processQueueOffline } from '../services/sqs';

export async function getQueueItems(req: Request, res: Response) {
  try {
    const queue = await prisma.notificationQueue.findMany({
      include: {
        notification: true,
      },
      orderBy: { visibleAfter: 'asc' },
    });
    res.json(queue);
  } catch (err) {
    console.error('Failed to get queue items:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function retryQueueItem(req: Request, res: Response) {
  try {
    const { notificationId } = req.body;

    const queueItem = await prisma.notificationQueue.findUnique({
      where: { notificationId },
    });

    if (!queueItem) {
      return res.status(404).json({ error: 'Queue item not found or already processed' });
    }

    // Unlock and make it visible immediately
    await prisma.notificationQueue.update({
      where: { notificationId },
      data: {
        lockedAt: null,
        visibleAfter: new Date(),
        attempts: 0,
      },
    });

    // Run queue worker
    processQueueOffline().catch(console.error);

    res.json({ message: 'Notification queued for immediate retry' });
  } catch (err) {
    console.error('Failed to retry queue item:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSystemLogs(req: Request, res: Response) {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        notification: {
          select: {
            title: true,
            channel: true,
          },
        },
      },
    });
    res.json(logs);
  } catch (err) {
    console.error('Failed to get system logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function triggerBulkEvent(req: Request, res: Response) {
  try {
    const { eventType, targetUserId } = req.body;

    if (!eventType || !targetUserId) {
      return res.status(400).json({ error: 'Event type and target user ID are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    // Create custom event triggered notifications
    let title = '';
    let subject = '';
    let message = '';
    let channel: 'EMAIL' | 'SMS' | 'PUSH' = 'EMAIL';

    const dateStr = new Date().toLocaleDateString();

    switch (eventType) {
      case 'USER_REGISTERED':
        title = 'Welcome aboard!';
        subject = 'Welcome to NotifyFlow!';
        message = `Hello ${user.name},\n\nWelcome to NotifyFlow! We are thrilled to have you with us. Explore your dashboard to get started.\n\nDate: ${dateStr}`;
        channel = 'EMAIL';
        break;
      case 'PAYMENT_SUCCESSFUL':
        title = 'Payment Received';
        subject = 'Invoice for Order #NF-8849';
        message = `Hi ${user.name}, your payment for order #NF-8849 of $49.00 was successful. Thank you for your business!`;
        channel = 'EMAIL';
        break;
      case 'SECURITY_ALERT':
        title = 'New Login Alert';
        message = `Security Alert: A new login was detected from Chrome on Windows for user ${user.email} at ${dateStr}. If this wasn't you, please reset your password.`;
        channel = 'SMS';
        break;
      case 'PROMOTION_CAMPAIGN':
        title = 'Weekly Premium Digest';
        message = `Hey ${user.name}! Check out our new serverless lambda integrations. Build and deploy notifications with zero code.`;
        channel = 'PUSH';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported event type' });
    }

    // Insert template relation if name exists
    const template = await prisma.notificationTemplate.findFirst({
      where: { category: eventType },
    });

    const notification = await prisma.notification.create({
      data: {
        title,
        subject,
        message,
        channel,
        priority: 'HIGH',
        status: 'PENDING',
        userId: user.id,
        templateId: template?.id || null,
      },
    });

    await prisma.deliveryStatus.create({
      data: {
        notificationId: notification.id,
        status: 'PENDING',
      },
    });

    await enqueueNotification(notification.id);

    res.status(201).json({
      message: `Event ${eventType} triggered successfully`,
      notification,
    });
  } catch (err) {
    console.error('Failed to trigger bulk event:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
