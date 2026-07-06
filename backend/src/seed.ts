import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database...');

  // Delete existing records to ensure idempotency
  await prisma.notificationQueue.deleteMany({});
  await prisma.notificationLog.deleteMany({});
  await prisma.deliveryStatus.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.eventTrigger.deleteMany({});
  await prisma.notificationTemplate.deleteMany({});
  await prisma.userPreferences.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.notificationAnalytics.deleteMany({});

  // Hash passwords
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const userPasswordHash = await bcrypt.hash('user123', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@notifyflow.com',
      name: 'System Admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      preferences: {
        create: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          marketingEnabled: true,
          securityAlertsEnabled: true,
        },
      },
    },
  });

  const normalUser = await prisma.user.create({
    data: {
      email: 'user@notifyflow.com',
      name: 'Alex Johnson',
      passwordHash: userPasswordHash,
      role: 'USER',
      preferences: {
        create: {
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          marketingEnabled: false,
          securityAlertsEnabled: true,
        },
      },
    },
  });

  console.log('Users created: Admin & Regular User');

  // 2. Create Templates
  const welcomeTemplate = await prisma.notificationTemplate.create({
    data: {
      name: 'Welcome Template',
      subject: 'Welcome to NotifyFlow, {{name}}!',
      body: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #6366f1;">Welcome Aboard!</h2>
          <p>Hi {{name}},</p>
          <p>Thank you for registering at <strong>NotifyFlow</strong> on {{date}}.</p>
          <p>We are a state-of-the-art serverless notification composer. Get ready to supercharge your delivery pipeline!</p>
          <a href="#" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Go to Dashboard</a>
        </div>
      `,
      channel: 'EMAIL',
      category: 'USER_REGISTERED',
      variables: ['name', 'date'],
    },
  });

  const invoiceTemplate = await prisma.notificationTemplate.create({
    data: {
      name: 'Invoice Template',
      subject: 'Receipt for Order #{{orderId}}',
      body: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #10b981;">Payment Received</h2>
          <p>Hi {{name}},</p>
          <p>This is a confirmation of payment for Order <strong>#{{orderId}}</strong> on {{date}}.</p>
          <hr style="border: 0; border-top: 1px solid #eee;" />
          <p><strong>Total Paid:</strong> $49.00 USD</p>
        </div>
      `,
      channel: 'EMAIL',
      category: 'PAYMENT_SUCCESSFUL',
      variables: ['name', 'orderId', 'date'],
    },
  });

  const otpTemplate = await prisma.notificationTemplate.create({
    data: {
      name: 'OTP Verification Template',
      body: 'Your NotifyFlow security OTP code is {{otp}}. This code will expire in 5 minutes.',
      channel: 'SMS',
      category: 'SECURITY_ALERT',
      variables: ['otp'],
    },
  });

  const pushCampaignTemplate = await prisma.notificationTemplate.create({
    data: {
      name: 'Push Campaign Template',
      body: 'Check out our new real-time analytics feature updates! Click to see details.',
      channel: 'PUSH',
      category: 'PROMOTION_CAMPAIGN',
      variables: [],
    },
  });

  console.log('Templates seeded');

  // 3. Create Event Triggers
  await prisma.eventTrigger.createMany({
    data: [
      { name: 'User Registered Event', description: 'Triggered when new user registers', templateId: welcomeTemplate.id },
      { name: 'Order Invoice Event', description: 'Triggered upon successful checkout', templateId: invoiceTemplate.id },
      { name: 'MFA Request Event', description: 'Triggered when user logs in with MFA', templateId: otpTemplate.id },
    ],
  });

  // 4. Create Historical Notifications (For Analytics UI display)
  const now = new Date();
  const pastDays = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const notificationsData = [
    { title: 'Welcome Email', channel: 'EMAIL', status: 'DELIVERED', userId: normalUser.id, templateId: welcomeTemplate.id, days: 5 },
    { title: 'Security Alert', channel: 'SMS', status: 'DELIVERED', userId: normalUser.id, templateId: otpTemplate.id, days: 4 },
    { title: 'Welcome Email', channel: 'EMAIL', status: 'DELIVERED', userId: admin.id, templateId: welcomeTemplate.id, days: 3 },
    { title: 'MFA login code', channel: 'SMS', status: 'DELIVERED', userId: admin.id, templateId: otpTemplate.id, days: 2 },
    { title: 'Invoice Receipt', channel: 'EMAIL', status: 'DELIVERED', userId: normalUser.id, templateId: invoiceTemplate.id, days: 1 },
    { title: 'Campaign Alert', channel: 'PUSH', status: 'DELIVERED', userId: normalUser.id, templateId: pushCampaignTemplate.id, days: 0 },
    { title: 'Failed SMS delivery', channel: 'SMS', status: 'FAILED', userId: normalUser.id, templateId: otpTemplate.id, days: 1 },
  ];

  for (const n of notificationsData) {
    const notif = await prisma.notification.create({
      data: {
        title: n.title,
        message: 'Lorem ipsum notification test message body.',
        channel: n.channel as any,
        status: n.status as any,
        userId: n.userId,
        templateId: n.templateId,
        createdAt: pastDays(n.days),
        updatedAt: pastDays(n.days),
      },
    });

    await prisma.deliveryStatus.create({
      data: {
        notificationId: notif.id,
        status: n.status as any,
        timestamp: pastDays(n.days),
      },
    });

    await prisma.notificationLog.create({
      data: {
        notificationId: notif.id,
        status: n.status as any,
        details: n.status === 'DELIVERED' ? 'Delivered successfully through provider gateway.' : 'Provider returned: Gateway timeout.',
        durationMs: Math.floor(Math.random() * 500) + 100,
        createdAt: pastDays(n.days),
      },
    });
  }

  // 5. Seed Analytics Summary
  for (let i = 0; i < 7; i++) {
    const date = pastDays(i);
    date.setHours(0, 0, 0, 0);

    const channels = ['EMAIL', 'SMS', 'PUSH'];
    for (const ch of channels) {
      await prisma.notificationAnalytics.create({
        data: {
          date,
          channel: ch as any,
          sentCount: Math.floor(Math.random() * 15) + 5,
          deliveredCount: Math.floor(Math.random() * 12) + 3,
          failedCount: Math.floor(Math.random() * 3),
          openCount: ch === 'EMAIL' ? Math.floor(Math.random() * 8) : 0,
          clickCount: ch === 'EMAIL' ? Math.floor(Math.random() * 4) : 0,
        },
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
