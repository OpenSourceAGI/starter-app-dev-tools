import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";

// Input/Output Schemas
const PersonInputSchema = z.object({
  phone_number: z
    .string()
    .min(10)
    .max(15)
    .describe("Phone number in E.164 or local format"),
  legal_name: z
    .string()
    .min(1)
    .max(100)
    .describe("Full legal name of the person"),
  current_address: z
    .object({
      street_line_1: z.string().min(1).max(1000),
      street_line_2: z.string().max(1000).optional(),
      city: z.string().min(1).max(500),
      state_code: z.string().length(2),
      postal_code: z.string().min(5).max(10),
      country_code: z.string().length(2).default("US"),
    })
    .describe("Current address information"),
});

const VerificationResponseSchema = z.object({
  verification_score: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence score 0-100"),
  name_match_found: z.boolean(),
  phone_validated: z.boolean(),
  address_validated: z.boolean(),
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      type: z.enum(["address_history", "phone_history", "name_verification"]),
      options: z.array(z.string()).optional(),
    }),
  ),
  historical_data: z.object({
    previous_addresses: z.array(z.string()),
    previous_phones: z.array(z.string()),
    associated_names: z.array(z.string()),
  }),
  recommendations: z
    .array(z.string())
    .describe("Suggestions for additional verification"),
});

// TrestleIQ API Functions
interface AddressInput {
  street_line_1: string;
  street_line_2?: string;
  city: string;
  state_code: string;
  postal_code: string;
  country_code?: string;
}

interface PhoneHints {
  name?: string;
  postalCode?: string;
}

interface PersonInput {
  phone_number: string;
  legal_name: string;
  current_address: AddressInput;
}

