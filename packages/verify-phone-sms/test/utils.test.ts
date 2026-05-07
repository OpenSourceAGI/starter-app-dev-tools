import { describe, it, expect } from 'vitest';

// Import utility functions from the main file
// We'll need to extract these functions or test them indirectly
// For now, let's test the phone number validation logic

describe('Utility Functions', () => {
  describe('Phone Number Validation', () => {
    const isValidPhoneNumber = (phone) => {
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      return phoneRegex.test(phone) && phone.length >= 7 && phone.length <= 16;
    };

    const formatPhoneNumber = (phone) => {
      // Remove all non-digit characters
      const cleaned = phone.replace(/\D/g, '');
      
      // Add country code if not present (assuming US)
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
      
      // Return as is if it already looks like E.164
      return phone.startsWith('+') ? phone : `+${cleaned}`;
    };

    describe('isValidPhoneNumber', () => {
      it('should validate correct E.164 phone numbers', () => {
        const validNumbers = [
          '+1234567890',
          '+11234567890',
          '+44123456789',
          '+61412345678',
          '+123456789012345'
        ];

        validNumbers.forEach(number => {
          expect(isValidPhoneNumber(number)).toBe(true);
        });
      });

      it('should reject invalid phone numbers', () => {
        const invalidNumbers = [
          '1234567890', // Missing +
          '+', // Just plus sign
          '+123', // Too short
          '+12345678901234567890', // Too long
          '+01234567890', // Starts with 0
          'not-a-number',
          '+abc123def'
        ];

        invalidNumbers.forEach(number => {
          expect(isValidPhoneNumber(number)).toBe(false);
        });
      });
    });

    describe('formatPhoneNumber', () => {
      it('should format 10-digit US numbers correctly', () => {
        const testCases = [
          { input: '1234567890', expected: '+11234567890' },
          { input: '(123) 456-7890', expected: '+11234567890' },
          { input: '123-456-7890', expected: '+11234567890' },
          { input: '123.456.7890', expected: '+11234567890' },
          { input: '123 456 7890', expected: '+11234567890' }
        ];

        testCases.forEach(({ input, expected }) => {
          expect(formatPhoneNumber(input)).toBe(expected);
        });
      });

      it('should format 11-digit US numbers correctly', () => {
        const testCases = [
          { input: '11234567890', expected: '+11234567890' },
          { input: '1-123-456-7890', expected: '+11234567890' },
          { input: '1 (123) 456-7890', expected: '+11234567890' }
        ];

        testCases.forEach(({ input, expected }) => {
          expect(formatPhoneNumber(input)).toBe(expected);
        });
      });

      it('should preserve already formatted E.164 numbers', () => {
        const testCases = [
          '+11234567890', // Already formatted correctly
          '+44123456789',
          '+61412345678'
        ];

        testCases.forEach(number => {
          expect(formatPhoneNumber(number)).toBe(number);
        });
      });

      it('should handle edge cases', () => {
        const testCases = [
          { input: '', expected: '+' },
          { input: 'abc', expected: '+' },
          { input: '123abc456', expected: '+123456' }
        ];

        testCases.forEach(({ input, expected }) => {
          expect(formatPhoneNumber(input)).toBe(expected);
        });
      });
    });

    describe('Combined Validation and Formatting', () => {
      it('should format and validate phone numbers correctly', () => {
        const testCases = [
          { input: '1234567890', formatted: '+11234567890', valid: true },
          { input: '(123) 456-7890', formatted: '+11234567890', valid: true },
          { input: '123-456-7890', formatted: '+11234567890', valid: true },
          { input: '+11234567890', formatted: '+11234567890', valid: true },
          { input: 'not-a-number', formatted: '+', valid: false },
          { input: '123', formatted: '+123', valid: false },
          { input: '12345678901234567890', formatted: '+12345678901234567890', valid: false }
        ];

        testCases.forEach(({ input, formatted, valid }) => {
          const formattedResult = formatPhoneNumber(input);
          expect(formattedResult).toBe(formatted);
          expect(isValidPhoneNumber(formattedResult)).toBe(valid);
        });
      });
    });
  });

  describe('Verification Code Generation', () => {
    const generateVerificationCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    it('should generate 6-character alphanumeric codes', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
        expect(code.length).toBe(6);
      }
    });

    it('should generate codes with only uppercase letters and digits', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateVerificationCode();
        expect(code).toMatch(/^[A-Z0-9]+$/);
        expect(code).not.toMatch(/[a-z]/); // No lowercase letters
      }
    });

    it('should generate different codes on multiple calls', () => {
      const codes = new Set();
      for (let i = 0; i < 100; i++) {
        codes.add(generateVerificationCode());
      }
      // With 100 calls, we should have at least 90 unique codes
      // (allowing for some randomness overlap)
      expect(codes.size).toBeGreaterThan(90);
    });
  });

  describe('UUID Generation', () => {
    it('should generate valid UUIDs', () => {
      const uuid = crypto.randomUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(crypto.randomUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });
}); 