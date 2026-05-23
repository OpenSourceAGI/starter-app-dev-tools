#!/usr/bin/env node

/**
 * OpenAPI to MCP Server Generator (mcp-use framework)
 *
 * Generates a complete MCP server using the mcp-use framework from any OpenAPI spec.
 *
 * Usage:
 *   node generate-mcp-use-server.js <openapi-spec> [output-folder] [options]
 *
 * Examples:
 *   node generate-mcp-use-server.js ./petstore.json ./my-mcp-server
 *   node generate-mcp-use-server.js https://petstore3.swagger.io/api/v3/openapi.json ./petstore-mcp --base-url https://petstore3.swagger.io/api/v3
 */

import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// OpenAPI Spec Loading & Parsing
// ============================================================================

async function loadOpenApiSpec(specPathOrUrl) {
  if (specPathOrUrl.startsWith('http://') || specPathOrUrl.startsWith('https://')) {
    const response = await fetch(specPathOrUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch spec: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  const content = await fs.readFile(specPathOrUrl, 'utf-8');

  if (specPathOrUrl.endsWith('.yaml') || specPathOrUrl.endsWith('.yml')) {
    const yaml = await import('js-yaml').catch(() => null);
    if (yaml) {
      return yaml.load(content);
    }
    throw new Error('YAML spec detected but js-yaml is not installed. Run: npm install js-yaml');
  }

  return JSON.parse(content);
}

// Convert OpenAPI schema to Zod schema string
function schemaToZod(schema, required = false) {
  if (!schema) return 'z.unknown()';

  let zodStr;

  switch (schema.type) {
    case 'string':
      if (schema.enum) {
        zodStr = `z.enum([${schema.enum.map(e => `'${e}'`).join(', ')}])`;
      } else if (schema.format === 'date-time') {
        zodStr = 'z.string().datetime()';
      } else if (schema.format === 'date') {
        zodStr = 'z.string().date()';
      } else if (schema.format === 'email') {
        zodStr = 'z.string().email()';
      } else if (schema.format === 'uri' || schema.format === 'url') {
        zodStr = 'z.string().url()';
      } else {
        zodStr = 'z.string()';
      }
      break;

    case 'integer':
      zodStr = 'z.number().int()';
      break;

    case 'number':
      zodStr = 'z.number()';
      break;

    case 'boolean':
      zodStr = 'z.boolean()';
      break;

    case 'array':
      zodStr = `z.array(${schemaToZod(schema.items, true)})`;
      break;

    case 'object':
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, val]) => {
            const isReq = schema.required?.includes(key);
            const propZod = schemaToZod(val, isReq);
            // Add description if available
            const desc = val.description ? `.describe('${val.description.replace(/'/g, "\\'")}')` : '';
            return `    ${sanitizePropertyName(key)}: ${propZod}${desc}`;
          })
          .join(',\n');
        zodStr = `z.object({\n${props}\n  })`;
      } else if (schema.additionalProperties) {
        zodStr = `z.record(z.string(), ${schemaToZod(schema.additionalProperties, true)})`;
      } else {
        zodStr = 'z.record(z.string(), z.unknown())';
      }
      break;

    default:
      // Handle anyOf, oneOf, allOf
      if (schema.anyOf) {
        const options = schema.anyOf.map(s => schemaToZod(s, true)).join(', ');
        zodStr = `z.union([${options}])`;
      } else if (schema.oneOf) {
        const options = schema.oneOf.map(s => schemaToZod(s, true)).join(', ');
        zodStr = `z.union([${options}])`;
      } else {
        zodStr = 'z.unknown()';
      }
  }

  // Add optional if not required
  if (!required) {
    zodStr += '.optional()';
  }

  return zodStr;
}

// Sanitize property name for JS object key
function sanitizePropertyName(name) {
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name)) {
    return name;
  }
  return `'${name}'`;
}

