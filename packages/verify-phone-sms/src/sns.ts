/**
 * AWS SNS HTTP API Client for Cloudflare Workers
 */

interface SNSClientOptions {
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
}

interface SNSResponse {
  MessageId?: string;
  TopicArn?: string;
  SubscriptionArn?: string;
  raw?: string;
}

type SendSMSCallback = (
  err: { err: Error; "err.stack"?: string } | undefined,
  messageId?: string,
) => void;

class SNSClient {
  accessKeyId?: string;
  secretAccessKey?: string;
  region: string;
  endpoint: string;

  constructor(options: SNSClientOptions = {}) {
    this.accessKeyId = options.accessKeyId;
    this.secretAccessKey = options.secretAccessKey;
    this.region = options.region || "us-east-1";
    this.endpoint = `https://sns.${this.region}.amazonaws.com`;
  }

  stringToUint8Array(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  arrayBufferToHex(buffer: ArrayBuffer | Uint8Array): string {
    return Array.from(new Uint8Array(buffer as ArrayBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async sign(
    method: string,
    url: string,
    headers: Record<string, string>,
    payload: string,
  ): Promise<Record<string, string>> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const canonicalUri = "/";
    const canonicalQuerystring = url.split("?")[1] || "";

    headers["host"] = `sns.${this.region}.amazonaws.com`;
    headers["x-amz-date"] = amzDate;

    const payloadHash = await crypto.subtle
      .digest("SHA-256", this.stringToUint8Array(payload))
      .then((buffer) => this.arrayBufferToHex(buffer));
    headers["x-amz-content-sha256"] = payloadHash;

    const sortedHeaders = Object.keys(headers)
      .sort()
      .map((key) => `${key.toLowerCase()}:${headers[key]}`)
      .join("\n");

    const signedHeaders = Object.keys(headers)
      .sort()
      .map((key) => key.toLowerCase())
      .join(";");

    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuerystring,
      sortedHeaders,
      "",
      signedHeaders,
      payloadHash,
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${this.region}/sns/aws4_request`;

    const canonicalRequestHash = await crypto.subtle
      .digest("SHA-256", this.stringToUint8Array(canonicalRequest))
      .then((buffer) => this.arrayBufferToHex(buffer));

    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join("\n");

    const kDate = await crypto.subtle
      .importKey(
        "raw",
        this.stringToUint8Array(`AWS4${this.secretAccessKey}`),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      )
      .then((key) =>
        crypto.subtle.sign("HMAC", key, this.stringToUint8Array(dateStamp)),
      );

    const kRegion = await crypto.subtle
      .importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
      ])
      .then((key) =>
        crypto.subtle.sign("HMAC", key, this.stringToUint8Array(this.region)),
      );

    const kService = await crypto.subtle
      .importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
      ])
      .then((key) =>
        crypto.subtle.sign("HMAC", key, this.stringToUint8Array("sns")),
      );

    const kSigning = await crypto.subtle
      .importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
      ])
      .then((key) =>
        crypto.subtle.sign(
          "HMAC",
          key,
          this.stringToUint8Array("aws4_request"),
        ),
      );

    const signature = await crypto.subtle
      .importKey("raw", kSigning, { name: "HMAC", hash: "SHA-256" }, false, [
        "sign",
      ])
      .then((key) =>
        crypto.subtle.sign("HMAC", key, this.stringToUint8Array(stringToSign)),
      )
      .then((buffer) => this.arrayBufferToHex(buffer));

    headers["authorization"] =
      `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
  }

  async makeRequest(
    action: string,
    params: Record<string, string> = {},
  ): Promise<SNSResponse> {
    const queryParams = new URLSearchParams({
      Action: action,
      Version: "2010-03-31",
      ...params,
    });

    const url = `${this.endpoint}/?${queryParams.toString()}`;
    const payload = "";
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
    };

    const signedHeaders = await this.sign("GET", url, headers, payload);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: signedHeaders,
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

  parseXMLResponse(xmlText: string): SNSResponse {
    const messageIdMatch = xmlText.match(/<MessageId>([^<]+)<\/MessageId>/);
    const topicArnMatch = xmlText.match(/<TopicArn>([^<]+)<\/TopicArn>/);
    const subscriptionArnMatch = xmlText.match(
      /<SubscriptionArn>([^<]+)<\/SubscriptionArn>/,
    );

    if (messageIdMatch) {
      return { MessageId: messageIdMatch[1] };
    }

    if (topicArnMatch) {
      return { TopicArn: topicArnMatch[1] };
    }

    if (subscriptionArnMatch) {
      return { SubscriptionArn: subscriptionArnMatch[1] };
    }

    return { raw: xmlText };
  }
}

let defaultClient: SNSClient | null = null;

export function createClient(options: SNSClientOptions = {}): SNSClient {
  defaultClient = new SNSClient(options);
  return defaultClient;
}

export function sendSMS(
  textmessage: string,
  phone: string,
  senderid: string,
  SMSType: string,
  callback: SendSMSCallback,
  client: SNSClient | null = null,
): void {
  const snsClient = client || defaultClient;

  if (!snsClient) {
    return callback({
      err: new Error("SNS client not initialized. Call createClient() first."),
    });
  }

  const params: Record<string, string> = {
    Message: textmessage,
    PhoneNumber: phone,
    "MessageAttributes.entry.1.Name": "AWS.SNS.SMS.SenderID",
    "MessageAttributes.entry.1.Value.DataType": "String",
    "MessageAttributes.entry.1.Value.StringValue": senderid,
    "MessageAttributes.entry.2.Name": "AWS.SNS.SMS.SMSType",
    "MessageAttributes.entry.2.Value.DataType": "String",
    "MessageAttributes.entry.2.Value.StringValue": SMSType,
  };

  snsClient
    .makeRequest("Publish", params)
    .then((response) => {
      callback(undefined, response.MessageId);
    })
    .catch((error: Error) => {
      callback({ err: error, "err.stack": error.stack });
    });
}

export { SNSClient };

export default {
  createClient,
  sendSMS,
};
