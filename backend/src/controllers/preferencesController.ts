import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import prisma from '../config/db';

export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await prisma.userPreferences.create({
        data: {
          userId: userId!,
          emailEnabled: true,
          smsEnabled: true,
          pushEnabled: true,
          marketingEnabled: true,
          securityAlertsEnabled: true,
          digestEnabled: false,
        },
      });
    }

    res.json(preferences);
  } catch (err) {
    console.error('Failed to get preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updatePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const { emailEnabled, smsEnabled, pushEnabled, marketingEnabled, securityAlertsEnabled, digestEnabled } = req.body;

    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      update: {
        emailEnabled,
        smsEnabled,
        pushEnabled,
        marketingEnabled,
        securityAlertsEnabled,
        digestEnabled,
      },
      create: {
        userId: userId!,
        emailEnabled: emailEnabled !== undefined ? emailEnabled : true,
        smsEnabled: smsEnabled !== undefined ? smsEnabled : true,
        pushEnabled: pushEnabled !== undefined ? pushEnabled : true,
        marketingEnabled: marketingEnabled !== undefined ? marketingEnabled : true,
        securityAlertsEnabled: securityAlertsEnabled !== undefined ? securityAlertsEnabled : true,
        digestEnabled: digestEnabled !== undefined ? digestEnabled : false,
      },
    });

    res.json(preferences);
  } catch (err) {
    console.error('Failed to update preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