// Build Zod schema for tool parameters
function buildZodSchema(operation, pathParams) {
  const allParams = [...(pathParams || []), ...(operation.parameters || [])];
  const properties = [];

  for (const param of allParams) {
    const schema = param.schema || { type: 'string' };
    const zodType = schemaToZod(schema, param.required);
    const desc = param.description ? `.describe('${param.description.replace(/'/g, "\\'")}')` : '';
    properties.push(`    ${sanitizePropertyName(param.name)}: ${zodType}${desc}`);
  }

  // Handle request body
  if (operation.requestBody) {
    const content = operation.requestBody.content;
    const mediaType = content?.['application/json'] || Object.values(content || {})[0];

    if (mediaType?.schema) {
      const zodType = schemaToZod(mediaType.schema, operation.requestBody.required);
      const desc = operation.requestBody.description
        ? `.describe('${operation.requestBody.description.replace(/'/g, "\\'")}')`
        : `.describe('Request body')`;
      properties.push(`    requestBody: ${zodType}${desc}`);
    }
  }

  if (properties.length === 0) {
    return 'z.object({})';
  }

  return `z.object({\n${properties.join(',\n')}\n  })`;
}

function classifyRisk(operation, method, pathTemplate) {
  const tags = operation.tags || [];
  const haystack = [
    operation.operationId,
    operation.summary,
    operation.description,
    pathTemplate,
    ...tags,
  ].filter(Boolean).join(' ').toLowerCase();

  const isMutation = !['get', 'head', 'options'].includes(method);
  const dangerousPatterns = [
    'delete', 'remove', 'destroy', 'purge',
    'payment', 'payout', 'billing', 'invoice',
    'admin', 'role', 'permission', 'token', 'secret', 'key',
    'webhook', 'auth', 'oauth', 'user', 'member',
  ];

  const matchedDanger = dangerousPatterns.some(p => haystack.includes(p));
  const riskLevel = matchedDanger ? 'high' : isMutation ? 'medium' : 'low';

  return {
    tags,
    isMutation,
    riskLevel,
    requiresApproval: riskLevel !== 'low',
    allowedInInspector: riskLevel === 'low',
    enabledByDefault: riskLevel === 'low',
  };
}

// Extract tools from OpenAPI spec
function extractTools(spec, options = {}) {
  const tools = [];
  const { baseUrl: overrideBaseUrl, excludeOperationIds = [], filterFn, allowMutations = false, includeTags = [], excludeTags = [] } = options;

  let baseUrl = overrideBaseUrl;
  if (!baseUrl && spec.servers && spec.servers.length > 0) {
    baseUrl = spec.servers[0].url;
  }

  for (const [pathTemplate, pathItem] of Object.entries(spec.paths || {})) {
    const pathParams = pathItem.parameters || [];

    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']) {
      const operation = pathItem[method];
      if (!operation) continue;

      const operationId = operation.operationId ||
        `${method}_${pathTemplate.replace(/[^a-zA-Z0-9]/g, '_')}`;

      if (excludeOperationIds.includes(operationId)) continue;

      const risk = classifyRisk(operation, method, pathTemplate);

      // Override enabledByDefault for mutations if allowMutations flag is set
      if (allowMutations && risk.isMutation && risk.riskLevel === 'medium') {
        risk.enabledByDefault = true;
        risk.requiresApproval = false;
      }

      // Tag-based filtering
      if (includeTags.length > 0 && !risk.tags.some(t => includeTags.includes(t))) continue;
      if (excludeTags.length > 0 && risk.tags.some(t => excludeTags.includes(t))) continue;

      // Build tool name (sanitized)
      const name = operationId
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

      const description = operation.summary ||
        operation.description ||
        `${method.toUpperCase()} ${pathTemplate}`;

      // Build Zod schema string
      const zodSchema = buildZodSchema(operation, pathParams);

      // Extract execution parameters
      const allParams = [...pathParams, ...(operation.parameters || [])];
      const executionParameters = allParams.map(p => ({
        name: p.name,
        in: p.in,
      }));

      let requestBodyContentType;
      if (operation.requestBody?.content) {
        requestBodyContentType = Object.keys(operation.requestBody.content)[0];
      }

      const tool = {
        name,
        description: description.substring(0, 1024),
        zodSchema,
        method,
        pathTemplate,
        executionParameters,
        requestBodyContentType,
        operationId,
        baseUrl,
        tags: risk.tags,
        isMutation: risk.isMutation,
        riskLevel: risk.riskLevel,
        requiresApproval: risk.requiresApproval,
        allowedInInspector: risk.allowedInInspector,
        enabledByDefault: risk.enabledByDefault,
      };

      if (filterFn && !filterFn(tool)) continue;

      tools.push(tool);
    }
  }

  return tools;
}

