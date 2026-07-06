import { SQSEvent, SQSHandler } from 'aws-lambda';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Processing Push Notifications SQS batch event:', JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { token, topic, title, message, data } = body;

      if (!title || !message) {
        console.error('Missing push subject or body in record:', record.messageId);
        continue;
      }

      if (token) {
        console.log(`Sending Web Push via FCM to device token: ${token}`);
        const response = await admin.messaging().send({
          token,
          notification: { title, body: message },
          data: data || {},
        });
        console.log(`FCM token push success: ${response}`);
      } else if (topic) {
        console.log(`Sending Web Push via FCM to topic: ${topic}`);
        const response = await admin.messaging().send({
          topic,
          notification: { title, body: message },
          data: data || {},
        });
        console.log(`FCM topic push success: ${response}`);
      } else {
        console.error('Neither token nor topic provided for push record:', record.messageId);
      }
    } catch (err) {
      console.error('Failed to process SQS record for Push dispatch:', err);
      throw err;
    }
  }
};
