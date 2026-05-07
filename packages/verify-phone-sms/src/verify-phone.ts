import { parsePhoneNumber, getNumberType } from 'libphonenumber-js';

interface VerifyPhoneOptions {
    /**
     * The phone number to send the SMS to (e.g., "+1234567890")
     */
    phoneNumber: string;
    /**
     * The verification code to send (required)
     */
    code: string;
    /**
     * AWS access key ID
     */
    accessKeyId?: string;
    /**
     * AWS secret access key
     */
    secretAccessKey?: string;
    /**
     * AWS region (default: 'us-east-1')
     */
    awsRegion?: string;
    /**
     * Whether to block VoIP numbers (default: false)
     */
    blockVoip?: boolean;
    /**
     * Method to use for VoIP detection: 'api' (external API) or 'libphonenumber' (default: 'api')
     */
    voipDetectionMethod?: 'api' | 'libphonenumber';
    /**
     * Whether to use libphonenumber-js for phone number formatting and validation (default: false)
     */
    useLibPhoneNumber?: boolean;
    /**
     * Metadata type to use with libphonenumber-js: 'minimal' (75KB) or 'full' (140KB, default: 'minimal')
     * Full metadata provides better phone number type detection (MOBILE, FIXED_LINE, VOIP, etc.)
     */
    metadataType?: 'minimal' | 'full';
    /**
     * SMS sender ID (max 11 characters, default: 'Verify')
     */
    senderId?: string;
    /**
     * SMS type ('Transactional' or 'Promotional', default: 'Transactional')
     */
    smsType?: 'Transactional' | 'Promotional';
    /**
     * Custom message template. Use {code} as placeholder for the code.
     * (default: 'Your verification code is: {code}.')
     */
    messageTemplate?: string;
}

/**
 * Verify phone number by sending an SMS text with a code via AWS SNS.
 * 
 * ![phone_logo](https://i.imgur.com/2adfBGT.png) 
 * @param {string} options.phoneNumber - The phone number to send the SMS to (e.g., "+1234567890")
 * @param {string} options.code - The verification code to send (required)
 * @param {string} options.accessKeyId - AWS access key ID
 * @param {string} options.secretAccessKey - AWS secret access key
 * @param {string} [options.awsRegion='us-east-1'] - AWS region
 * @param {boolean} [options.blockVoip=false] - Whether to block VoIP numbers
 * @param {string} [options.voipDetectionMethod='api'] - Method for VoIP detection: 'api' (external API) or 'libphonenumber' (local analysis)
 * @param {boolean} [options.useLibPhoneNumber=false] - Whether to use libphonenumber-js for phone number formatting and validation
 * @param {string} [options.metadataType='minimal'] - Metadata type: 'minimal' (75KB) or 'full' (140KB) for better phone type detection
 * @param {string} [options.senderId='Verify'] - SMS sender ID (max 11 characters)
 * @param {string} [options.smsType='Transactional'] - SMS type ('Transactional' or 'Promotional')
 * @param {string} [options.messageTemplate] - Custom message template. Use {code} as placeholder for the code.
 * @returns {Promise<Object>} Response object with success status, message, messageId, and code
 */
export interface VerifyPhoneResult {
    success: boolean;
    message?: string;
    messageId?: string;
    code?: string;
    phoneNumber?: string;
    expiresIn?: number;
    error?: string;
    details?: string;
    isVoip?: boolean;
}