// ============================================================================
// Code Generation
// ============================================================================

function generatePackageJson(serverName, tools, port) {
  return JSON.stringify({
    name: serverName,
    version: '1.0.0',
    description: `MCP server generated from OpenAPI spec (${tools.length} tools)`,
    type: 'module',
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      dev: 'node --watch src/index.js',
    },
    dependencies: {
      'mcp-use': '^1.11.2',
      'zod': '^3.23.0',
      'dotenv': '^16.4.0',
    },
    engines: { node: '>=18.0.0' },
  }, null, 2);
}

function generateEnvFile(baseUrl, port) {
  return `# Server Configuration
PORT=${port}
NODE_ENV=development

# API Configuration
API_BASE_URL=${baseUrl || 'https://api.example.com'}

# Authentication (uncomment and configure as needed)
# API_KEY=your-api-key
# API_AUTH_HEADER=X-Custom-Auth:your-token

# Security — allowed API hosts (comma-separated). Leave empty to allow the spec's host only.
# ALLOWED_API_HOSTS=api.example.com,api2.example.com

# Tool policy — set to true to allow medium/high-risk (mutating) tools
ALLOW_RESTRICTED_TOOLS=false
# Set to false to bypass per-call approval requirement for restricted tools
REQUIRE_APPROVALS=true

# Request limits
REQUEST_TIMEOUT_MS=30000
MAX_RESPONSE_BYTES=10485760

# MCP Server URL (for UI widgets in production)
# MCP_URL=https://your-production-url.com

# Allowed Origins (comma-separated, for production)
# ALLOWED_ORIGINS=https://app1.com,https://app2.com
`;
}

function generateEnvExampleFile(baseUrl, port) {
  return `# Server Configuration
PORT=${port}
NODE_ENV=development

# API Configuration
API_BASE_URL=${baseUrl || 'https://api.example.com'}

# Authentication
API_KEY=your-api-key-here
# API_AUTH_HEADER=Header-Name:header-value

# Security — allowed API hosts (comma-separated). Leave empty to allow the spec's host only.
# ALLOWED_API_HOSTS=api.example.com,api2.example.com

# Tool policy — set to true to allow medium/high-risk (mutating) tools
ALLOW_RESTRICTED_TOOLS=false
# Set to false to bypass per-call approval requirement for restricted tools
REQUIRE_APPROVALS=true

# Request limits
REQUEST_TIMEOUT_MS=30000
MAX_RESPONSE_BYTES=10485760

# MCP Server URL (for UI widgets in production)
# MCP_URL=https://your-production-url.com

# Allowed Origins (comma-separated, for production)
# ALLOWED_ORIGINS=https://app1.com,https://app2.com
`;
}

