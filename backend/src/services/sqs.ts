import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';
import prisma from '../config/db';
import { sendEmail } from './ses';
import { sendSMS } from './twilio';
import { sendPush } from './fcm';
import { io } from '../server'; // We will export io from server.ts

dotenv.config();

const useMocks = process.env.USE_LOCAL_MOCKS === 'true';
let sqsClient: SQSClient | null = null;

if (!useMocks) {
  try {
    sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  } catch (err) {
    console.error('Failed to initialize AWS SQS Client:', err);
  }
}

// Add notification to SQS or internal database queue
export async function enqueueNotification(notificationId: string): Promise<boolean> {
  // Update status to PENDING
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'PENDING' },
  });

  // Create queue item
  await prisma.notificationQueue.upsert({
    where: { notificationId },
    create: {
      notificationId,
      attempts: 0,
      visibleAfter: new Date(),
    },
    update: {
      attempts: 0,
      visibleAfter: new Date(),
      lockedAt: null,
      error: null,
    },
  });

  // Broadcast queue update via socket
  notifyQueueUpdate();

  if (useMocks || !sqsClient) {
    console.log(`[Queue Service] Notification ${notificationId} enqueued locally.`);
    // Trigger immediate local background processing
    processQueueOffline().catch(console.error);
    return true;
  }

  try {
    const queueUrl = process.env.AWS_SQS_QUEUE_URL || '';
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ notificationId }),
    });
    await sqsClient.send(command);
    return true;
  } catch (err) {
    console.error('AWS SQS SendMessage failed, using local queue processing fallback:', err);
    processQueueOffline().catch(console.error);
    return true;
  }
}

// Live notify WebSocket clients of queue state change
export function notifyQueueUpdate() {
  if (io) {
    prisma.notificationQueue.count().then(count => {
      io.emit('queue-status', { count });
    }).catch(() => {});
  }
}

