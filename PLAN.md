# AI Receptionist Prototype - Unified Implementation Plan (SECURITY REVIEWED)

**Created:** 2025-01-XX  
**Status:** ✅ **SAFE TO IMPLEMENT** - All critical security issues fixed  
**Timeline:** 2 weeks (Week 1: Voice MVP, Week 2: GoHighLevel Integration)  
**Review Status:** All 7 critical issues from security review addressed

---

## 🎯 Executive Summary

This unified plan combines the strategic vision of PROTOTYPE.md with the tactical implementation details of CLAUDE_PROTOTYPE.md, incorporating all architectural decisions and clarifications from our discussions. **All critical security and runtime issues identified in the review have been fixed.**

### Key Decisions Made

1. **SDK Approach:** Use `@openai/agents` SDK as primary, with raw WebSocket understanding as fallback
2. **Timeline:** Week 1 = 6 days (realistic), Week 2 = Flexible scope
3. **Database:** Deferred - hard-coded company info for demo, Turso database in Week 3+
4. **Company Context:** Hard-coded config + PDF brief injected as `<company_brief>` tag
5. **Integration:** GoHighLevel via MCP (channel integration pattern for future extensibility)
6. **Models:** `gpt-4o-realtime-preview-2024-12-17` (voice), `gpt-4o-mini` (supervisor)
7. **Debugging:** Include function calls panel and event logging (like Twilio demo)
8. **Session Management:** Session endpoint with ephemeral token authentication
9. **Security:** Authentication, input validation, error handling, session limits

### Critical Fixes Applied

✅ **Issue #1:** Replaced unverified SDK methods with `tool()` helper pattern  
✅ **Issue #2:** Fixed event handling using SDK's `tool()` helper  
✅ **Issue #3:** Added ephemeral token authentication  
✅ **Issue #4:** Added comprehensive error handling  
✅ **Issue #5:** Added input validation and size limits  
✅ **Issue #6:** Improved session management with MAX_SESSIONS and cleanup  
✅ **Issue #7:** Added supervisor iteration limit to prevent infinite loops

---

## 🏗️ Architecture Overview

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                              │
│  - Microphone capture via getUserMedia()                         │
│  - AudioWorklet for PCM16 encoding                               │
│  - WebSocket client for bidirectional streaming                  │
│  - AudioContext for playback                                     │
│  - Function Calls Panel (debugging)                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ WebSocket (PCM16 audio + Realtime events)
                     │ + Ephemeral Token Authentication
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                  EXPRESS SERVER (WebSocket Relay)                │
│  - WebSocket server for browser connections (ws library)         │
│  - Token validation & origin checking                            │
│  - Input validation & size limits                                │
│  - OpenAI Realtime connection (@openai/agents SDK)               │
│  - Bidirectional relay: Browser ↔ Server ↔ OpenAI              │
│  - Agent configuration (hard-coded company info)                 │
│  - Supervisor agent handler (GPT-4o-mini text API)                │
│  - MCP client for GoHighLevel (Week 2)                           │
│  - Session management (MAX_SESSIONS, cleanup)                    │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       │ WebSocket with API key auth
                       │ wss://api.openai.com/v1/realtime
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  OPENAI REALTIME API                             │
│  - Receptionist Agent (gpt-4o-realtime-preview-2024-12-17)      │
│    → Voice I/O, conversation flow                                │
│    → Tool: getNextResponseFromSupervisor (via tool() helper)     │
│  - Audio processing (PCM16, 24kHz)                               │
│  - Turn detection (Server VAD)                                   │
└──────────────────────────────────────────────────────────────────┘
                       │
                       │ Tool calls trigger supervisor
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  SUPERVISOR AGENT (GPT-4o-mini)                  │
│  - Runs in server via OpenAI text API                            │
│  - Max iterations: 10 (prevents infinite loops)                  │
│  - Tools: checkAvailability, bookAppointment (MCP via GHL)       │
│  - Returns responses for receptionist to speak                   │
└──────────────────────────────────────────────────────────────────┘
```

### MCP Integration Architecture

**Design Philosophy:** Native tool passthrough (no normalization layer)

MCP (Model Context Protocol) provides the abstraction layer - we don't need to create one:

```
Supervisor Agent (gpt-4o-mini)
  ↓
MCP Client (connects to multiple MCP servers)
  ↓
  ├── GoHighLevel MCP Server (Week 2 - PRIMARY)
  │   └── Exposes: ghl_create_contact(), ghl_check_calendar(), ghl_send_sms()
  │
  ├── Cal.com MCP Server (Future)
  │   └── Exposes: cal_get_availability(), cal_book_event()
  │
  └── Other integrations (Future)
      └── Each exposes its own native tools
```

**How It Works:**
1. MCP client connects to multiple MCP servers
2. Each server exposes tools with its own native schema
3. Supervisor receives ALL tools from ALL connected servers
4. LLM selects appropriate tool based on descriptions
5. MCP routes the call to the correct server

**Benefits:**
- ✅ No translation layer - each integration uses native API structure
- ✅ Easy to add integrations (just connect new MCP server)
- ✅ Different CRMs can have different capabilities
- ✅ No schema conflicts (ghl_* vs cal_* vs slack_*)
- ✅ Aligned with MCP's design philosophy

**Example:**
```typescript
// Week 2: Connect to GoHighLevel MCP server
const mcpClient = new MCPClient();
await mcpClient.connect('gohighlevel-mcp-server');

// Supervisor automatically gets GHL tools:
// - ghl_create_contact(name, phone, email, ...)
// - ghl_check_calendar(location_id, start, end)
// - ghl_send_sms(phone, message)

// Future: Add more MCP servers
await mcpClient.connect('calcom-mcp-server');
// Now supervisor has BOTH ghl_* AND cal_* tools
```

### Technology Stack

**Client:**
- Next.js 16 (App Router)
- TypeScript
- Web Audio API (AudioWorklet, AudioContext)
- Native WebSocket client

**Server:**
- Node.js 20+
- Express.js
- TypeScript
- `@openai/agents` SDK (primary)
- `ws` library (WebSocket server + fallback)
- `openai` v4+ SDK (for GPT-4 supervisor)
- Zod (schema validation)

**Key Dependencies:**
```bash
# Server
cd server
npm install @openai/agents ws zod openai uuid
npm install --save-dev @types/ws @types/uuid