function generatePolicy() {
  return `// Runtime security policy for generated MCP server

const BLOCKED_HEADER_NAMES = new Set([
  'authorization', 'cookie', 'set-cookie', 'x-api-key',
  'x-auth-token', 'proxy-authorization', 'www-authenticate',
]);

const MAX_RESPONSE_BYTES = parseInt(process.env.MAX_RESPONSE_BYTES || '10485760');
const REQUEST_TIMEOUT_MS = parseInt(process.env.REQUEST_TIMEOUT_MS || '30000');

export { MAX_RESPONSE_BYTES, REQUEST_TIMEOUT_MS };

export function sanitizeHeaderParams(headerParams = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headerParams)) {
    if (!BLOCKED_HEADER_NAMES.has(k.toLowerCase())) {
      out[k] = String(v);
    }
  }
  return out;
}

export function assertAllowedBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  const allowedHosts = (process.env.ALLOWED_API_HOSTS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (allowedHosts.length > 0 && !allowedHosts.includes(url.host)) {
    throw new Error(\`Disallowed API host: \${url.host}. Set ALLOWED_API_HOSTS to include it.\`);
  }
}

export function checkToolPolicy(toolConfig) {
  if (!toolConfig.enabledByDefault && process.env.ALLOW_RESTRICTED_TOOLS !== 'true') {
    throw new Error(
      \`Tool '\${toolConfig.name}' is disabled by policy (riskLevel: \${toolConfig.riskLevel}). \` +
      \`Set ALLOW_RESTRICTED_TOOLS=true to enable restricted tools.\`
    );
  }
  if (toolConfig.requiresApproval && process.env.REQUIRE_APPROVALS !== 'false') {
    throw new Error(
      \`Tool '\${toolConfig.name}' requires approval (riskLevel: \${toolConfig.riskLevel}). \` +
      \`Set REQUIRE_APPROVALS=false to bypass, or route through an approval handler.\`
    );
  }
}
`;
}

function generateHttpClient() {
  return `// HTTP client for API requests
import { sanitizeHeaderParams, MAX_RESPONSE_BYTES, REQUEST_TIMEOUT_MS } from './policy.js';

export function buildUrl(baseUrl, pathTemplate, pathParams = {}) {
  let url = pathTemplate;
  for (const [key, value] of Object.entries(pathParams)) {
    url = url.replace(\`{\${key}}\`, encodeURIComponent(String(value)));
  }
  return new URL(url, baseUrl).toString();
}

export function buildQueryString(queryParams = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, String(v)));
      } else {
        params.append(key, String(value));
      }
    }
  }
  return params.toString();
}

export async function executeRequest(toolConfig, args, config = {}) {
  const { baseUrl: configBaseUrl, headers: configHeaders = {} } = config;
  const baseUrl = configBaseUrl || toolConfig.baseUrl;

  if (!baseUrl) {
    throw new Error(\`No base URL configured for tool: \${toolConfig.name}\`);
  }

  const pathParams = {};
  const queryParams = {};
  const rawHeaderParams = {};
  let body;

  for (const param of toolConfig.executionParameters || []) {
    const value = args[param.name];
    if (value === undefined) continue;
    switch (param.in) {
      case 'path':  pathParams[param.name] = value; break;
      case 'query': queryParams[param.name] = value; break;
      case 'header': rawHeaderParams[param.name] = value; break;
    }
  }

  if (args.requestBody !== undefined) {
    body = args.requestBody;
  }

  let url = buildUrl(baseUrl, toolConfig.pathTemplate, pathParams);
  const queryString = buildQueryString(queryParams);
  if (queryString) {
    url += (url.includes('?') ? '&' : '?') + queryString;
  }

  // configHeaders (auth) always win over spec-defined header params
  const headers = {
    Accept: 'application/json',
    ...sanitizeHeaderParams(rawHeaderParams),
    ...configHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = toolConfig.requestBodyContentType || 'application/json';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      method: toolConfig.method.toUpperCase(),
      headers,
      body: body !== undefined && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(toolConfig.method.toUpperCase())
        ? (typeof body === 'string' ? body : JSON.stringify(body))
        : undefined,
      redirect: 'error',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') || '';
  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_RESPONSE_BYTES) {
    throw new Error(\`Response too large: \${contentLength} bytes (max \${MAX_RESPONSE_BYTES})\`);
  }

  let data;
  if (contentType.includes('application/json')) {
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error(\`Response body too large: \${text.length} bytes (max \${MAX_RESPONSE_BYTES})\`);
    }
    data = JSON.parse(text);
  } else {
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error(\`Response body too large: \${text.length} bytes (max \${MAX_RESPONSE_BYTES})\`);
    }
    data = text;
  }

  return { status: response.status, statusText: response.statusText, data, ok: response.ok };
}
`;
}