// Background worker processing simulation
let isProcessing = false;
export async function processQueueOffline() {
  if (isProcessing) return;
  isProcessing = true;

  try {
    while (true) {
      // Find a message that is ready (visibleAfter <= now, lockedAt is null)
      const now = new Date();
      const queueItem = await prisma.notificationQueue.findFirst({
        where: {
          visibleAfter: { lte: now },
          lockedAt: null,
        },
        include: {
          notification: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!queueItem) {
        break; // No items to process
      }

      // Lock item
      await prisma.notificationQueue.update({
        where: { id: queueItem.id },
        data: { lockedAt: new Date() },
      });

      // Process notification
      await processNotificationItem(queueItem);
    }
  } catch (err) {
    console.error('Error processing offline queue:', err);
  } finally {
    isProcessing = false;
    notifyQueueUpdate();
  }
}

export async function processNotificationItem(queueItem: any) {
  const { notification, id: queueItemId, notificationId } = queueItem;
  const start = Date.now();

  try {
    // Check user preferences
    if (notification.userId) {
      const prefs = await prisma.userPreferences.findUnique({
        where: { userId: notification.userId },
      });

      if (prefs) {
        const isEmailBlocked = notification.channel === 'EMAIL' && !prefs.emailEnabled;
        const isSmsBlocked = notification.channel === 'SMS' && !prefs.smsEnabled;
        const isPushBlocked = notification.channel === 'PUSH' && !prefs.pushEnabled;

        if (isEmailBlocked || isSmsBlocked || isPushBlocked) {
          throw new Error(`Notification cancelled: Channel ${notification.channel} is disabled in user preferences.`);
        }
      }
    }

    // Set notification status to PROCESSING
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'PROCESSING' },
    });

    await prisma.deliveryStatus.create({
      data: {
        notificationId,
        status: 'PROCESSING',
      },
    });

    io?.emit('notification-update', { id: notificationId, status: 'PROCESSING' });

    let deliveryResult: { success: boolean; messageId?: string; sid?: string; error?: string };

    // Dispatch depending on the channel
    if (notification.channel === 'EMAIL') {
      const recipient = notification.user?.email || 'test@example.com';
      deliveryResult = await sendEmail(
        recipient,
        notification.subject || 'No Subject',
        notification.message, // HTML Body
        notification.message // Plain text fallback
      );
    } else if (notification.channel === 'SMS') {
      // Mock or database-mapped user phone
      const phone = '+15005550006'; 
      deliveryResult = await sendSMS(phone, notification.message);
    } else { // PUSH
      const mockToken = 'mock-device-token';
      deliveryResult = await sendPush(mockToken, notification.title, notification.message);
    }

    const durationMs = Date.now() - start;

    if (deliveryResult.success) {
      // Mark as delivered
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: 'DELIVERED' },
      });

      await prisma.deliveryStatus.create({
        data: {
          notificationId,
          status: 'DELIVERED',
          metadata: JSON.stringify(deliveryResult),
        },
      });

      await prisma.notificationLog.create({
        data: {
          notificationId,
          status: 'DELIVERED',
          details: `Successfully sent over ${notification.channel}. ID: ${deliveryResult.messageId || deliveryResult.sid}`,
          durationMs,
        },
      });

      // Remove from queue
      await prisma.notificationQueue.delete({
        where: { id: queueItemId },
      });

      // Update analytics
      await updateAnalytics(notification.channel, true, false);

      io?.emit('notification-update', { id: notificationId, status: 'DELIVERED' });
    } else {
      throw new Error(deliveryResult.error || 'Delivery failed');
    }
  } catch (err: any) {
    const durationMs = Date.now() - start;
    const isPreferenceCancel = err.message.includes('cancelled');
    const newAttempts = queueItem.attempts + 1;

    console.error(`Error processing notification ${notificationId}:`, err.message);

    await prisma.notificationLog.create({
      data: {
        notificationId,
        status: isPreferenceCancel ? 'CANCELLED' : 'FAILED',
        error: err.message,
        durationMs,
      },
    });

    if (isPreferenceCancel || newAttempts >= queueItem.maxAttempts) {
      // Max attempts reached or preference cancelled, move to dead letter / status failed
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: isPreferenceCancel ? 'CANCELLED' : 'FAILED' },
      });

      await prisma.deliveryStatus.create({
        data: {
          notificationId,
          status: isPreferenceCancel ? 'CANCELLED' : 'FAILED',
          metadata: JSON.stringify({ error: err.message }),
        },
      });

      await prisma.notificationQueue.delete({
        where: { id: queueItemId },
      });

      await updateAnalytics(notification.channel, false, true);

      io?.emit('notification-update', { id: notificationId, status: isPreferenceCancel ? 'CANCELLED' : 'FAILED' });
    } else {
      // Retry: visibleAfter delay (exponential backoff)
      const nextVisible = new Date(Date.now() + Math.pow(2, newAttempts) * 1000);
      await prisma.notificationQueue.update({
        where: { id: queueItemId },
        data: {
          attempts: newAttempts,
          visibleAfter: nextVisible,
          lockedAt: null,
          error: err.message,
        },
      });

      await prisma.deliveryStatus.create({
        data: {
          notificationId,
          status: 'RETRIED',
          metadata: JSON.stringify({ attempt: newAttempts, error: err.message }),
        },
      });

      io?.emit('notification-update', { id: notificationId, status: 'PENDING', attempts: newAttempts });
    }
  }
}

async function updateAnalytics(channel: string, success: boolean, failed: boolean) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const channelEnum = channel as any;

    await prisma.notificationAnalytics.upsert({
      where: {
        date_channel: {
          date: today,
          channel: channelEnum,
        },
      },
      create: {
        date: today,
        channel: channelEnum,
        sentCount: 1,
        deliveredCount: success ? 1 : 0,
        failedCount: failed ? 1 : 0,
      },
      update: {
        sentCount: { increment: 1 },
        deliveredCount: success ? { increment: 1 } : undefined,
        failedCount: failed ? { increment: 1 } : undefined,
      },
    });

    // Broadcast live dashboard stats update
    io?.emit('analytics-refresh');
  } catch (err) {
    console.error('Failed to update analytics:', err);
  }
}