# Client
cd app
npm install zod
# No additional packages needed - using native WebSocket
```

---

## 📋 Week 1: Core Voice Pipeline (Days 1-6)

### Day 1-2: Server Foundation & OpenAI Integration

#### 1.1 Install Dependencies

```bash
cd server
npm install @openai/agents ws zod openai uuid
npm install --save-dev @types/ws @types/uuid
```

#### 1.2 Create Demo Company Configuration

**File:** `server/src/config/demoCompany.ts` (new)

```typescript
// Hard-coded company info for demo (no database needed)
export const DEMO_COMPANY_CONFIG = {
  name: "Prime Auto Lab",
  phone: "(555) 123-4567",
  email: "info@primeautolab.com",
};

// Hard-coded company brief (PDF text would go here)
// For demo, this is manually entered. Later: PDF extraction
export const DEMO_COMPANY_BRIEF = `
Prime Auto Lab is a premium automotive repair shop specializing in quality service and customer satisfaction.

SERVICES:
- Oil changes (30 minutes, $50-80)
- Brake repair (2 hours, $150-400)
- Tire services (1 hour, $100-600)
- Engine diagnostics (90 minutes, $100-200)
- General maintenance (45 minutes, $80-300)
- Air conditioning service (1 hour, $150-250)
- Battery replacement (30 minutes, $100-200)

BUSINESS HOURS:
- Monday - Friday: 8:00 AM - 6:00 PM
- Saturday: 9:00 AM - 4:00 PM
- Sunday: Closed

LOCATION:
123 Main Street, Your City, ST 12345

POLICIES:
- Appointments recommended but walk-ins welcome
- 24-hour cancellation policy
- Warranty: 12 months / 12,000 miles on repairs
- Payment: Cash, credit cards, Apple Pay accepted
- Financing available through partner

COMMON QUESTIONS:
- "How long does an oil change take?" → Usually 30-45 minutes
- "Do you do inspections?" → Yes, free multi-point inspection with service
- "Do you work on [brand]?" → We service all makes and models
- "Do you offer shuttles?" → Yes, complimentary shuttle within 10 miles
`;
```

#### 1.3 Create Receptionist Agent Configuration (FIXED)

**File:** `server/src/agents/receptionist.ts` (new)

```typescript
import { RealtimeAgent, tool } from '@openai/agents/realtime';
import { DEMO_COMPANY_CONFIG, DEMO_COMPANY_BRIEF } from '../config/demoCompany';
import { getSupervisorResponse } from './supervisor';

// ✅ FIXED: Use tool() helper instead of manual tool definition
const getNextResponseFromSupervisor = tool({
  name: 'getNextResponseFromSupervisor',
  description: 'Get a response from the supervisor agent for complex queries like pricing, availability, or appointment booking. Use this when you need to check calendars, databases, or provide detailed information you don\'t have.',
  parameters: {
    type: 'object',
    properties: {
      relevantContextFromLastUserMessage: {
        type: 'string',
        description: 'Key information from the most recent user message. Provide context the supervisor needs to answer the question.',
      },
    },
    required: ['relevantContextFromLastUserMessage'],
  },
  execute: async (input, details) => {
    const { relevantContextFromLastUserMessage } = input;

    // SDK provides conversation history automatically
    const history = details?.context?.history ?? [];

    try {
      const response = await getSupervisorResponse(history, relevantContextFromLastUserMessage);
      return { nextResponse: response };
    } catch (error) {
      console.error('Supervisor error:', error);
      return {
        nextResponse: "I apologize, I'm having trouble processing that. Could you rephrase your question?",
      };
    }
  },
});

export function createReceptionistAgent(): RealtimeAgent {
  const instructions = `
You are a professional AI receptionist for ${DEMO_COMPANY_CONFIG.name}.

<company_brief>
${DEMO_COMPANY_BRIEF}
</company_brief>

Your role:
- Greet callers warmly: "Hello, thank you for calling ${DEMO_COMPANY_CONFIG.name}. How can I help you today?"
- Use the company brief above to answer questions about:
  * Services offered and pricing
  * Business hours and location
  * Policies and procedures
  * Common questions
- Collect caller information: name, phone number, reason for calling
- For complex queries (appointments, availability, detailed pricing), say "Let me check that for you" and use the getNextResponseFromSupervisor tool
- Maintain professional, helpful tone
- If information isn't in the brief, say "Let me check that for you" and use supervisor tool

Company Contact Info:
- Phone: ${DEMO_COMPANY_CONFIG.phone}
- Email: ${DEMO_COMPANY_CONFIG.email}

When you need the supervisor's help, call getNextResponseFromSupervisor with context from the user's message.
`;

  return new RealtimeAgent({
    name: 'receptionist',
    voice: 'sage',
    instructions,
    tools: [getNextResponseFromSupervisor],
  });
}
```

#### 1.4 Create Supervisor Agent (FIXED)

**File:** `server/src/agents/supervisor.ts` (new)

```typescript
import OpenAI from 'openai';
import { z } from 'zod';
import { DEMO_COMPANY_CONFIG } from '../config/demoCompany';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ FIXED: Added iteration limit to prevent infinite loops
const MAX_SUPERVISOR_ITERATIONS = 10;

// Mock tool schemas for Week 1 testing
// Week 2: Replace with real GHL tools via MCP (ghl_create_contact, ghl_check_calendar, etc.)
// MCP servers expose their native schemas - no normalization needed
const checkAvailabilitySchema = z.object({
  start: z.string().describe('Start date/time in ISO 8601 UTC format'),
  end: z.string().describe('End date/time in ISO 8601 UTC format'),
  serviceType: z.string().describe('Service type (e.g., oil change, brake repair)'),
  timeZone: z.string().optional().describe('IANA timezone'),
});

const bookAppointmentSchema = z.object({
  date: z.string(),
  time: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  serviceType: z.string(),
  notes: z.string().optional(),
});