async function makeRequest(
  endpoint: string,
  params: Record<string, string | undefined>,
  apiKey: string,
  baseUrl = "https://api.trestleiq.com",
): Promise<any> {
  const url = new URL(endpoint, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value as string);
  });

  const response = await fetch(url.toString(), {
    headers: {
      "x-api-key": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `TrestleIQ API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

function reversePhone(phoneNumber: string, apiKey: string, hints: PhoneHints = {}) {
  return makeRequest(
    "/3.2/phone",
    {
      phone: phoneNumber,
      "phone.country_hint": "US",
      ...(hints.name && { "phone.name_hint": hints.name }),
      ...(hints.postalCode && { "phone.postal_code_hint": hints.postalCode }),
    },
    apiKey,
  );
}

function findPerson(name: string, address: AddressInput, apiKey: string) {
  return makeRequest(
    "/3.1/person",
    {
      name,
      "address.street_line_1": address.street_line_1,
      "address.city": address.city,
      "address.state_code": address.state_code,
      "address.postal_code": address.postal_code,
      "address.country_code": address.country_code || "US",
    },
    apiKey,
  );
}

function reverseAddress(address: AddressInput, apiKey: string) {
  return makeRequest(
    "/3.1/location",
    {
      street_line_1: address.street_line_1,
      ...(address.street_line_2 && { street_line_2: address.street_line_2 }),
      city: address.city,
      state_code: address.state_code,
      postal_code: address.postal_code,
      country_code: address.country_code || "US",
    },
    apiKey,
  );
}

// Utility Functions
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
}

function extractHistoricalData(phoneResult: any, personResult: any, addressResult: any) {
  const previousAddresses: string[] = [];
  const previousPhones: string[] = [];
  const associatedNames: string[] = [];

  // Extract from phone result
  if (phoneResult?.owners) {
    phoneResult.owners.forEach((owner: any) => {
      if (owner.name) associatedNames.push(owner.name);
      if (owner.addresses) {
        owner.addresses.forEach((addr: any) => {
          if (addr.street_line_1 && addr.city && addr.state_code) {
            previousAddresses.push(
              `${addr.street_line_1}, ${addr.city}, ${addr.state_code}`,
            );
          }
        });
      }
      if (owner.phones) {
        owner.phones.forEach((phone: any) => {
          if (phone.phone_number) previousPhones.push(phone.phone_number);
        });
      }
    });
  }

  // Extract from person result
  if (personResult?.person) {
    personResult.person.forEach((person: any) => {
      if (person.addresses) {
        person.addresses.forEach((addr: any) => {
          if (addr.street_line_1 && addr.city && addr.state_code) {
            previousAddresses.push(
              `${addr.street_line_1}, ${addr.city}, ${addr.state_code}`,
            );
          }
        });
      }
      if (person.phones) {
        person.phones.forEach((phone: any) => {
          if (phone.phone_number) previousPhones.push(phone.phone_number);
        });
      }
    });
  }

  // Extract from address result
  if (addressResult?.current_residents) {
    addressResult.current_residents.forEach((resident: any) => {
      if (resident.name) associatedNames.push(resident.name);
    });
  }

  return {
    previous_addresses: [...new Set(previousAddresses)].slice(0, 10),
    previous_phones: [...new Set(previousPhones)].slice(0, 5),
    associated_names: [...new Set(associatedNames)].slice(0, 10),
  };
}

function checkNameMatch(personResult: any, phoneResult: any, inputName: string): boolean {
  const normalizedInputName = normalizeName(inputName);

  // Check person result
  if (personResult?.person) {
    for (const person of personResult.person) {
      if (person.name && normalizeName(person.name) === normalizedInputName) {
        return true;
      }
    }
  }

  // Check phone owners
  if (phoneResult?.owners) {
    for (const owner of phoneResult.owners) {
      if (owner.name && normalizeName(owner.name) === normalizedInputName) {
        return true;
      }
    }
  }

  return false;
}

function checkPartialNameMatch(personResult: any, phoneResult: any, inputName: string): boolean {
  const inputNameParts = normalizeName(inputName).split(" ");

  const checkNameParts = (name: string): boolean => {
    const nameParts = normalizeName(name).split(" ");
    return inputNameParts.some(
      (part) => nameParts.includes(part) && part.length > 2,
    );
  };

  // Check person result
  if (personResult?.person) {
    for (const person of personResult.person) {
      if (person.name && checkNameParts(person.name)) {
        return true;
      }
    }
  }

  // Check phone owners
  if (phoneResult?.owners) {
    for (const owner of phoneResult.owners) {
      if (owner.name && checkNameParts(owner.name)) {
        return true;
      }
    }
  }

  return false;
}

function calculateVerificationScore(
  phoneResult: any,
  personResult: any,
  addressResult: any,
  input: PersonInput,
): number {
  let score = 0;

  // Phone validation (30 points max)
  if (phoneResult?.is_valid) {
    score += 15;
    if (
      phoneResult.line_type === "Mobile" ||
      phoneResult.line_type === "Landline"
    ) {
      score += 10;
    }
    if (!phoneResult.is_commercial) {
      score += 5;
    }
  }

  // Name matching (40 points max)
  if (checkNameMatch(personResult, phoneResult, input.legal_name)) {
    score += 40;
  } else if (
    checkPartialNameMatch(personResult, phoneResult, input.legal_name)
  ) {
    score += 20;
  }

  // Address validation (30 points max)
  if (addressResult?.is_valid) {
    score += 15;
    if (addressResult.is_active) {
      score += 10;
    }
    if (!addressResult.is_commercial) {
      score += 5;
    }
  }

  return Math.min(score, 100);
}

function generateFakeAddresses(count: number): string[] {
  const fakeAddresses = [
    "123 Fake St, Nowhere, CA",
    "456 Made Up Ave, Fictional, TX",
    "789 Pretend Dr, Imaginary, FL",
    "101 False Blvd, Bogus, NY",
    "202 Phony Way, Unreal, WA",
  ];
  return fakeAddresses.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateFakePhones(count: number): string[] {
  const fakePhones: string[] = [];
  for (let i = 0; i < count; i++) {
    const areaCode = Math.floor(Math.random() * 900) + 100;
    const exchange = Math.floor(Math.random() * 900) + 100;
    const number = Math.floor(Math.random() * 9000) + 1000;
    fakePhones.push(`${areaCode}${exchange}${number}`);
  }
  return fakePhones;
}

interface HistoricalData {
  previous_addresses: string[];
  previous_phones: string[];
  associated_names: string[];
}

interface VerificationQuestion {
  id: string;
  question: string;
  type: "address_history" | "phone_history" | "name_verification";
  options?: string[];
}

function generateVerificationQuestions(historicalData: HistoricalData, inputName: string): VerificationQuestion[] {
  const questions: VerificationQuestion[] = [];

  // Address history questions
  if (historicalData.previous_addresses.length > 0) {
    const shuffledAddresses = [...historicalData.previous_addresses].sort(
      () => Math.random() - 0.5,
    );
    const realAddresses = shuffledAddresses.slice(0, 3);
    const fakeAddresses = generateFakeAddresses(2);
    const allOptions = [...realAddresses, ...fakeAddresses].sort(
      () => Math.random() - 0.5,
    );

    questions.push({
      id: `addr_${Date.now()}`,
      question: `Which of the following addresses have you lived at in the past?`,
      type: "address_history",
      options: allOptions,
    });
  }

  // Phone history questions
  if (historicalData.previous_phones.length > 1) {
    const shuffledPhones = [...historicalData.previous_phones].sort(
      () => Math.random() - 0.5,
    );
    const realPhones = shuffledPhones.slice(0, 2);
    const fakePhones = generateFakePhones(2);
    const allOptions = [...realPhones, ...fakePhones, "None of the above"].sort(
      () => Math.random() - 0.5,
    );

    questions.push({
      id: `phone_${Date.now()}`,
      question: `Which of the following phone numbers have you previously used?`,
      type: "phone_history",
      options: allOptions,
    });
  }

  // Name verification questions
  if (historicalData.associated_names.length > 0) {
    const otherNames = historicalData.associated_names.filter(
      (name: string) => normalizeName(name) !== normalizeName(inputName),
    );

    if (otherNames.length > 0) {
      questions.push({
        id: `name_${Date.now()}`,
        question: `Are any of the following names associated with you (maiden name, nickname, etc.)?`,
        type: "name_verification",
        options: [...otherNames.slice(0, 4), "None of the above"],
      });
    }
  }

  return questions;
}

function generateRecommendations(
  score: number,
  phoneResult: any,
  personResult: any,
  addressResult: any,
): string[] {
  const recommendations: string[] = [];

  if (score < 30) {
    recommendations.push(
      "Consider requesting additional identification documents",
    );
    recommendations.push(
      "Verify identity through alternative methods (government ID, utility bills)",
    );
  } else if (score < 60) {
    recommendations.push("Request additional verification questions");
    recommendations.push("Consider manual review of provided information");
  } else if (score < 80) {
    recommendations.push("Proceed with standard verification process");
  } else {
    recommendations.push(
      "High confidence verification - proceed with confidence",
    );
  }

  if (!phoneResult?.is_valid) {
    recommendations.push("Request alternative contact phone number");
  }

  if (!addressResult?.is_valid) {
    recommendations.push(
      "Verify current address with utility bill or bank statement",
    );
  }

  if (phoneResult?.line_type === "NonFixedVOIP") {
    recommendations.push(
      "VOIP number detected - consider additional verification",
    );
  }

  return recommendations;
}

// Main Verification Function
async function verifyIdentity(input: PersonInput, apiKey: string) {
  const { phone_number, legal_name, current_address } = input;

  // Run all API calls in parallel
  const [phoneData, personData, addressData] = await Promise.allSettled([
    reversePhone(phone_number, apiKey, {
      name: legal_name,
      postalCode: current_address.postal_code,
    }),
    findPerson(legal_name, current_address, apiKey),
    reverseAddress(current_address, apiKey),
  ]);

  // Process results
  const phoneResult = phoneData.status === "fulfilled" ? phoneData.value : null;
  const personResult =
    personData.status === "fulfilled" ? personData.value : null;
  const addressResult =
    addressData.status === "fulfilled" ? addressData.value : null;

  // Extract historical data
  const historicalData = extractHistoricalData(
    phoneResult,
    personResult,
    addressResult,
  );

  // Calculate verification score
  const verificationScore = calculateVerificationScore(
    phoneResult,
    personResult,
    addressResult,
    input,
  );

  // Generate verification questions
  const questions = generateVerificationQuestions(historicalData, legal_name);

  // Generate recommendations
  const recommendations = generateRecommendations(
    verificationScore,
    phoneResult,
    personResult,
    addressResult,
  );

  return {
    verification_score: verificationScore,
    name_match_found: checkNameMatch(personResult, phoneResult, legal_name),
    phone_validated: phoneResult?.is_valid || false,
    address_validated: addressResult?.is_valid || false,
    questions,
    historical_data: historicalData,
    recommendations,
  };
}

// Create Hono app
const app = new OpenAPIHono();

// Middleware
app.use("*", cors());
app.use("*", logger());

// Get API key from environment
const getApiKey = () => {
  const apiKey = process.env.TRESTLE_API_KEY;
  if (!apiKey) {
    throw new Error("TRESTLE_API_KEY environment variable is required");
  }
  return apiKey;
};

// Main API route
const verifyIdentityRoute = createRoute({
  method: "post",
  path: "/verify-identity",
  tags: ["Identity Verification"],
  summary: "Verify person identity",
  description:
    "Verify a person's identity using phone number, legal name, and current address",
  request: {
    body: {
      content: {
        "application/json": {
          schema: PersonInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: VerificationResponseSchema,
        },
      },
      description: "Identity verification completed successfully",
    },
    400: {
      description: "Bad request - invalid input data",
    },
    500: {
      description: "Internal server error",
    },
  },
});

app.openapi(verifyIdentityRoute, async (c) => {
  try {
    const body = c.req.valid("json") as PersonInput;
    const apiKey = getApiKey();
    const result = await verifyIdentity(body, apiKey);

    return c.json(result, 200);
  } catch (error) {
    console.error("Identity verification error:", error);
    return c.json(
      {
        error: "Failed to verify identity",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// OpenAPI documentation
app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Identity Verification API",
    description:
      "API for verifying person identity using TrestleIQ data services",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Development server",
    },
  ],
});

// Serve Swagger UI
app.get("/swagger", async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Identity Verification API</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
      <script>
        SwaggerUIBundle({
          url: '/doc',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.standalone]
        })
      </script>
    </body>
    </html>
  `);
});

