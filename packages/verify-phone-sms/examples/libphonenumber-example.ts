import verifyPhone from '../src/verify-phone.js';

// Example 1: Using libphonenumber-js for VoIP detection with full metadata
async function exampleWithLibPhoneNumberVoipDetection() {
    try {
        const result = await verifyPhone({
            phoneNumber: '+1-800-555-0123',
            code: '123456',
            blockVoip: true,
            voipDetectionMethod: 'libphonenumber', // Use local analysis instead of external API
            useLibPhoneNumber: true, // Also use libphonenumber-js for formatting/validation
            metadataType: 'full', // Use full metadata (140KB) for better phone type detection
            messageTemplate: 'Your verification code is: {code}. Valid for 10 minutes.'
        });
        
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 2: Using libphonenumber-js for phone number formatting and validation only
async function exampleWithLibPhoneNumberFormatting() {
    try {
        const result = await verifyPhone({
            phoneNumber: '555-123-4567', // US number without country code
            code: '789012',
            blockVoip: false, // Don't block VoIP numbers
            useLibPhoneNumber: true, // Use libphonenumber-js for formatting/validation
            senderId: 'MyApp',
            smsType: 'Transactional'
        });
        
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 3: Traditional approach (external API for VoIP detection)
async function exampleWithExternalApi() {
    try {
        const result = await verifyPhone({
            phoneNumber: '+44 20 7946 0958', // UK number
            code: 'ABCDEF',
            blockVoip: true,
            voipDetectionMethod: 'api', // Use external API (default)
            useLibPhoneNumber: false, // Use basic formatting/validation
            messageTemplate: 'Welcome! Your code: {code}'
        });
        
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 4: International number with libphonenumber-js
async function exampleInternationalNumber() {
    try {
        const result = await verifyPhone({
            phoneNumber: '49 30 12345678', // German number
            code: 'GHIJKL',
            blockVoip: true,
            voipDetectionMethod: 'libphonenumber',
            useLibPhoneNumber: true,
            awsRegion: 'eu-west-1'
        });
        
        console.log('Result:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example 5: Comparing minimal vs full metadata
async function exampleMetadataComparison() {
    try {
        console.log('=== Testing with minimal metadata (75KB) ===');
        const resultMinimal = await verifyPhone({
            phoneNumber: '+1-800-555-0123',
            code: 'MIN123',
            blockVoip: true,
            voipDetectionMethod: 'libphonenumber',
            useLibPhoneNumber: true,
            metadataType: 'minimal' // Uses pattern-based heuristics
        });
        console.log('Minimal metadata result:', resultMinimal);
        
        console.log('\n=== Testing with full metadata (140KB) ===');
        const resultFull = await verifyPhone({
            phoneNumber: '+1-800-555-0123',
            code: 'FULL456',
            blockVoip: true,
            voipDetectionMethod: 'libphonenumber',
            useLibPhoneNumber: true,
            metadataType: 'full' // Uses phone number type detection
        });
        console.log('Full metadata result:', resultFull);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Run examples
console.log('=== Example 1: VoIP Detection with libphonenumber-js ===');
await exampleWithLibPhoneNumberVoipDetection();

console.log('\n=== Example 2: Formatting with libphonenumber-js ===');
await exampleWithLibPhoneNumberFormatting();

console.log('\n=== Example 3: Traditional External API ===');
await exampleWithExternalApi();

console.log('\n=== Example 4: International Number ===');
await exampleInternationalNumber();

console.log('\n=== Example 5: Metadata Comparison ===');
await exampleMetadataComparison();