function generateToolsConfig(tools) {
  const toolConfigs = tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    method: tool.method,
    pathTemplate: tool.pathTemplate,
    executionParameters: tool.executionParameters,
    requestBodyContentType: tool.requestBodyContentType,
    baseUrl: tool.baseUrl,
    tags: tool.tags,
    operationId: tool.operationId,
    riskLevel: tool.riskLevel,
    requiresApproval: tool.requiresApproval,
    allowedInInspector: tool.allowedInInspector,
    enabledByDefault: tool.enabledByDefault,
  }));

  return `// Tool configurations extracted from OpenAPI spec
// Generated: ${new Date().toISOString()}

export const toolConfigs = ${JSON.stringify(toolConfigs, null, 2)};

// Create a map for quick lookup
export const toolConfigMap = new Map(toolConfigs.map(t => [t.name, t]));
`;
}

function generateServerIndex(serverName, tools, baseUrl, port) {
  // Generate tool registration code using proper MCP format
  const toolRegistrations = tools.map(tool => {
    return `
// ${tool.description}
server.tool(
  {
    name: '${tool.name}',
    description: '${tool.description.replace(/'/g, "\\'")}',
    schema: ${tool.zodSchema},
  },
  async (params) => {
    const toolConfig = toolConfigMap.get('${tool.name}');
    checkToolPolicy(toolConfig);
    const result = await executeRequest(toolConfig, params, apiConfig);

    if (!result.ok) {
      return text(\`Error: \${result.status} \${result.statusText}\\n\${
        typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)
      }\`);
    }

    // Return MCP content based on response type
    if (typeof result.data === 'string') {
      return text(result.data);
    } else if (typeof result.data === 'object' && result.data !== null) {
      return object(result.data);
    } else {
      return text(String(result.data));
    }
  }
);`;
  }).join('\n');

  return `#!/usr/bin/env node

/**
 * ${serverName} - MCP Server
 *
 * Features:
 * - ${tools.length} API tools available
 * - Built-in Inspector at http://localhost:${port}/inspector
 */

import 'dotenv/config';
import { MCPServer } from 'mcp-use/server';
import { text, object } from 'mcp-use/server';
import { z } from 'zod';
import { executeRequest } from './http-client.js';
import { toolConfigMap } from './tools-config.js';
import { assertAllowedBaseUrl, checkToolPolicy } from './policy.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '${port}');
const isDev = process.env.NODE_ENV !== 'production';

// API configuration
const apiConfig = {
  baseUrl: process.env.API_BASE_URL || ${baseUrl ? `'${baseUrl}'` : 'null'},
  headers: {},
};

// Set up authentication headers
if (process.env.API_KEY) {
  apiConfig.headers['Authorization'] = \`Bearer \${process.env.API_KEY}\`;
}

if (process.env.API_AUTH_HEADER) {
  const [key, ...valueParts] = process.env.API_AUTH_HEADER.split(':');
  const value = valueParts.join(':'); // Handle values with colons
  if (key && value) {
    apiConfig.headers[key.trim()] = value.trim();
  }
}

// Validate API base URL against allowed hosts
if (apiConfig.baseUrl) {
  assertAllowedBaseUrl(apiConfig.baseUrl);
}

// ============================================================================
// Server Setup
// ============================================================================

const server = new MCPServer({
  name: '${serverName}',
  version: '1.0.0',
  description: 'MCP server generated from OpenAPI specification',
  baseUrl: process.env.MCP_URL || \`http://localhost:\${PORT}\`,
  allowedOrigins: isDev
    ? undefined  // Development: allow all origins
    : process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) || [],
});

// ============================================================================
// Tool Registrations
// ============================================================================
${toolRegistrations}

// ============================================================================
// Start Server
// ============================================================================

server.listen(PORT);

console.log(\`
🚀 ${serverName} MCP Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Server:    http://localhost:\${PORT}
🔍 Inspector: http://localhost:\${PORT}/inspector
📡 MCP:       http://localhost:\${PORT}/mcp
🔄 SSE:       http://localhost:\${PORT}/sse

🛠️  Tools Available: ${tools.length}
${tools.slice(0, 5).map(t => `   • ${t.name}`).join('\n')}${tools.length > 5 ? `\n   ... and ${tools.length - 5} more` : ''}
Environment: \${isDev ? 'Development' : 'Production'}
API Base:    \${apiConfig.baseUrl || 'Not configured'}
Security: ALLOW_RESTRICTED_TOOLS=\${process.env.ALLOW_RESTRICTED_TOOLS || 'false'}, REQUIRE_APPROVALS=\${process.env.REQUIRE_APPROVALS || 'true'}
\`);
`;
}

