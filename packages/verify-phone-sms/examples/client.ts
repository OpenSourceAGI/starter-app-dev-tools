/**
 * Example client for the SMS Verification API
 */

const API_BASE_URL = 'http://localhost:8787';
const API_KEY = 'sms_1234567890abcdef1234567890abcdef';

interface SendOptions {
  blockVoip?: boolean;
  senderId?: string;
  messageTemplate?: string;
}

interface SmsOptions {
  senderId?: string;
  smsType?: 'Transactional' | 'Promotional';
}

class SMSVerificationClient {
  baseUrl: string;
  apiKey: string;

  constructor(baseUrl: string = API_BASE_URL, apiKey: string = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async sendVerificationCode(phoneNumber: string, options: SendOptions = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ phoneNumber, ...options }),
    });
    return response.json();
  }

  async verifyCode(phoneNumber: string, code: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ phoneNumber, code }),
    });
    return response.json();
  }

  async sendGeneralSMS(phoneNumber: string, message: string, options: SmsOptions = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify({ phoneNumber, message, ...options }),
    });
    return response.json();
  }

  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

async function example() {
  const client = new SMSVerificationClient();

  try {
    console.log('Checking server health...');
    const health = await client.checkHealth();
    console.log('Health:', health);

    console.log('\nSending verification code...');
    const sendResult = await client.sendVerificationCode('+1234567890', {
      blockVoip: true,
      senderId: 'MyApp',
      messageTemplate: 'Your verification code is: {code}. Valid for 10 minutes.',
    });
    console.log('Send result:', sendResult);

    if (sendResult?.success) {
      console.log('\nVerifying code...');
      const verifyResult = await client.verifyCode('+1234567890', sendResult.code);
      console.log('Verify result:', verifyResult);
    }

    console.log('\nSending general SMS...');
    const smsResult = await client.sendGeneralSMS(
      '+1234567890',
      'Hello from your app! This is a test message.',
      { senderId: 'MyApp' },
    );
    console.log('SMS result:', smsResult);
  } catch (error) {
    console.error('Error:', error);
  }
}

export default SMSVerificationClient;
export { example };