export default async function verifyPhone(options: VerifyPhoneOptions = {} as VerifyPhoneOptions): Promise<VerifyPhoneResult> {
    const env = (typeof process !== 'undefined' ? process.env : undefined) as Record<string, string | undefined> | undefined;
    var {
        phoneNumber,
        code,
        accessKeyId = env?.AWS_ACCESS_KEY_ID,
        secretAccessKey = env?.AWS_SECRET_ACCESS_KEY,
        awsRegion = env?.AWS_REGION,
        blockVoip = false,
        voipDetectionMethod = 'api',
        useLibPhoneNumber = false,
        metadataType = 'minimal',
        senderId = 'Verify',
        smsType = 'Transactional',
        messageTemplate = 'Your verification code is: {code}.'
    } = options;

    try {
        // Validate that code is provided
        if (!code) {
            throw new Error('Verification code is required');
        }

        // Validate code format (alphanumeric, min 4 characters)
        if (!/^[a-zA-Z0-9]{4,}$/.test(code)) {
            throw new Error('Code must be alphanumeric and at least 4 characters');
        }

        // Format and validate phone number
        const formattedPhone = useLibPhoneNumber 
            ? formatPhoneNumberLibPhoneNumber(phoneNumber)
            : formatPhoneNumber(phoneNumber);

        if (!isValidPhoneNumber(formattedPhone, useLibPhoneNumber)) {
            throw new Error('Invalid phone number format. Please use E.164 format (e.g., +1234567890)');
        }

        // Check if VoIP blocking is enabled
        if (blockVoip) {
            const isVoip = voipDetectionMethod === 'libphonenumber' 
                ? await isPhoneNumberVoipLibPhoneNumber(formattedPhone, metadataType)
                : await isPhoneNumberVoip(formattedPhone);
            
            if (isVoip) {
                return {
                    success: false,
                    error: 'VoIP numbers are not allowed',
                    details: 'This phone number appears to be a VoIP number, which is not supported for verification',
                    isVoip: true
                };
            }
        }

        // Create SNS client
        const snsClient = new SNSClient({ accessKeyId, secretAccessKey, awsRegion });

        // Prepare message
        const message = messageTemplate.replace('{code}', code);

        // Prepare SNS parameters
        const params = {
            Message: message,
            PhoneNumber: formattedPhone,
            'MessageAttributes.entry.1.Name': 'AWS.SNS.SMS.SenderID',
            'MessageAttributes.entry.1.Value.DataType': 'String',
            'MessageAttributes.entry.1.Value.StringValue': senderId,
            'MessageAttributes.entry.2.Name': 'AWS.SNS.SMS.SMSType',
            'MessageAttributes.entry.2.Value.DataType': 'String',
            'MessageAttributes.entry.2.Value.StringValue': smsType
        };

        // Send SMS
        const response = await snsClient.makeRequest('Publish', params);

        return {
            success: true,
            message: 'Verification code sent successfully',
            messageId: response.MessageId,
            code: code,
            phoneNumber: formattedPhone,
            expiresIn: 600 // 10 minutes in seconds
        };

    } catch (error) {
        const err = error as Error;
        return {
            success: false,
            error: err?.message ?? String(error),
            details: err?.stack || undefined
        };
    }
}

/**
 * Format phone number to E.164 format using libphonenumber-js
 * @param {string} phone - The input phone number
 * @returns {string} - The formatted E.164 phone number
 */
function formatPhoneNumberLibPhoneNumber(phone: string): string {
    try {
        const phoneNumber = parsePhoneNumber(phone);
        if (phoneNumber && phoneNumber.isValid()) {
            return phoneNumber.format('E.164');
        }
        // Fallback to basic formatting if libphonenumber-js fails
        return formatPhoneNumber(phone);
    } catch (error) {
        console.warn('libphonenumber-js formatting failed, falling back to basic formatting:', error);
        return formatPhoneNumber(phone);
    }
}

/**
 * Format phone number to E.164 format
 * @param {string} phone - The input phone number
 * @returns {string} - The formatted E.164 phone number
 */
function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    return phone.startsWith('+') ? phone : `+${cleaned}`;
}

/**
 * Validate phone number against E.164 format
 * @param {string} phone - The phone number to validate
 * @param {boolean} useLibPhoneNumber - Whether to use libphonenumber-js for validation
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidPhoneNumber(phone: string, useLibPhoneNumber = false): boolean {
    if (useLibPhoneNumber) {
        try {
            const phoneNumber = parsePhoneNumber(phone);
            return phoneNumber ? phoneNumber.isValid() : false;
        } catch (error) {
            console.warn('libphonenumber-js validation failed, falling back to regex validation:', error);
            // Fallback to regex validation
        }
    }
    
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone) && phone.length >= 7 && phone.length <= 16;
}

/**
* AWS SNS HTTP API Client for sending SMS verification codes
* Works directly in the browser using Web Crypto API
*/