function generateReadme(serverName, tools, specPath, baseUrl, port) {
  const toolList = tools
    .map(t => `| \`${t.name}\` | ${t.method.toUpperCase()} | ${t.pathTemplate} | ${t.description.substring(0, 50)}${t.description.length > 50 ? '...' : ''} |`)
    .join('\n');

  return `# ${serverName}

MCP server auto-generated from OpenAPI specification using the [mcp-use](https://mcp-use.com) framework.

## Features

- 🛠️ **${tools.length} API Tools** - All operations from the OpenAPI spec
- 🔍 **Built-in Inspector** - Test tools at \`/inspector\`
- 📡 **Streamable HTTP** - Modern MCP transport
- 🔐 **Authentication Support** - Bearer tokens & custom headers
- 🎨 **UI Widgets** - Compatible with ChatGPT and MCP-UI

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API credentials

# Start the server
npm start

# Or with hot reload
npm run dev
\`\`\`

Then open http://localhost:${port}/inspector to test your tools!

## Security

This server enforces a three-layer security policy:

**Generation-time classification** — every tool is classified as \`low\`, \`medium\`, or \`high\` risk.
Read-only (\`GET\`/\`HEAD\`/\`OPTIONS\`) endpoints are \`low\` risk and enabled by default.
Mutating endpoints (\`POST\`/\`PUT\`/\`PATCH\`/\`DELETE\`) are \`medium\` risk and blocked unless \`ALLOW_RESTRICTED_TOOLS=true\`.
Operations matching admin, payment, auth, billing, or credential patterns are \`high\` risk.

**Runtime policy enforcement** — \`checkToolPolicy()\` runs before every API call and enforces the risk level and approval requirements set via environment variables.

**HTTP hardening** — request timeouts, response size caps, redirect blocking, and credential header protection are enforced on every outbound request. Tool arguments cannot override \`Authorization\`, \`Cookie\`, or other credential headers.

> **Inspector note**: The built-in inspector at \`/inspector\` exposes all registered tools. In production, restrict inspector access using a reverse proxy or firewall rule, and set \`NODE_ENV=production\`.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| \`PORT\` | Server port | ${port} |
| \`NODE_ENV\` | Environment (development/production) | development |
| \`API_BASE_URL\` | Base URL for API requests | ${baseUrl || 'From OpenAPI spec'} |
| \`API_KEY\` | Bearer token for Authorization header | - |
| \`API_AUTH_HEADER\` | Custom auth header (format: \`Header:value\`) | - |
| \`MCP_URL\` | Public MCP server URL (for widgets) | http://localhost:${port} |
| \`ALLOWED_ORIGINS\` | Allowed origins in production (comma-separated) | - |
| \`ALLOW_RESTRICTED_TOOLS\` | Allow medium/high-risk mutating tools | false |
| \`REQUIRE_APPROVALS\` | Require explicit approval for restricted tools | true |
| \`ALLOWED_API_HOSTS\` | Comma-separated allowed API hostnames | (spec's host) |
| \`REQUEST_TIMEOUT_MS\` | Outbound request timeout in ms | 30000 |
| \`MAX_RESPONSE_BYTES\` | Maximum response body size in bytes | 10485760 |

## Connect to Claude Desktop

Add to your Claude Desktop configuration:

**macOS**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
**Windows**: \`%APPDATA%\\Claude\\claude_desktop_config.json\`

\`\`\`json
{
  "mcpServers": {
    "${serverName}": {
      "url": "http://localhost:${port}/mcp"
    }
  }
}
\`\`\`

## Connect to ChatGPT

This server supports the OpenAI Apps SDK. Configure your ChatGPT integration to use:

\`\`\`
http://localhost:${port}/mcp
\`\`\`

## Available Tools

| Tool | Method | Path | Description |
|------|--------|------|-------------|
${toolList}

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| \`GET /inspector\` | Interactive tool testing UI |
| \`POST /mcp\` | MCP protocol endpoint |
| \`GET /sse\` | Server-Sent Events endpoint |
| \`GET /health\` | Health check endpoint |

## Project Structure

\`\`\`
${serverName}/
├── .env              # Environment configuration
├── .env.example      # Example environment file
├── package.json      # Dependencies
├── README.md         # This file
└── src/
    ├── index.js        # Main server with MCP tool registrations
    ├── http-client.js  # HTTP utilities for API calls
    ├── tools-config.js # Tool configurations from OpenAPI spec
    └── policy.js       # Runtime security policy (tool policy, header sanitization)
\`\`\`

## How It Works

Each tool is registered using the proper MCP format:

\`\`\`javascript
server.tool(
  {
    name: 'getPetById',
    description: 'Find pet by ID',
    schema: z.object({
      petId: z.number().int().describe('ID of pet to return'),
    }),
  },
  async (params) => {
    // Fetch data from the API
    const result = await executeRequest(toolConfig, params, apiConfig);

    // Return MCP content (text or object)
    return result.ok ? object(result.data) : text(\`Error: \${result.status}\`);
  }
);
\`\`\`

## Production Deployment

### Docker

\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV NODE_ENV=production
EXPOSE ${port}
CMD ["npm", "start"]
\`\`\`

### PM2

\`\`\`bash
pm2 start src/index.js --name ${serverName}
\`\`\`

## Source

- **OpenAPI Spec**: \`${specPath}\`
- **Generated**: ${new Date().toISOString()}
- **Framework**: [mcp-use](https://mcp-use.com)

## License

MIT
`;
}

