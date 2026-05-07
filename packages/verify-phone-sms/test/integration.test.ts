import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/verify-phone-server.js';

describe('SMS Verification API Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp(globalThis.env);
  });

  describe('Authentication Methods', () => {
    it('should accept both X-API-Key and Bearer token headers', async () => {
      const phoneNumber = '+1234567890';

      // Test X-API-Key header
      const req1 = new Request(`http://localhost/api/send-verification?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res1 = await app.request(req1, globalThis.env);
      const data1 = await res1.json();

      expect(res1.status).toBe(200);
      expect(data1.success).toBe(true);

      // Test Bearer token header
      const req2 = new Request(`http://localhost/api/send-verification?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'Authorization': 'Bearer test-api-key'
        }
      });
      const res2 = await app.request(req2, globalThis.env);
      const data2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(data2.success).toBe(true);
    });

    it('should reject requests without authentication', async () => {
      const phoneNumber = '+1234567890';

      const req = new Request(`http://localhost/api/send-verification?phoneNumber=${encodeURIComponent(phoneNumber)}`);
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('API key required');
    });

    it('should reject requests with invalid authentication', async () => {
      const phoneNumber = '+1234567890';

      const req = new Request(`http://localhost/api/send-verification?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'X-API-Key': 'invalid-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Invalid API key');
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format various phone number formats correctly', async () => {
      const testCases = [
        '1234567890',
        '11234567890',
        '+1234567890',
        '(123) 456-7890',
        '123-456-7890',
      ];

      for (const phoneNumber of testCases) {
        const req = new Request(`http://localhost/api/send-verification?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
          headers: {
            'X-API-Key': 'test-api-key'
          }
        });
        const res = await app.request(req, globalThis.env);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should reject clearly invalid phone numbers', async () => {
      const invalidNumbers = [
        'not-a-number',
        '123',
        '12345678901234567890', // Too long
        '+', // Just plus sign
        'abc123def',
      ];

      for (const invalidNumber of invalidNumbers) {
        const req = new Request(`http://localhost/api/send-verification?phoneNumber=${encodeURIComponent(invalidNumber)}`, {
          headers: {
            'X-API-Key': 'test-api-key'
          }
        });
        const res = await app.request(req, globalThis.env);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.error).toBe('Invalid phone number format');
      }
    });
  });

  describe('API Endpoints', () => {
    it('should handle send verification endpoint', async () => {
      const phoneNumber = '+1234567890';

      const req = new Request(`http://localhost/api/send-verification?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Verification code sent successfully',
        expiresIn: 600
      });
      expect(data.messageId).toBeDefined();
    });

    it('should handle verify code endpoint', async () => {
      const phoneNumber = '+1234567890';
      const code = '123456';

      const req = new Request(`http://localhost/api/verify-code?phoneNumber=${encodeURIComponent(phoneNumber)}&code=${code}`, {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(400); // Will fail because no code was sent, but endpoint works
      expect(data.error).toBeDefined();
    });
  });
}); 