const lookupCustomerSchema = z.object({
  phone: z.string().describe('Customer phone number'),
});

// Mock tool implementations for Week 1 testing
// Week 2: These will be replaced by MCP tools from GoHighLevel server
async function checkAvailability(params: z.infer<typeof checkAvailabilitySchema>) {
  // TODO: Week 2 - Use MCP client to call ghl_check_calendar()
  return {
    status: 'success',
    availableSlots: [
      { time: '09:00', available: true },
      { time: '11:00', available: true },
      { time: '14:00', available: true },
      { time: '16:00', available: true },
    ],
    message: 'Mock data - will be replaced with GoHighLevel MCP',
  };
}

async function bookAppointment(params: z.infer<typeof bookAppointmentSchema>) {
  // TODO: Week 2 - Use MCP client to call ghl_book_appointment()
  return {
    confirmationNumber: 'MOCK-' + Math.random().toString(36).substring(7).toUpperCase(),
    appointment: params,
    message: 'Appointment booked successfully (MOCK)',
  };
}

async function lookupCustomer(params: z.infer<typeof lookupCustomerSchema>) {
  // TODO: Week 2 - Use MCP client to call ghl_get_contact()
  return {
    found: false,
    message: 'Customer lookup not yet implemented',
  };
}

export async function getSupervisorResponse(
  conversationHistory: any[],
  context?: string
): Promise<string> {
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: 'function',
      function: {
        name: 'checkAvailability',
        description: 'Check available appointment slots for a given date and service type',
        parameters: checkAvailabilitySchema,
      },
    },
    {
      type: 'function',
      function: {
        name: 'bookAppointment',
        description: 'Book an appointment for a customer',
        parameters: bookAppointmentSchema,
      },
    },
    {
      type: 'function',
      function: {
        name: 'lookupCustomer',
        description: 'Look up customer information by phone number',
        parameters: lookupCustomerSchema,
      },
    },
  ];

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are the supervisor agent for ${DEMO_COMPANY_CONFIG.name}'s AI receptionist system.

Your role:
- Handle complex queries that the receptionist agent defers to you
- Use tools to check availability, book appointments, lookup customers
- Provide accurate, detailed information
- Format responses in a way the receptionist can read naturally to the caller

When calling tools:
- checkAvailability: Use this before booking appointments
- bookAppointment: Only after confirming availability and getting customer details
- lookupCustomer: Check if we have history with this customer

Return responses that the receptionist can speak verbatim to the caller. Keep responses brief (2-3 sentences max) and conversational.`,
    },
    {
      role: 'user',
      content: `Conversation: ${JSON.stringify(conversationHistory)}\n\nContext: ${context || 'None'}`,
    },
  ];

  let iterations = 0;

  try {
    let response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;

    // ✅ FIXED: Added iteration limit to prevent infinite loops
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      iterations++;

      if (iterations > MAX_SUPERVISOR_ITERATIONS) {
        console.error('Supervisor exceeded max iterations');
        return 'I apologize, but I encountered an issue processing your request. Please try again or rephrase your question.';
      }

      messages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        try {
          // ✅ FIXED: Error handling for JSON parsing
          const args = JSON.parse(toolCall.function.arguments);
          let toolResult;

          switch (toolCall.function.name) {
            case 'checkAvailability':
              toolResult = await checkAvailability(args);
              break;
            case 'bookAppointment':
              toolResult = await bookAppointment(args);
              break;
            case 'lookupCustomer':
              toolResult = await lookupCustomer(args);
              break;
            default:
              toolResult = { error: 'Unknown tool' };
          }

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          console.error('Tool execution error:', error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: 'Tool execution failed' }),
          });
        }
      }

      // Get next response
      response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
      });

      assistantMessage = response.choices[0].message;
    }

    return assistantMessage.content || 'I apologize, I couldn\'t process that request.';
  } catch (error: any) {
    console.error('Supervisor agent error:', error);

    // ✅ FIXED: Specific error handling
    if (error.code === 'rate_limit_exceeded') {
      return 'Our system is experiencing high demand. Please try again in a moment.';
    } else if (error.code === 'invalid_api_key') {
      console.error('CRITICAL: Invalid OpenAI API key');
      return 'I apologize, we\'re experiencing technical difficulties. Please call back later.';
    }

    return 'I apologize, I\'m having trouble processing that request. Could you rephrase?';
  }
}
```

#### 1.5 Implement Realtime Session Service (FIXED)

**File:** `server/src/services/realtimeSession.ts` (new)