// ============================================================================
// Main Generator
// ============================================================================

async function generateMcpServer(specPathOrUrl, outputFolder, options = {}) {
  const {
    baseUrl,
    serverName = 'openapi-mcp-server',
    port = 3000,
  } = options;

  console.log(`\n📖 Loading OpenAPI spec: ${specPathOrUrl}`);
  const spec = await loadOpenApiSpec(specPathOrUrl);

  console.log(`   Title: ${spec.info?.title || 'Unknown'}`);
  console.log(`   Version: ${spec.info?.version || 'Unknown'}`);

  const tools = extractTools(spec, { baseUrl, ...options });
  console.log(`✅ Extracted ${tools.length} tools\n`);

  // Create directory structure
  const srcDir = path.join(outputFolder, 'src');
  await fs.mkdir(srcDir, { recursive: true });

  const effectiveBaseUrl = baseUrl || tools[0]?.baseUrl;

  // Generate all files
  const files = [
    {
      path: path.join(outputFolder, 'package.json'),
      content: generatePackageJson(serverName, tools, port)
    },
    {
      path: path.join(outputFolder, '.env'),
      content: generateEnvFile(effectiveBaseUrl, port)
    },
    {
      path: path.join(outputFolder, '.env.example'),
      content: generateEnvExampleFile(effectiveBaseUrl, port)
    },
    {
      path: path.join(srcDir, 'policy.js'),
      content: generatePolicy()
    },
    {
      path: path.join(srcDir, 'http-client.js'),
      content: generateHttpClient()
    },
    {
      path: path.join(srcDir, 'tools-config.js'),
      content: generateToolsConfig(tools)
    },
    {
      path: path.join(srcDir, 'index.js'),
      content: generateServerIndex(serverName, tools, effectiveBaseUrl, port)
    },
    {
      path: path.join(outputFolder, 'README.md'),
      content: generateReadme(serverName, tools, specPathOrUrl, effectiveBaseUrl, port)
    },
    {
      path: path.join(outputFolder, '.gitignore'),
      content: 'node_modules/\n.env\n*.log\n'
    },
  ];

  for (const file of files) {
    await fs.writeFile(file.path, file.content);
    console.log(`  ✓ ${path.relative(outputFolder, file.path)}`);
  }

  console.log(`
🎉 MCP-Use Server Generated
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


  cd ${outputFolder}
  npm install
  npm start

Then open http://localhost:${port}/inspector to test your tools!
`);

  return {
    outputFolder,
    toolCount: tools.length,
    tools: tools.map(t => t.name),
    port,
  };
}

