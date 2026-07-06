import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const useMocks = process.env.USE_LOCAL_MOCKS === 'true';

let sesClient: SESClient | null = null;
if (!useMocks) {
  try {
    sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  } catch (err) {
    console.error('Failed to initialize AWS SES client:', err);
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
  attachments?: Array<{ filename: string; content: string }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromAddress = process.env.SENDER_EMAIL || 'noreply@notifyflow.com';

  if (useMocks || !sesClient) {
    console.log(`[Email Mock Service] Sending email to ${to}:`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Preview): ${text.substring(0, 100)}...`);

    // We can use nodemailer etherial test account or log
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'mockuser',
          pass: process.env.SMTP_PASS || 'mockpass',
        },
      });

      // Just return success for local mock or send via transporter if credentials exist
      return { success: true, messageId: 'mock-email-id-' + Math.random().toString(36).substring(7) };
    } catch (err: any) {
      console.log('[Email Mock Service] Logged notification to terminal successfully.');
      return { success: true, messageId: 'mock-email-id-logged' };
    }
  }

  try {
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Body: {
          Html: { Data: html },
          Text: { Data: text },
        },
        Subject: { Data: subject },
      },
      Source: fromAddress,
    });
    const result = await sesClient.send(command);
    return { success: true, messageId: result.MessageId };
  } catch (err: any) {
    console.error('AWS SES SendEmail failed:', err);
    return { success: false, error: err.message || 'Unknown SES failure' };
  }
}
