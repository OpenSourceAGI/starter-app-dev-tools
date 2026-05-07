import grab from 'grab-api.js'
/**
 * Example client for the SMS Verification API
 */

const API_BASE_URL = 'http://localhost:8787'; // Change to your deployed URL
const API_KEY = 'sms_1234567890abcdef1234567890abcdef'; // Change to your API key

class SMSVerificationClient {
  constructor(baseUrl = API_BASE_URL, apiKey = API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async sendVerificationCode(phoneNumber, options = {}) {
    await grab(`${this.baseUrl}/api/send`, {
      headers: {
        'X-API-Key': this.apiKey
      },
      phoneNumber,
      ...options
    });
  }

  async verifyCode(phoneNumber, code) {
    const response = await fetch(`${this.baseUrl}/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({
        phoneNumber,
        code
      })
    });

    return response.json();
  }

  async sendGeneralSMS(phoneNumber, message, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({
        phoneNumber,
        message,
        ...options
      })
    });

    return response.json();
  }

  async checkHealth() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Example usage
async function example() {
  const client = new SMSVerificationClient();

  try {
    // Check server health
    console.log('Checking server health...');
    const health = await client.checkHealth();
    console.log('Health:', health);

    // Send verification code
    console.log('\nSending verification code...');
    const sendResult = await client.sendVerificationCode('+1234567890', {
      blockVoip: true,
      senderId: 'MyApp',
      messageTemplate: 'Your verification code is: {code}. Valid for 10 minutes.'
    });
    console.log('Send result:', sendResult);

    if (sendResult.success) {
      // Verify the code (in real app, user would enter this)
      console.log('\nVerifying code...');
      const verifyResult = await client.verifyCode('+1234567890', sendResult.code);
      console.log('Verify result:', verifyResult);
    }

    // Send general SMS
    console.log('\nSending general SMS...');
    const smsResult = await client.sendGeneralSMS(
      '+1234567890',
      'Hello from your app! This is a test message.',
      { senderId: 'MyApp' }
    );
    console.log('SMS result:', smsResult);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SMSVerificationClient;
  
  // Run example if this file is executed directly
  if (require.main === module) {
    example();
  }
}

// Browser usage
if (typeof window !== 'undefined') {
  window.SMSVerificationClient = SMSVerificationClient;
}

export default SMSVerificationClient; 