// ============================================================================
// Exports & CLI
// ============================================================================

export { generateMcpServer, extractTools, loadOpenApiSpec };

// CLI entry point
const isMainModule = process.argv[1]?.includes('api2ai');

if (isMainModule) {
  const args = process.argv.slice(2);

  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log(`
OpenAPI to MCP Server Generator (mcp-use framework)

Usage:
  npx api2ai <openapi-spec> [output-folder] [options]

Arguments:
  openapi-spec    Path to local file or URL to remote OpenAPI spec
  output-folder   Directory to create the server in (default: ./mcp-server)

Options:
  --name <name>            Server name (default: openapi-mcp-server)
  --base-url <url>         Override API base URL from the spec
  --port <port>            Server port (default: 3000)
  --allow-mutations        Enable POST/PUT/PATCH/DELETE tools by default
  --include-tags <tags>    Only include tools with these tags (comma-separated)
  --exclude-tags <tags>    Exclude tools with these tags (comma-separated)
  --approve-writes         Disable approval requirement for restricted tools
  --help, -h               Show this help message

Examples:
  npx api2ai ./petstore.json ./my-server
  npx api2ai https://petstore3.swagger.io/api/v3/openapi.json ./petstore-mcp \\
    --name petstore-api --port 8080
`);
    process.exit(0);
  }

  const options = {
    specPath: args[0],
    outputFolder: './mcp-server',
    baseUrl: null,
    serverName: 'api-mcp-server',
    port: 3000,
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--base-url' && args[i + 1]) {
      options.baseUrl = args[++i];
    } else if (args[i] === '--name' && args[i + 1]) {
      options.serverName = args[++i];
    } else if (args[i] === '--port' && args[i + 1]) {
      options.port = parseInt(args[++i]);
    } else if (args[i] === '--allow-mutations') {
      options.allowMutations = true;
    } else if (args[i] === '--include-tags' && args[i + 1]) {
      options.includeTags = args[++i].split(',').map(s => s.trim());
    } else if (args[i] === '--exclude-tags' && args[i + 1]) {
      options.excludeTags = args[++i].split(',').map(s => s.trim());
    } else if (args[i] === '--approve-writes') {
      options.requireApprovals = false;
    } else if (!args[i].startsWith('--')) {
      options.outputFolder = args[i];
    }
  }

  generateMcpServer(options.specPath, options.outputFolder, options).catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });
}