```typescript
import { RealtimeSession } from '@openai/agents';
import { OpenAIRealtimeWebSocket } from '@openai/agents';
import { WebSocket } from 'ws';
import { createReceptionistAgent } from '../agents/receptionist';

type SessionData = {
  sessionId: string;
  openaiSession: RealtimeSession;
  clientWebSocket: WebSocket;
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'closing' | 'closed';
};

// ✅ FIXED: Added session limits
const MAX_SESSIONS = 100;
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes

const sessions = new Map<string, SessionData>();

// ✅ FIXED: Session cleanup function
function cleanupInactiveSessions(): void {
  const now = new Date();
  for (const [id, session] of sessions.entries()) {
    const inactive = now.getTime() - session.lastActivity.getTime();
    if (inactive > SESSION_TTL || session.status === 'closed') {
      console.log('Cleaning up inactive session:', id);
      cleanupSession(id);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupInactiveSessions, 60 * 1000);

export async function createRealtimeSession(
  sessionId: string,
  clientWebSocket: WebSocket,
  apiKey: string
): Promise<SessionData> {
  // ✅ FIXED: Enforce max sessions
  if (sessions.size >= MAX_SESSIONS) {
    throw new Error('Server at capacity');
  }

  const agent = createReceptionistAgent();

  try {
    // Use SDK's OpenAIRealtimeWebSocket transport
    const session = new RealtimeSession(agent, {
      transport: new OpenAIRealtimeWebSocket(),
    });

    await session.connect({ apiKey });

    // ✅ FIXED: Use correct event names (not generic 'event')
    // Handle audio output from OpenAI
    session.on('audio', (audioData) => {
      if (clientWebSocket.readyState === WebSocket.OPEN) {
        clientWebSocket.send(audioData);
      }
    });

    // Handle conversation updates
    session.on('history_updated', (history) => {
      if (clientWebSocket.readyState === WebSocket.OPEN) {
        clientWebSocket.send(JSON.stringify({
          type: 'history_updated',
          history,
        }));
      }
    });

    // Handle transport events (transcriptions, etc.)
    session.on('transport_event', (event) => {
      if (clientWebSocket.readyState === WebSocket.OPEN) {
        clientWebSocket.send(JSON.stringify(event));
      }
    });

    const sessionData: SessionData = {
      sessionId,
      openaiSession: session,
      clientWebSocket,
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'active',
    };

    sessions.set(sessionId, sessionData);
    console.log('Active sessions:', sessions.size);
    return sessionData;
  } catch (error) {
    console.error('Failed to create session:', error);
    throw error;
  }
}

export function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

export function cleanupSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.status = 'closing';

    try {
      session.openaiSession.disconnect();
    } catch (error) {
      console.error('Error disconnecting OpenAI session:', error);
    }

    if (session.clientWebSocket.readyState === WebSocket.OPEN) {
      session.clientWebSocket.close();
    }

    sessions.delete(sessionId);
    session.status = 'closed';
    console.log('Session cleaned up:', sessionId, '- Active sessions:', sessions.size);
  }
}

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  for (const [id, _] of sessions.entries()) {
    cleanupSession(id);
  }
  process.exit(0);
});
```

#### 1.6 Update Session Endpoint (FIXED - Added Token Generation)

**File:** `server/src/routes/sessions.ts` (update)

```typescript
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// ✅ FIXED: Generate ephemeral tokens for authentication
// In production, store tokens in database with expiry
const tokens = new Map<string, { expiresAt: number; used: boolean }>();

// Cleanup expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokens.entries()) {
    if (data.expiresAt < now) {
      tokens.delete(token);
    }
  }
}, 5 * 60 * 1000);

// POST /api/sessions
// Returns: { sessionId: string, token: string }
router.post('/', (req, res) => {
  try {
    const sessionId = uuidv4();
    
    // Generate ephemeral token (expires in 60 seconds)
    const token = `ek_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = Date.now() + 60 * 1000; // 60 seconds
    
    tokens.set(token, { expiresAt, used: false });
    
    res.json({ sessionId, token });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// ✅ FIXED: Token validation function (exported for use in WebSocket route)
export function validateEphemeralToken(token: string): boolean {
  const tokenData = tokens.get(token);
  
  if (!tokenData) {
    return false; // Token doesn't exist
  }
  
  if (tokenData.used) {
    return false; // Token already used
  }
  
  if (tokenData.expiresAt < Date.now()) {
    tokens.delete(token);
    return false; // Token expired
  }
  
  // Mark token as used
  tokenData.used = true;
  return true;
}

export default router;
```

#### 1.7 Update WebSocket Route (FIXED - Added Security)

**File:** `server/src/routes/websocket.ts` (update)

```typescript
import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import { createRealtimeSession, cleanupSession, getSession } from '../services/realtimeSession';
import { validateEphemeralToken } from './sessions';

// ✅ FIXED: Input validation limits
const MAX_MESSAGE_SIZE = 10 * 1024; // 10KB for control messages
const MAX_AUDIO_CHUNK = 100 * 1024; // 100KB for audio

// ✅ FIXED: Origin checking
function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;

  const allowed = [
    'http://localhost:3000',
    'http://localhost:3001',
    // Add production domains here
    // 'https://yourdomain.com',
  ];

  return allowed.includes(origin);
}

