// Test setup file
import { beforeAll, afterAll } from 'vitest';

// Set up global environment variables for testing
globalThis.env = {
  API_KEY: 'test-api-key',
  AWS_ACCESS_KEY_ID: 'test-access-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  AWS_REGION: 'us-east-1',
  SMS_SENDER_ID: 'TestVerify',
};

console.log('Test setup - globalThis.env set to:', globalThis.env);

// Global test setup
beforeAll(() => {
  // Ensure environment is set
  if (!globalThis.env) {
    globalThis.env = {
      API_KEY: 'test-api-key',
      AWS_ACCESS_KEY_ID: 'test-access-key',
      AWS_SECRET_ACCESS_KEY: 'test-secret-key',
      AWS_REGION: 'us-east-1',
      SMS_SENDER_ID: 'TestVerify',
    };
  }
  console.log('beforeAll - globalThis.env:', globalThis.env);
});

afterAll(() => {
  // Any global cleanup needed
}); 