/**
 * AWS SNS HTTP API Client for Cloudflare Workers
 * @class SNSClient
 */
class SNSClient {
  /**
   * Create a new SNS client instance
   * @param {Object} options - Configuration options
   * @param {string} options.accessKeyId - AWS access key ID
   * @param {string} options.secretAccessKey - AWS secret access key
   * @param {string} [options.region='us-east-1'] - AWS region
   */
  constructor(options = {}) {
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.region = options.region || 'us-east-1';
    this.endpoint = `https://sns.${this.region}.amazonaws.com`;
  }

  // Convert string to Uint8Array
  stringToUint8Array(str) {
    return new TextEncoder().encode(str);
  }

  // Convert Uint8Array to hex string
  arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // AWS Signature Version 4 signing using Web Crypto API
  async sign(method, url, headers, payload) {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substr(0, 8);

    // Create canonical request
    const canonicalUri = '/';
    const canonicalQuerystring = url.split('?')[1] || '';
    
    // Add required headers
    headers['host'] = `sns.${this.region}.amazonaws.com`;
    headers['x-amz-date'] = amzDate;
    
    // Calculate payload hash
    const payloadHash = await crypto.subtle.digest('SHA-256', this.stringToUint8Array(payload))
      .then(buffer => this.arrayBufferToHex(buffer));
    headers['x-amz-content-sha256'] = payloadHash;

    // Create canonical headers
    const sortedHeaders = Object.keys(headers).sort().map(key => 
      `${key.toLowerCase()}:${headers[key]}`
    ).join('\n');
    
    const signedHeaders = Object.keys(headers).sort().map(key => 
      key.toLowerCase()
    ).join(';');

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      sortedHeaders,
      '',
      signedHeaders,
      payloadHash
    ].join('\n');

    // Create string to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${this.region}/sns/aws4_request`;
    
    const canonicalRequestHash = await crypto.subtle.digest('SHA-256', this.stringToUint8Array(canonicalRequest))
      .then(buffer => this.arrayBufferToHex(buffer));
    
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash
    ].join('\n');

    // Calculate signature using Web Crypto API
    const kDate = await crypto.subtle.importKey(
      'raw',
      this.stringToUint8Array(`AWS4${this.secretAccessKey}`),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => crypto.subtle.sign('HMAC', key, this.stringToUint8Array(dateStamp)));

    const kRegion = await crypto.subtle.importKey(
      'raw',
      kDate,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => crypto.subtle.sign('HMAC', key, this.stringToUint8Array(this.region)));

    const kService = await crypto.subtle.importKey(
      'raw',
      kRegion,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => crypto.subtle.sign('HMAC', key, this.stringToUint8Array('sns')));

    const kSigning = await crypto.subtle.importKey(
      'raw',
      kService,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => crypto.subtle.sign('HMAC', key, this.stringToUint8Array('aws4_request')));

    const signature = await crypto.subtle.importKey(
      'raw',
      kSigning,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ).then(key => crypto.subtle.sign('HMAC', key, this.stringToUint8Array(stringToSign)))
    .then(buffer => this.arrayBufferToHex(buffer));

    // Create authorization header
    headers['authorization'] = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
  }

  // Make HTTP request to SNS
  async makeRequest(action, params = {}) {
    const queryParams = new URLSearchParams({
      Action: action,
      Version: '2010-03-31',
      ...params
    });

    const url = `${this.endpoint}/?${queryParams.toString()}`;
    const payload = '';
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
    };

    // Sign the request
    const signedHeaders = await this.sign('GET', url, headers, payload);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: signedHeaders
      });

      const text = await response.text();
      
      if (!response.ok) {
        throw new Error(`SNS API Error: ${response.status} - ${text}`);
      }

      return this.parseXMLResponse(text);
    } catch (error) {
      throw new Error(`SNS Request failed: ${error.message}`);
    }
  }

  // Parse XML response (simplified for Cloudflare Workers)
  parseXMLResponse(xmlText) {
    // Simple XML parsing for common SNS responses
    // Note: DOMParser is not available in Cloudflare Workers, so we'll use regex parsing
    // This is a simplified parser for SNS responses
    
    // Handle common SNS responses using regex parsing
    const messageIdMatch = xmlText.match(/<MessageId>([^<]+)<\/MessageId>/);
    const topicArnMatch = xmlText.match(/<TopicArn>([^<]+)<\/TopicArn>/);
    const subscriptionArnMatch = xmlText.match(/<SubscriptionArn>([^<]+)<\/SubscriptionArn>/);
    
    if (messageIdMatch) {
      return { MessageId: messageIdMatch[1] };
    }
    
    if (topicArnMatch) {
      return { TopicArn: topicArnMatch[1] };
    }
    
    if (subscriptionArnMatch) {
      return { SubscriptionArn: subscriptionArnMatch[1] };
    }
    
    // Fallback: return raw text for unknown responses
    return { raw: xmlText };
  }
}

// Global SNS client instance
let defaultClient = null;

// Create SNS client
export function createClient(options = {}) {
  defaultClient = new SNSClient(options);
  return defaultClient;
}

// Send SMS function
export function sendSMS(textmessage, phone, senderid, SMSType, callback, client = null) {
  const snsClient = client || defaultClient;
  
  if (!snsClient) {
    return callback({ err: new Error('SNS client not initialized. Call createClient() first.') });
  }

  const params = {
    Message: textmessage,
    PhoneNumber: phone,
    'MessageAttributes.entry.1.Name': 'AWS.SNS.SMS.SenderID',
    'MessageAttributes.entry.1.Value.DataType': 'String',
    'MessageAttributes.entry.1.Value.StringValue': senderid,
    'MessageAttributes.entry.2.Name': 'AWS.SNS.SMS.SMSType',
    'MessageAttributes.entry.2.Value.DataType': 'String',
    'MessageAttributes.entry.2.Value.StringValue': SMSType
  };

  snsClient.makeRequest('Publish', params)
    .then(response => {
      callback(undefined, response.MessageId);
    })
    .catch(error => {
      callback({ err: error, 'err.stack': error.stack });
    });
}

// Export for compatibility
export default {
  createClient,
  sendSMS
}; 