export function setupWebSocketServer(server: Server, apiKey: string) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', async (clientWs: WebSocket, req: IncomingMessage) => {
    console.log('Connection attempt from:', req.socket.remoteAddress);

    // ✅ FIXED: Validate token
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token || !validateEphemeralToken(token)) {
      console.warn('Unauthorized connection attempt');
      clientWs.close(1008, 'Unauthorized');
      return;
    }

    // ✅ FIXED: Check origin
    const origin = req.headers.origin;
    if (!isAllowedOrigin(origin)) {
      console.warn('Forbidden origin:', origin);
      clientWs.close(1008, 'Forbidden');
      return;
    }

    const sessionId = url.searchParams.get('sessionId') || `session-${Date.now()}`;

    try {
      await createRealtimeSession(sessionId, clientWs, apiKey);
      console.log('Session created:', sessionId);

      // Handle messages from client
      clientWs.on('message', async (data: Buffer) => {
        const session = getSession(sessionId);
        if (!session || session.status !== 'active') {
          return;
        }

        try {
          // ✅ FIXED: Validate message size
          if (data.length > MAX_MESSAGE_SIZE && data[0] === 0x7b) {
            console.warn('Message too large:', data.length);
            clientWs.close(1009, 'Message too large');
            return;
          }

          if (data[0] === 0x7b) { // JSON (starts with '{')
            // ✅ FIXED: Safe JSON parse with error handling
            let event;
            try {
              event = JSON.parse(data.toString());
            } catch (error) {
              console.error('Invalid JSON:', error);
              clientWs.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format',
              }));
              return;
            }

            // ✅ FIXED: Validate event structure
            if (!event.type || typeof event.type !== 'string') {
              clientWs.send(JSON.stringify({
                type: 'error',
                message: 'Invalid event format',
              }));
              return;
            }

            // Note: SDK handles event routing automatically via tool() helper
            // No manual sendEvent() needed
          } else {
            // Binary audio data
            if (data.length > MAX_AUDIO_CHUNK) {
              console.warn('Audio chunk too large:', data.length);
              clientWs.close(1009, 'Audio chunk too large');
              return;
            }

            // ✅ FIXED: Safe audio send with error handling
            try {
              await session.openaiSession.sendAudio(data);
            } catch (error) {
              console.error('Error sending audio:', error);
            }
          }

          session.lastActivity = new Date();
        } catch (error) {
          console.error('Message handling error:', error);
          clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Failed to process message',
          }));
        }
      });

      clientWs.on('close', () => {
        console.log('Client disconnected:', sessionId);
        cleanupSession(sessionId);
      });

      clientWs.on('error', (error) => {
        console.error('WebSocket error:', error);
        cleanupSession(sessionId);
      });
    } catch (error) {
      console.error('Error creating session:', error);
      clientWs.close(1011, 'Internal server error');
    }
  });

  console.log('WebSocket server ready on /ws');
}
```

**Testing Day 1-2:**
- ✅ Server starts without errors
- ✅ WebSocket server listening on `/ws`
- ✅ Token validation working
- ✅ Can connect to OpenAI Realtime API with API key
- ✅ Agent configurations load without TypeScript errors
- ✅ Supervisor agent can be called and returns responses
- ✅ Session limits enforced

---

### Day 3-4: Client Foundation

#### 2.1 Install Dependencies

```bash
cd app
npm install zod
# No other dependencies needed - using native WebSocket
```

#### 2.2 Create WebSocket Connection Hook (UPDATED - Token Support)

**File:** `app/hooks/useRealtimeSession.ts` (new)

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseRealtimeSessionProps {
  onMessage?: (event: any) => void;
  onTranscript?: (role: 'user' | 'assistant', text: string) => void;
  onStatusChange?: (status: string) => void;
  onFunctionCall?: (call: any) => void;
}

export function useRealtimeSession({
  onMessage,
  onTranscript,
  onStatusChange,
  onFunctionCall,
}: UseRealtimeSessionProps = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;

    try {
      setIsConnecting(true);
      setError(null);
      onStatusChange?.('Connecting...');

      // ✅ FIXED: Get session ID and token first
      const res = await fetch('/api/sessions', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to create session');
      }
      const { sessionId, token } = await res.json();
      
      // Connect with token
      const ws = new WebSocket(`ws://localhost:3001/ws?sessionId=${sessionId}&token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to relay server');
        setIsConnected(true);
        setIsConnecting(false);
        onStatusChange?.('Connected');
      };

      ws.onmessage = (event) => {
        try {
          // Handle binary audio data
          if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
            // Audio data - handle separately if needed
            return;
          }

          const data = JSON.parse(event.data);

          // Handle transcript events
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            onTranscript?.('user', data.transcript);
          } else if (data.type === 'response.audio_transcript.done') {
            onTranscript?.('assistant', data.transcript);
          }

          // Handle function calls (for debugging panel)
          if (data.type === 'response.output_item.done' && data.item?.type === 'function_call') {
            onFunctionCall?.(data.item);
          }

          // Forward all events to callback
          onMessage?.(data);
        } catch (err) {
          // Binary audio data - handle separately
          console.error('Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
        setIsConnected(false);
        setIsConnecting(false);
        onStatusChange?.('Error');
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsConnected(false);
        setIsConnecting(false);
        onStatusChange?.('Disconnected');
      };
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnecting(false);
      setIsConnected(false);
      onStatusChange?.('Disconnected');
    }
  }, [isConnecting, isConnected, onMessage, onTranscript, onStatusChange, onFunctionCall]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    onStatusChange?.('Disconnected');
  }, [onStatusChange]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendAudio = useCallback((audioData: ArrayBuffer) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(audioData);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    sendAudio,
    isConnected,
    isConnecting,
    error,
    ws: wsRef.current,
  };
}
```

#### 2.3 Create Audio Worklet Processor

**File:** `app/lib/audioWorklet.ts` (new)

```typescript
// AudioWorklet processor for PCM16 encoding
// This runs in a separate thread for low latency

export function createAudioWorkletProcessor(audioContext: AudioContext): Promise<AudioWorkletNode> {
  const processorCode = `
    class PCM16Processor extends AudioWorkletProcessor {
      constructor() {
        super();
        this.buffer = new Float32Array(480); // 20ms at 24kHz
        this.bufferIndex = 0;
      }

      process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length > 0) {
          const inputChannel = input[0];
          
          for (let i = 0; i < inputChannel.length; i++) {
            this.buffer[this.bufferIndex++] = inputChannel[i];
            
            if (this.bufferIndex >= this.buffer.length) {
              // Convert to PCM16
              const pcm16 = new Int16Array(this.buffer.length);
              for (let j = 0; j < this.buffer.length; j++) {
                const s = Math.max(-1, Math.min(1, this.buffer[j]));
                pcm16[j] = s < 0 ? s * 0x8000 : s * 0x7fff;
              }
              
              // Send to main thread
              this.port.postMessage({ audio: pcm16.buffer });
              this.bufferIndex = 0;
            }
          }
        }
        
        return true;
      }
    }

    registerProcessor('pcm16-processor', PCM16Processor);
  `;

  const blob = new Blob([processorCode], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);

  return audioContext.audioWorklet.addModule(url).then(() => {
    return new AudioWorkletNode(audioContext, 'pcm16-processor');
  });
}
```

#### 2.4 Create Audio Playback Handler

**File:** `app/lib/audioPlayback.ts` (new)

```typescript
// Handle audio playback from OpenAI Realtime API

export class AudioPlayback {
  private audioContext: AudioContext;
  private nextPlayTime: number = 0;
  private queue: ArrayBuffer[] = [];

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async playPCM16(pcm16Data: ArrayBuffer): Promise<void> {
    // Convert PCM16 to Float32Array
    const pcm16 = new Int16Array(pcm16Data);
    const float32 = new Float32Array(pcm16.length);
    
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
    }

    // Create AudioBuffer
    const buffer = this.audioContext.createBuffer(1, float32.length, 24000); // 24kHz
    buffer.copyToChannel(float32, 0);

    // Schedule playback
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += buffer.duration;
  }

  handleAudioDelta(delta: string): void {
    // Decode base64 audio delta from OpenAI
    const binary = atob(delta);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const pcm16 = new Int16Array(bytes.buffer);
    this.playPCM16(pcm16.buffer);
  }
}
```

#### 2.5 Create Function Calls Panel (Debugging)

**File:** `app/components/FunctionCallsPanel.tsx` (new)

```typescript
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type FunctionCall = {
  id: string;
  call_id: string;
  name: string;
  arguments: string;
  status: 'pending' | 'completed';
  output?: string;
};

