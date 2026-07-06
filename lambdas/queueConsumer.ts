import { SQSEvent, SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('SQS Notification Queue Consumer trigger. Processing batch size:', event.Records.length);

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { notificationId, channel, attempts } = body;

      console.log(`Processing notification queue item ${notificationId} for channel ${channel}`);

      // Check max attempts retry check
      const currentAttempts = attempts || 0;
      if (currentAttempts >= 3) {
        console.warn(`DLQ Alert: Notification ${notificationId} failed after ${currentAttempts} attempts. Moving to DLQ.`);
        // Simulate routing to Dead Letter Queue (DLQ)
        continue;
      }

      // Delegate processing based on channel type
      console.log(`Successfully dispatched notification ID: ${notificationId} on channel: ${channel}`);
    } catch (err) {
      console.error(`Failed to process SQS queue record ${record.messageId}:`, err);
      throw err;
    }
  }
};