// Demo endpoint with sample data
app.get("/demo", async (c) => {
  const sampleRequest = {
    phone_number: "2069735100",
    legal_name: "John Smith",
    current_address: {
      street_line_1: "123 Main St",
      city: "Seattle",
      state_code: "WA",
      postal_code: "98101",
      country_code: "US",
    },
  };

  try {
    const apiKey = getApiKey();
    const result = await verifyIdentity(sampleRequest, apiKey);

    return c.json({
      demo_request: sampleRequest,
      demo_response: result,
      note: "This is a demo using sample data. Use POST /verify-identity for real verification.",
    });
  } catch (error) {
    return c.json({
      demo_request: sampleRequest,
      error: "Demo failed - check your TRESTLE_API_KEY",
      note: "This demo requires a valid TrestleIQ API key",
    });
  }
});

export default app;

declare const Bun: { serve: (options: { port: number; fetch: any }) => unknown };

// Start server if not imported as module
if ((import.meta as any).main) {
  const port = parseInt(process.env.PORT || "3000");
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/swagger`);
  console.log(`🔍 OpenAPI Spec: http://localhost:${port}/doc`);
  console.log(`🎮 Demo Endpoint: http://localhost:${port}/demo`);

  Bun.serve({
    port,
    fetch: app.fetch,
  });
}
