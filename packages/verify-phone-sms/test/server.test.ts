/**
 * Test file for the SMS Verification API server
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';
import app from '../src/verify-phone-server.js';

describe('SMS Verification API Server', () => {
  let server;

  beforeAll(() => {
    server = new Hono();
    server.route('/', app);
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe('Health Check Endpoints', () => {
    it('should return API info on root endpoint', async () => {
      const res = await server.request('/');
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('SMS Verification API');
      expect(data.endpoints).toBeDefined();
    });

    it('should return health status', async () => {
      const res = await server.request('/health');
      const data = await res.json();
      
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('API Authentication', () => {
    it('should require API key for protected endpoints', async () => {
      const res = await server.request('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: '+1234567890'
        })
      });
      
      expect(res.status).toBe(401);
    });

    it('should accept valid API key', async () => {
      const res = await server.request('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'sms_1234567890abcdef1234567890abcdef'
        },
        body: JSON.stringify({
          phoneNumber: '+1234567890'
        })
      });
      
      // Should not be 401 (unauthorized) - might be 500 due to missing AWS credentials
      expect(res.status).not.toBe(401);
    });
  });

  describe('Documentation', () => {
    it('should serve OpenAPI documentation', async () => {
      const res = await server.request('/docs');
      expect(res.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const res = await server.request('/nonexistent');
      const data = await res.json();
      
      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not found');
    });
  });
});

// Example usage functions
export async function sendVerificationCode(phoneNumber, apiKey) {
  const response = await fetch('http://localhost:8787/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      phoneNumber,
      blockVoip: true,
      senderId: 'MyApp'
    })
  });
  
  return response.json();
}

export async function verifyCode(phoneNumber, code, apiKey) {
  const response = await fetch('http://localhost:8787/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      phoneNumber,
      code
    })
  });
  
  return response.json();
}

export async function sendGeneralSMS(phoneNumber, message, apiKey) {
  const response = await fetch('http://localhost:8787/api/sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      phoneNumber,
      message,
      senderId: 'MyApp'
    })
  });
  
  return response.json();
} 