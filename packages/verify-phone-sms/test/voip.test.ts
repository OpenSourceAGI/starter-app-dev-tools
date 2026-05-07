import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/verify-phone-server.js';

describe('VoIP Blocking Functionality', () => {
  let app;

  beforeEach(() => {
    app = createApp(globalThis.env);
  });

  describe('blockVoip parameter', () => {
    it('should allow requests when blockVoip is not specified', async () => {
      const req = new Request('http://localhost/api/send-verification?phoneNumber=%2B1234567890', {
        headers: {
          'X-API-Key': 'test-api-key'
        }
      });
      const res = await app.request(req, globalThis.env);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow requests when blockVoip is false', async () => {
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

    it('should accept blockVoip=true parameter', async () => {
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
  });

  describe('VoIP detection logic', () => {
    it('should correctly identify VoIP numbers', async () => {
      // Import the function from the module
      const module = await import('../src/verify-phone-server.js');
      const { isPhoneNumberVoip } = module;
      
      // Mock the grab function to return VoIP data
      const originalGrab = globalThis.grab;
      globalThis.grab = {
        instance: () => ({
          "phone-lookup": async () => ({
            carrier: {
              name: 'Bandwidth',
              type: 'voip'
            },
            portability: {
              line_type: 'landline'
            }
          })
        })
      };
      
      // Test VoIP number
      const isVoip = await isPhoneNumberVoip('+1234567890');
      expect(isVoip).toBe(true);
      
      // Mock the grab function to return mobile data
      globalThis.grab = {
        instance: () => ({
          "phone-lookup": async () => ({
            carrier: {
              name: 'Verizon Wireless',
              type: 'mobile'
            },
            portability: {
              line_type: 'mobile'
            }
          })
        })
      };
      
      // Test mobile number
      const isMobile = await isPhoneNumberVoip('+1234567890');
      expect(isMobile).toBe(false);
      
      // Mock the grab function to return null data
      globalThis.grab = {
        instance: () => ({
          "phone-lookup": async () => null
        })
      };
      
      // Test null data
      const isNull = await isPhoneNumberVoip('+1234567890');
      expect(isNull).toBe(false);
      
      // Restore original grab function
      globalThis.grab = originalGrab;
    });
  });
}); 