import { SQSEvent, SQSHandler } from 'aws-lambda';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export const handler: SQSHandler = async (event: SQSEvent) => {
  console.log('Processing SMS Notifications SQS batch event:', JSON.stringify(event));

  for (const record of event.Records) {
    try {
      const body = JSON.parse(record.body);
      const { to, message } = body;

      if (!to || !message) {
        console.error('Missing SMS fields in record:', record.messageId);
        continue;
      }

      console.log(`Sending SMS via Twilio to ${to}`);
      const response = await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER || '+15005550006',
        to,
      });

      console.log(`SMS sent successfully. SID: ${response.sid}`);
    } catch (err) {
      console.error('Failed to process SQS record for SMS dispatch:', err);
      throw err;
    }
  }
};
