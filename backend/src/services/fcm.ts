import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const useMocks = process.env.USE_LOCAL_MOCKS === 'true';

let fcmAvailable = false;
if (!useMocks) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      fcmAvailable = true;
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
  }
}

export async function sendPush(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (useMocks || !fcmAvailable) {
    console.log(`[Push Mock Service] Sending Push notification to token: ${token}`);
    console.log(`Title: ${title} | Body: ${body}`);
    return { success: true, messageId: 'mock-push-id-' + Math.random().toString(36).substring(7) };
  }

  try {
    const response = await admin.messaging().send({
      token,
      notification: {
        title,
        body,
      },
      data,
    });
    return { success: true, messageId: response };
  } catch (err: any) {
    console.error('Firebase FCM Push failed:', err);
    return { success: false, error: err.message || 'Unknown FCM failure' };
  }
}

export async function sendPushTopic(
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (useMocks || !fcmAvailable) {
    console.log(`[Push Mock Service] Sending Topic Push notification to: ${topic}`);
    console.log(`Title: ${title} | Body: ${body}`);
    return { success: true, messageId: 'mock-push-topic-id-' + Math.random().toString(36).substring(7) };
  }

  try {
    const response = await admin.messaging().send({
      topic,
      notification: {
        title,
        body,
      },
      data,
    });
    return { success: true, messageId: response };
  } catch (err: any) {
    console.error('Firebase FCM Topic Push failed:', err);
    return { success: false, error: err.message || 'Unknown FCM Topic failure' };
  }
}
