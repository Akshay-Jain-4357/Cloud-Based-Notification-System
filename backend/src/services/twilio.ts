import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const useMocks = process.env.USE_LOCAL_MOCKS === 'true';

let twilioClient: any = null;
if (!useMocks) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (accountSid && authToken) {
      twilioClient = twilio(accountSid, authToken);
    }
  } catch (err) {
    console.error('Failed to initialize Twilio client:', err);
  }
}

export async function sendSMS(
  to: string,
  message: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const from = process.env.TWILIO_PHONE_NUMBER || '+15005550006';

  if (useMocks || !twilioClient) {
    console.log(`[SMS Mock Service] Sending SMS to ${to}:`);
    console.log(`Message: ${message}`);
    return { success: true, sid: 'mock-sms-sid-' + Math.random().toString(36).substring(7) };
  }

  try {
    const response = await twilioClient.messages.create({
      body: message,
      from,
      to,
    });
    return { success: true, sid: response.sid };
  } catch (err: any) {
    console.error('Twilio SMS Send failed:', err);
    return { success: false, error: err.message || 'Unknown Twilio failure' };
  }
}
