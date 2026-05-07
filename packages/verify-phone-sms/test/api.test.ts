import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/verify-phone-server.js';

describe('SMS Verification API', () => {
  let app;

  beforeEach(() => {
    // Create a fresh app instance for each test
    app = createApp(globalThis.env);
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const req = new Request('http://localhost/health');
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        status: 'ok'
      });
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Send Verification Code', () => {
    it('should require API key authentication', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=%2B1234567890');
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toMatchObject({
        error: 'API key required'
      });
    });

    it('should reject invalid API key', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=%2B1234567890', {
        headers: {
          'X-API-Key': 'invalid-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toMatchObject({
        error: 'Invalid API key'
      });
    });

    it('should accept Bearer token authentication', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=%2B1234567890', {
        headers: {
          'Authorization': 'Bearer test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject invalid phone number format', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=invalid-phone', {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toMatchObject({
        error: 'Invalid phone number format'
      });
    });

    it('should format phone number correctly', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=1234567890', {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept blockVoip parameter', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=%2B1234567890&blockVoip=true', {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle blockVoip=false parameter', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=%2B1234567890&blockVoip=false', {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Verify Code', () => {
    it('should require API key authentication', async () => {
      const req = new Request('http://localhost/api/verify-code?phoneNumber=%2B1234567890&code=123456');
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toMatchObject({
        error: 'API key required'
      });
    });

    it('should reject invalid API key', async () => {
      const req = new Request('http://localhost/api/verify-code?phoneNumber=%2B1234567890&code=123456', {
        headers: {
          'X-API-Key': 'invalid-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data).toMatchObject({
        error: 'Invalid API key'
      });
    });

    it('should reject invalid phone number format', async () => {
      const req = new Request('http://localhost/api/verify-code?phoneNumber=invalid-phone&code=123456', {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data).toMatchObject({
        error: 'Invalid phone number format'
      });
    });

    it('should accept Bearer token authentication', async () => {
      const req = new Request('http://localhost/api/verify-code?phoneNumber=%2B1234567890&code=123456', {
        headers: {
          'Authorization': 'Bearer test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(400); // Will fail because no code was sent, but auth works
      expect(data.error).toBeDefined();
    });
  });

  describe('Documentation Endpoints', () => {
    it('should serve OpenAPI documentation', async () => {
      const req = new Request('http://localhost/openapi.json');
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        openapi: '3.0.0',
        info: {
          title: 'SMS API',
          version: '1.0.0'
        }
      });
    });

    it('should serve Swagger UI', async () => {
      const req = new Request('http://localhost/');
      const res = await app.request(req, globalThis.env);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });
  });
}); 