type FunctionCallsPanelProps = {
  calls: FunctionCall[];
  ws?: WebSocket | null;
};

export function FunctionCallsPanel({ calls, ws }: FunctionCallsPanelProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="space-y-1.5 pb-0">
        <CardTitle className="text-base font-semibold">
          Function Calls (Debug)
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {calls.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No function calls yet
              </p>
            ) : (
              calls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-lg border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{call.name}</h3>
                    <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
                      {call.status === 'completed' ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>

                  <div className="text-sm text-muted-foreground font-mono break-all">
                    <div className="font-semibold mb-1">Arguments:</div>
                    {JSON.stringify(JSON.parse(call.arguments), null, 2)}
                  </div>

                  {call.output && (
                    <div className="text-sm rounded-md bg-muted p-3">
                      <div className="font-semibold mb-1">Response:</div>
                      {JSON.stringify(JSON.parse(call.output), null, 2)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

#### 2.6 Update Test Page

**File:** `app/app/test/page.tsx` (update)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRealtimeSession } from '@/hooks/useRealtimeSession';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { AudioVisualizer } from '@/components/AudioVisualizer';
import { FunctionCallsPanel } from '@/components/FunctionCallsPanel';
import { createAudioWorkletProcessor } from '@/lib/audioWorklet';
import { AudioPlayback } from '@/lib/audioPlayback';

interface TranscriptItem {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface FunctionCall {
  id: string;
  call_id: string;
  name: string;
  arguments: string;
  status: 'pending' | 'completed';
  output?: string;
}

export default function TestPage() {
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [status, setStatus] = useState('Disconnected');
  const [functionCalls, setFunctionCalls] = useState<FunctionCall[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioPlayback, setAudioPlayback] = useState<AudioPlayback | null>(null);

  const { devices, selectedDevice, selectDevice } = useAudioDevices();

  const { connect, disconnect, isConnected, isConnecting, error, sendAudio, ws } = useRealtimeSession({
    onTranscript: (role, text) => {
      setTranscript((prev) => [
        ...prev,
        { role, text, timestamp: new Date() },
      ]);
    },
    onStatusChange: setStatus,
    onFunctionCall: (call) => {
      setFunctionCalls((prev) => [
        ...prev,
        {
          id: call.id || `call-${Date.now()}`,
          call_id: call.call_id || '',
          name: call.name || '',
          arguments: call.arguments || '{}',
          status: 'pending',
        },
      ]);
    },
    onMessage: (event) => {
      // Handle audio playback
      if (event.type === 'response.audio.delta' && audioPlayback) {
        audioPlayback.handleAudioDelta(event.delta);
      }

      // Update function call status
      if (event.type === 'conversation.item.created' && event.item?.type === 'function_call_output') {
        setFunctionCalls((prev) =>
          prev.map((call) =>
            call.call_id === event.item.call_id
              ? { ...call, status: 'completed', output: event.item.output }
              : call
          )
        );
      }
    },
  });

  // Initialize audio context
  useEffect(() => {
    const ctx = new AudioContext({ sampleRate: 24000 });
    setAudioContext(ctx);
    setAudioPlayback(new AudioPlayback(ctx));

    return () => {
      ctx.close();
    };
  }, []);

  // Setup audio capture when connected
  useEffect(() => {
    if (!isConnected || !audioContext) return;

    let workletNode: AudioWorkletNode | null = null;
    let mediaStream: MediaStream | null = null;

    const setupAudio = async () => {
      try {
        // Get microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: selectedDevice?.deviceId,
            sampleRate: 24000,
            channelCount: 1,
          },
        });
        mediaStream = stream;

        // Create audio worklet
        workletNode = await createAudioWorkletProcessor(audioContext);
        
        // Connect microphone to worklet
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(workletNode);

        // Send audio chunks to server
        workletNode.port.onmessage = (e) => {
          if (e.data.audio) {
            sendAudio(e.data.audio);
          }
        };
      } catch (err) {
        console.error('Error setting up audio:', err);
      }
    };

    setupAudio();

    return () => {
      if (workletNode) workletNode.disconnect();
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isConnected, audioContext, selectedDevice, sendAudio]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">AI Receptionist Test</h1>

        {/* Status */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-500">Status: </span>
              <span className={`font-semibold ${
                isConnected ? 'text-green-600' : 'text-gray-600'
              }`}>
                {status}
              </span>
            </div>
            <div className="space-x-2">
              {!isConnected ? (
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isConnecting ? 'Connecting...' : 'Connect'}
                </button>
              ) : (
                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600">
              Error: {error}
            </div>
          )}
        </div>

        {/* Audio Device Selection */}
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium mb-2">
            Microphone
          </label>
          <select
            value={selectedDevice?.deviceId || ''}
            onChange={(e) => {
              const device = devices.find(d => d.deviceId === e.target.value);
              if (device) selectDevice(device);
            }}
            className="w-full p-2 border rounded"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Audio Visualizer */}
        {isConnected && <AudioVisualizer />}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Transcript */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Conversation</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {transcript.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No conversation yet. Click Connect to start.
                </p>
              ) : (
                transcript.map((item, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded ${
                      item.role === 'user'
                        ? 'bg-blue-50 ml-8'
                        : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {item.role === 'user' ? 'You' : 'Assistant'} •{' '}
                      {item.timestamp.toLocaleTimeString()}
                    </div>
                    <div className="text-sm">{item.text}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Function Calls Panel */}
          <FunctionCallsPanel calls={functionCalls} ws={ws} />
        </div>
      </div>
    </div>
  );
}
```

**Testing Day 3-4:**
- ✅ Click "Connect" button
- ✅ Session token generated and validated
- ✅ WebSocket connection established to relay server
- ✅ Relay server connects to OpenAI Realtime API
- ✅ Microphone permission granted
- ✅ Can speak and see user transcription appear
- ✅ AI responds and assistant transcription appears
- ✅ Audio plays through speakers
- ✅ Function calls appear in debug panel

---

### Day 5-6: Integration & Refinement

#### 3.1 End-to-End Testing

- Test full conversation flow
- Verify audio quality (24kHz PCM16)
- Measure latency (target: <500ms round-trip)
- Test interruption handling
- Test error scenarios (network drops, API errors)
- Test authentication (invalid tokens rejected)
- Test session limits (max sessions enforced)

#### 3.2 Optimization

- **Audio Buffering:** Optimize buffer sizes for low latency
- **WebSocket:** Implement message batching if needed
- **Error Handling:** Graceful degradation and user feedback
- **Connection Health:** Ping/pong, reconnection logic

#### 3.3 Presentation Features

- **Visual Feedback:**
  - Connection status indicator
  - Speaking/listening animation
  - Audio level visualization
  - Transcript display (real-time)
  - Function calls panel (debugging)
- **UX Polish:**
  - Loading states
  - Error messages
  - Smooth transitions
  - Professional styling

---

## 📋 Week 2: GoHighLevel Integration (Days 7-14) - Flexible Scope

### Decision Point After Week 1

Once the voice prototype is working, assess:
- How much time is left?
- What's the priority for the business?
- What's realistic to complete in week 2?

### Option A: Basic MCP Integration (2-3 days)

**Goal:** Connect to GoHighLevel via MCP and use native GHL tools.

**Steps:**
1. Install MCP client SDK in server
2. Configure connection to GoHighLevel MCP server
3. Connect MCP client and receive GHL tools:
   - `ghl_create_contact()` - Create new contact
   - `ghl_get_contact()` - Lookup contact by phone/email
   - `ghl_check_calendar()` - Check appointment availability
   - Plus any other tools the GHL MCP server exposes
4. Update supervisor agent to use MCP tools (replace mocks)
5. Test full conversation flow with real GHL integration
6. Document the MCP connection pattern for future integrations

**Key Implementation:**
```typescript
// server/src/services/mcpClient.ts
// ⚠️ NOTE: Verify correct MCP SDK package name when implementing Week 2
// Package name may be: @modelcontextprotocol/sdk, @modelcontextprotocol/client, or similar
import { MCPClient } from '@modelcontextprotocol/sdk';

const mcpClient = new MCPClient();
await mcpClient.connect('gohighlevel-mcp-server');

// Get all tools exposed by GHL MCP server
const ghlTools = await mcpClient.listTools();

// Pass to supervisor agent (native schemas, no translation)
const supervisor = createSupervisorAgent(ghlTools);
```

**Deliverables:**
- Working MCP client connected to GoHighLevel
- Supervisor using native GHL tools (ghl_* functions)
- Real contact creation and calendar checking
- Documentation for adding future MCP servers (Cal.com, Slack, etc.)

### Option B: Lead Capture Integration (4-5 days)

**Goal:** After a call, automatically create/update a contact in GoHighLevel.

**Steps:**
1. Complete Option A (MCP setup with GHL tools)
2. Add call completion handler
3. Create post-call workflow:
   - Extract caller info (name, phone, reason) from transcript
   - Generate AI call summary
   - Use `ghl_create_contact()` or `ghl_update_contact()` via MCP
   - Use `ghl_add_note()` to attach transcript and summary
4. Add UI to view synced contacts
5. Test full flow

**MCP Tools Used:**
- `ghl_create_contact(name, phone, email, source, ...)`
- `ghl_update_contact(contact_id, ...)`
- `ghl_add_note(contact_id, note_text)`
- Any other GHL tools for tagging, pipeline, etc.

**Deliverables:**
- Automatic lead capture after calls
- Call transcripts saved to GoHighLevel via MCP
- Contact enrichment with call data
- Dashboard to verify sync

### Option C: Full Calendar + Leads (Full week)

**Goal:** Real appointment booking with calendar sync.

**Steps:**
1. Complete Options A and B
2. Use GHL calendar tools via MCP:
   - `ghl_check_calendar(location_id, start, end)` - Real-time availability
   - `ghl_book_appointment(contact_id, calendar_id, slot_time, ...)` - Book slots
   - `ghl_send_confirmation_sms(contact_id, appointment_details)` - Confirmations
3. Implement conversation flow for appointment booking
4. Add webhook handlers for GHL calendar updates (if needed)
5. Test two-way sync (GHL → AI, AI → GHL)

**MCP Tools Used:**
- All tools from Options A & B
- Plus: `ghl_check_calendar()`, `ghl_book_appointment()`, `ghl_send_sms()`
- Whatever calendar-related tools GHL MCP server exposes

**Deliverables:**
- Real appointment booking via voice conversation
- Two-way calendar sync through MCP
- Automated SMS/email confirmations
- Complete CRM integration with native GHL tools

---

## 🔧 Technical Details

### WebSocket Architecture

**Why WebSocket (Not WebRTC)?**
- ✅ Required for Twilio integration (future)
- ✅ Server-side control and logging
- ✅ Easier debugging and monitoring
- ✅ Better for production infrastructure
- ✅ Supports both browser and phone calls

**Connection Flow:**
```
1. Client requests session token (POST /api/sessions)
2. Server generates ephemeral token (60s expiry)
3. Client → Server: WebSocket connection with token (ws://localhost:3001/ws?token=...)
4. Server validates token
5. Server → OpenAI: WebSocket connection with API key auth (via @openai/agents SDK)
6. Server: Bidirectional relay established
7. Client ↔ Server ↔ OpenAI: Audio and events relayed
8. Voice conversation begins
```

### Session Management

**In-Memory (Prototype):**
- Active sessions: `Map<sessionId, SessionData>`
- Max sessions: 100 (configurable)
- Real-time events, audio streams
- No database blocking
- Fast connection (<100ms)
- Auto-cleanup after 5min inactivity
- Graceful shutdown handler

**Future (Week 3+):**
- Turso database for persistence
- Call transcripts
- Session metadata
- User data
- Analytics

### Security Features

**Authentication:**
- Ephemeral tokens (60-second expiry)
- Token validation on WebSocket connection
- Origin checking (CORS)
- Token single-use enforcement

**Input Validation:**
- Max message size: 10KB (control messages)
- Max audio chunk: 100KB
- JSON structure validation
- Event type validation

**Error Handling:**
- Try-catch blocks around all async operations
- Specific error messages for rate limits, auth failures
- Graceful degradation
- Comprehensive logging

**Session Limits:**
- Max concurrent sessions: 100
- Session TTL: 5 minutes inactivity
- Automatic cleanup every 60 seconds
- Rejection when at capacity

### Audio Pipeline

**Browser → OpenAI (Upstream):**
```
getUserMedia() → MediaStream → AudioWorklet → PCM16 Encoding → WebSocket → Server → OpenAI
```

**OpenAI → Browser (Downstream):**
```
OpenAI → WebSocket → Server → WebSocket → Browser → PCM16 Decoding → AudioBuffer → Speakers
```

**Key Specifications:**
- Sample rate: 24kHz
- Format: PCM16 (16-bit signed integer)
- Buffer size: 20ms (480 samples)
- Channels: Mono

### Agent Architecture (Chat-Supervisor Pattern)

**Receptionist Agent:**
- Model: `gpt-4o-realtime-preview-2024-12-17` (will upgrade to mini when available)
- Role: Voice I/O, conversation flow, basic info
- Tool: `getNextResponseFromSupervisor` (via `tool()` helper)

**Supervisor Agent:**
- Model: `gpt-4o-mini` (fast, smart, reliable for tool calling)
- Role: Complex reasoning, tool calling
- Max iterations: 10 (prevents infinite loops)
- Tools: `checkAvailability`, `bookAppointment`, `lookupCustomer` (via MCP)

**Benefits:**
- Low latency for simple responses
- High quality for complex responses
- Natural conversation flow
- Scalable (add more tools without changing receptionist)
- Safe (iteration limits prevent hangs)

### Company Context Injection

**Format:**
```typescript
const instructions = `
You are a professional AI receptionist for ${companyConfig.name}.

<company_brief>
${companyBrief}
</company_brief>

[Agent instructions...]
`;
```

**For Demo:**
- Hard-coded in `demoCompany.ts`
- Full brief text injected as-is
- No PDF extraction needed

**Future (Week 3+):**
- PDF upload and extraction
- Structured data extraction via LLM
- Database storage (Turso)
- Multi-company support

---

## 📊 Success Metrics

### Technical Metrics
- ✅ Audio latency: <500ms round-trip
- ✅ Connection stability: >99% uptime
- ✅ Error rate: <1%
- ✅ Tool call success: >95%
- ✅ Authentication success: 100% (valid tokens only)

### Business Metrics (Demo)
- ✅ Natural conversation flow
- ✅ Accurate information from company brief
- ✅ Successful supervisor handoffs
- ✅ Function calls visible in debug panel
- ✅ Secure connections (no unauthorized access)

---

## 🚀 Next Steps After Prototype

1. **Database (Week 3+):** Add Turso database for persistence
2. **PDF Extraction:** Implement PDF parsing and text extraction
3. **Multi-Tenant:** Support multiple companies
4. **Twilio Integration:** Add phone call support
5. **Dashboard:** Build admin dashboard
6. **Analytics:** Track call metrics, success rates
7. **Production Security:** Enhanced token management, rate limiting per IP

---

## 📚 Reference Materials

### Key Reference Files
- `reference/openai-realtime-agents/src/app/hooks/useRealtimeSession.ts` - Session management pattern
- `reference/openai-realtime-agents/src/app/agentConfigs/chatSupervisor/supervisorAgent.ts` - Tool helper pattern
- `reference/openai-realtime-twilio-demo-main/webapp/components/function-calls-panel.tsx` - Debugging tools

### Documentation
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/api-reference/realtime)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [MCP-Powered Voice Agents Cookbook](https://cookbook.openai.com/examples/partners/mcp_powered_voice_agents/mcp_powered_agents_cookbook)
- [GoHighLevel API Docs](https://highlevel.stoplight.io/docs/integrations)

---

## ⚠️ Known Limitations (Prototype Phase)

1. **No Database:** Sessions are in-memory only (tokens stored in memory)
2. **Hard-Coded Company:** Single company for demo
3. **Basic Authentication:** Ephemeral tokens in memory (not production-ready)
4. **No Billing:** No usage tracking
5. **Limited Error Recovery:** Basic error handling (improved but not comprehensive)
6. **Single Language:** English only
7. **No Call Recording:** Audio not persisted

**Note:** These are acceptable for prototype. Will be addressed in production phase.

---

## 🎯 Presentation Checklist

### Pre-Demo Setup
- [ ] Test all demo scenarios
- [ ] Verify GHL integration (if completed)
- [ ] Prepare backup demo (recorded)
- [ ] Test audio quality
- [ ] Test authentication flow
- [ ] Prepare talking points

### During Demo
- [ ] Show connection status
- [ ] Demonstrate natural conversation
- [ ] Show function calls in debug panel
- [ ] Highlight low latency
- [ ] Explain architecture briefly
- [ ] Mention security features

### Post-Demo
- [ ] Q&A preparation
- [ ] Technical deep-dive slides (optional)
- [ ] Cost/benefit analysis
- [ ] Next steps discussion

---

## ✅ Security Review Checklist

All critical issues from security review have been addressed:

- [x] **Issue #1:** Replaced unverified SDK methods with `tool()` helper pattern
- [x] **Issue #2:** Fixed event handling using SDK's `tool()` helper
- [x] **Issue #3:** Added ephemeral token authentication
- [x] **Issue #4:** Added comprehensive error handling
- [x] **Issue #5:** Added input validation and size limits
- [x] **Issue #6:** Improved session management with MAX_SESSIONS and cleanup
- [x] **Issue #7:** Added supervisor iteration limit to prevent infinite loops

---

**Last Updated:** 2025-01-XX  
**Status:** ✅ **SAFE TO IMPLEMENT** - All critical fixes applied  
**Next Action:** Start Day 1-2 tasks (Server Foundation)