interface InternalSNSClientOptions {
    accessKeyId?: string;
    secretAccessKey?: string;
    awsRegion?: string;
}

class SNSClient {
    accessKeyId?: string;
    secretAccessKey?: string;
    region: string;
    endpoint: string;

    constructor(options: InternalSNSClientOptions = {}) {
        this.accessKeyId = options.accessKeyId;
        this.secretAccessKey = options.secretAccessKey;
        this.region = options.awsRegion || 'us-east-1';
        this.endpoint = `https://sns.${this.region}.amazonaws.com`;
    }

    stringToUint8Array(str: string): Uint8Array {
        return new TextEncoder().encode(str);
    }

    arrayBufferToHex(buffer: ArrayBuffer | Uint8Array): string {
        return Array.from(new Uint8Array(buffer as ArrayBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async sign(method: string, url: string, headers: Record<string, string>, payload: string): Promise<Record<string, string>> {
        const now = new Date();
        const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const dateStamp = amzDate.slice(0, 8);

        const canonicalUri = '/';
        const canonicalQuerystring = url.split('?')[1] || '';

        headers['host'] = `sns.${this.region}.amazonaws.com`;
        headers['x-amz-date'] = amzDate;

        const payloadHash = await crypto.subtle.digest('SHA-256', this.stringToUint8Array(payload))
            .then(buffer => this.arrayBufferToHex(buffer));
        headers['x-amz-content-sha256'] = payloadHash;

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

        headers['authorization'] = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        return headers;
    }

    async makeRequest(action: string, params: Record<string, string> = {}): Promise<{ MessageId?: string; raw?: string }> {
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
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`SNS Request failed: ${message}`);
        }
    }

    parseXMLResponse(xmlText: string): { MessageId?: string; raw?: string } {
        const messageIdMatch = xmlText.match(/<MessageId>([^<]+)<\/MessageId>/);
        const errorCodeMatch = xmlText.match(/<Code>([^<]+)<\/Code>/);
        const errorMessageMatch = xmlText.match(/<Message>([^<]+)<\/Message>/);

        if (errorCodeMatch && errorMessageMatch) {
            throw new Error(`${errorCodeMatch[1]}: ${errorMessageMatch[1]}`);
        }

        if (messageIdMatch) {
            return { MessageId: messageIdMatch[1] };
        }

        return { raw: xmlText };
    }
}

/**
 * Checks if a phone number is a Bandwidth-only VoIP number (e.g. Google Voice).
 *
 * @see https://www.sent.dm/resources/phone-lookup
 * @param {string} phone - The phone number in E.164 format (e.g., +1234567890).
 * @returns {Promise<boolean>} True if phone is Bandwidth-only VoIP
 */
export async function isPhoneNumberVoip(phone: string): Promise<boolean> {
    try {
        const response = await fetch(`https://www.sent.dm/api/phone-lookup?phone=${encodeURIComponent(phone)}`, {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn('Phone lookup failed:', response.status);
            return false; // Default to allowing the number if lookup fails
        }

        const phoneData = await response.json() as any;

        if (!phoneData || !phoneData.carrier) return false;

        return (
            phoneData.carrier.name.toLowerCase().includes("bandwidth") ||
            phoneData.carrier.type.toLowerCase() === "voip" ||
            phoneData.portability.line_type.toLowerCase() === "mobile"
        );
    } catch (error) {
        console.warn('Phone lookup error:', error);
        return false; // Default to allowing the number if lookup fails
    }
}

/**
 * Checks if a phone number is likely a VoIP number using libphonenumber-js.
 * This method analyzes the phone number structure and patterns to identify
 * common VoIP number characteristics.
 *
 * @param {string} phone - The phone number in E.164 format (e.g., +1234567890).
 * @param {string} metadataType - Metadata type: 'minimal' (75KB) or 'full' (140KB)
 * @returns {Promise<boolean>} True if phone is likely VoIP
 */
async function isPhoneNumberVoipLibPhoneNumber(phone: string, metadataType: 'minimal' | 'full' = 'minimal'): Promise<boolean> {
    try {
        // Parse the phone number using libphonenumber-js
        const phoneNumber = parsePhoneNumber(phone);
        
        if (!phoneNumber) {
            console.warn('Could not parse phone number with libphonenumber-js');
            return false;
        }

        // Check if the number is valid
        if (!phoneNumber.isValid()) {
            console.warn('Phone number is not valid according to libphonenumber-js');
            return false;
        }

        // Get the country code
        const country = phoneNumber.country;
        
        // VoIP detection heuristics based on common patterns
        
        // 1. Check for common VoIP area codes in the US
        if (country === 'US') {
            const nationalNumber = phoneNumber.nationalNumber;
            
            // Common VoIP area codes (these are often used by VoIP providers)
            const voipAreaCodes = [
                '800', '888', '877', '866', '855', '844', '833', // Toll-free numbers
                '900', '976', // Premium rate numbers
                '700', // Personal communication services
                '500', '521', '522', '523', '524', '525', '526', '527', '528', '529', // Personal communication services
                '600', '601', '602', '603', '604', '605', '606', '607', '608', '609' // Personal communication services
            ];
            
            if (voipAreaCodes.includes(nationalNumber.substring(0, 3))) {
                return true;
            }
        }
        
        // 2. Check for non-geographic numbers (often VoIP)
        if (phoneNumber.isNonGeographic()) {
            return true;
        }
        
        // 3. Use phone number type detection when available (requires 'full' metadata)
        if (metadataType === 'full') {
            try {
                const numberType = getNumberType(phone);
                
                // Direct VoIP detection
                if (numberType === 'VOIP') {
                    return true;
                }
                
                // Premium rate and toll-free numbers are often used by VoIP services
                if (numberType === 'PREMIUM_RATE' || numberType === 'TOLL_FREE') {
                    return true;
                }
                
                // Shared cost numbers might be VoIP
                if (numberType === 'SHARED_COST') {
                    return true;
                }
                
                // Mobile numbers are generally safe (not VoIP)
                if (numberType === 'MOBILE') {
                    return false;
                }
                
                // Fixed line numbers are generally safe (not VoIP)
                if (numberType === 'FIXED_LINE') {
                    return false;
                }
                
                // Fixed line or mobile could be either, so we'll use other heuristics
                if (numberType === 'FIXED_LINE_OR_MOBILE') {
                    // Continue with pattern analysis below
                }
                
            } catch (error) {
                console.warn('Phone number type detection failed:', error);
                // Continue with pattern analysis below
            }
        }
        
        // 4. Pattern-based heuristics for when type detection is not available
        const nationalNumber = phoneNumber.nationalNumber;
        
        // Check for repeated digits (e.g., 555-5555)
        if (/(\d)\1{2,}/.test(nationalNumber)) {
            return true;
        }
        
        // Check for sequential digits (e.g., 123-4567)
        if (/(?:0(?=1)|1(?=2)|2(?=3)|3(?=4)|4(?=5)|5(?=6)|6(?=7)|7(?=8)|8(?=9)){3,}/.test(nationalNumber)) {
            return true;
        }
        
        // Check for numbers ending in common VoIP patterns
        const voipEndings = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
        if (voipEndings.some(ending => nationalNumber.endsWith(ending))) {
            return true;
        }
        
        // Check for numbers that are too "perfect" (often used by VoIP providers)
        const digits = nationalNumber.split('');
        const uniqueDigits = new Set(digits);
        
        // If the number has very few unique digits, it might be VoIP
        if (uniqueDigits.size <= 3 && nationalNumber.length >= 7) {
            return true;
        }
        
        // Default to not VoIP if no patterns match
        return false;
        
    } catch (error) {
        console.warn('libphonenumber-js VoIP detection error:', error);
        return false; // Default to allowing the number if detection fails
    }
}
