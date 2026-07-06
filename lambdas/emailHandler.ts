import { SQSEvent, SQSHandler } from 'aws-lambda';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Processing Email Notifications SQS batch event:', JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { to, subject, html, text } = body;

      if (!to || !subject || !html) {
        console.error('Missing required email fields in record:', record.messageId);
        continue;
      }

      console.log(`Sending email via AWS SES to ${to}`);
      const command = new SendEmailCommand({
        Destination: { ToAddresses: [to] },
        Message: {
          Body: {
            Html: { Data: html },
            Text: { Data: text || '' },
          },
          Subject: { Data: subject },
        },
        Source: process.env.SENDER_EMAIL || 'noreply@notifyflow.com',
      });

      const response = await sesClient.send(command);
      console.log(`Email sent successfully. MessageId: ${response.MessageId}`);
    } catch (err) {
      console.error('Failed to process SQS record for email dispatch:', err);
      throw err; // Cause lambda invocation to retry if configured
    }
  }
};
