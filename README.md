# AI Receptionist

Voice-enabled AI receptionist using OpenAI's Realtime API for natural phone conversations. Built with Node.js/TypeScript and WebSocket architecture for production Twilio integration.

---

## Current State

### What's Implemented (~30% of MVP Complete)

**Server:**
- [x] Express.js server with TypeScript
- [x] WebSocket server infrastructure (ws library)
- [x] Session management endpoint (ephemeral token creation)
- [x] OpenAI configuration setup
- [x] Health check endpoint
- [ ] `@openai/agents` package (need to install)
- [ ] OpenAI Realtime API connection
- [ ] Agent configurations (receptionist/supervisor)
- [ ] Audio streaming implementation
- [ ] Database integration (Turso/Drizzle)

**Next.js App:**
- [x] Next.js 16 with App Router
- [x] Test page at `/test` route
- [x] Audio device selection hook
- [x] Audio stream management hook
- [x] Audio visualizer component
- [ ] WebSocket client implementation
- [ ] Audio encoding/decoding for transmission
- [ ] OpenAI Realtime integration

**Reference Materials:**
- [x] `reference/openai-realtime-agents/` - OpenAI official example (STUDIED)
- [x] `reference/initial-mvp-reference/` - Initial scaffolding (STUDIED)
- [x] `reference/openai-realtime-twilio-demo-main/` - Twilio patterns (AVAILABLE)

**Next Critical Steps:**
1. Install `@openai/agents` package in server
2. Implement OpenAI Realtime WebSocket connection
3. Create receptionist agent configuration
4. Implement audio streaming (browser → server → OpenAI)
5. Build WebSocket client in frontend

---

## Technical Context

Key architectural and technology decisions for this project.

### WebSocket Approach

**Using WebSocket throughout** (browser → server → OpenAI Realtime API):
- **Rationale:** Learning networking fundamentals + Twilio requires WebSocket
- **Benefit:** ~80% of production infrastructure built from day one
- **Note:** WebRTC exists as alternative for browser-only apps (lower latency, peer-to-peer), but doesn't align with Twilio integration or learning goals

### Session Architecture

**Hot Path (Realtime):** In-memory WebSocket sessions
- No database blocking during active calls
- Session state stored in Map/memory
- Fast connection setup (<100ms)
- Event-driven cleanup on disconnect

**Cold Path (Background):** Database logging & analytics
- Call transcripts, summaries, metadata
- Conversation analysis
- User data, billing records
- Runs after call completion (non-blocking)

### Audio Handling

**Browser Audio:**
- **Web Audio API** for capture and playback
- **AudioWorklet** for processing PCM16 chunks
- **Not MediaSource:** MSE doesn't support raw PCM16 format

**Audio Formats:**
- **PCM16** (16kHz or 24kHz): Browser/web quality audio
- **G.711 μ-law** (8kHz): Twilio/PSTN compatibility for phone calls

**Audio Flow:**
- Browser microphone → `getUserMedia()` → AudioWorklet → PCM16 encoding → WebSocket → Server
- Server → OpenAI Realtime API (WebSocket) → PCM16 response → Server → WebSocket → Browser
- Browser → PCM16 decoding → AudioBufferSource → Speakers

### Missing Dependencies

**Server needs:**
- `@openai/agents` - OpenAI Agents SDK (recommended for Realtime API)
- Provides `RealtimeSession`, `RealtimeAgent`, `OpenAIRealtimeWebSocket`

**Current:** Only `openai` v4.77.3 installed (base SDK)

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                     WebSocket + Voice Interface                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ WebSocket Audio Streaming
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                       NEXT.JS APP                                │
│  - Billing & Payment (Polar)                                     │
│  - User Auth (Google OAuth + Iron Sessions)                      │
│  - Dashboard & Analytics                                         │
│  - Voice Test Client (/test route)                               │
│  - Session Creation                                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ REST API + WebSocket
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                  NODE.JS SERVER (Backend)                        │
│  - OpenAI Realtime API (WebSocket voice I/O)                     │
│  - Supervisor Agent (GPT-4.1 for reasoning & tools)              │
│  - Session Management (in-memory hot path)                       │
│  - Call Logging & Analytics (DB cold path)                       │
│  - Twilio Integration (WebSocket for PSTN)                       │
│  - Audio Format Conversion (PCM16 ↔ G.711)                       │
└──────────────────────────────────────────────────────────────────┘
```

### External Services

- **OpenAI Realtime API** - Voice I/O (gpt-4o-realtime-preview)
- **OpenAI API** - Supervisor agent (gpt-4.1 for complex reasoning)
- **Turso** - Database (SQLite edge database)
- **Twilio** - Phone integration (future)
- **Vercel** - Frontend hosting (Next.js)
- **Render/Coolify** - Backend hosting

---

## Tech Stack

### Next.js App

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Audio:** Web Audio API, AudioWorklet
- **Auth:** Google OAuth + Iron Sessions
- **Billing:** Polar

### Server

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **WebSocket:** `ws` library
- **OpenAI SDK:** `openai` v4+ (base SDK)
- **OpenAI Agents:** `@openai/agents` (Realtime API integration) - **TO BE INSTALLED**
- **Audio Formats:** PCM16 (browser), G.711 μ-law (Twilio/PSTN)
- **Session Storage:** In-memory (Map/object)

### Database & ORM

- **Database:** Turso (LibSQL/SQLite edge database)
- **ORM:** Drizzle ORM
- **Migrations:** Drizzle Kit
- **Validation:** Zod

### Hosting

- **Next.js App:** Vercel
- **Server:** Render / Coolify / Self-hosted
- **Database:** Turso Cloud

---

## Agent Architecture (Chat-Supervisor Pattern)

Based on OpenAI's reference implementation, using dual-agent architecture for optimal voice experience.

### Receptionist Agent (Realtime API)

**Model:** `gpt-4o-realtime-preview-2025-06-03`

**Responsibilities:**
- Real-time voice interaction (low latency)
- Greeting and conversation flow
- Information collection (name, phone, reason)
- Immediate acknowledgments ("Let me check that for you")
- Defer complex tasks to Supervisor

**Configuration:**
- Voice: Natural, conversational
- Modalities: Audio only
- Turn detection: Server VAD with interruption support
- Audio format: PCM16 (24kHz) for web, G.711 (8kHz) for PSTN

### Supervisor Agent (Text-based)

**Model:** `gpt-4.1` or `gpt-4.1-mini`

**Responsibilities:**
- Complex reasoning and decision-making
- Tool/function calling
- Calendar management
- Customer database lookup
- Business logic
- Generate high-quality responses for complex queries

### Conversation Flow Example

```
User: "I'd like to book an appointment for next Tuesday"
  ↓
Receptionist: "Sure, let me check available times" [immediate voice response]
  ↓
Receptionist → Supervisor: getNextResponseFromSupervisor()
  ↓
Supervisor → Tool: checkAvailability(date="2025-10-28")
  ↓
Supervisor returns: "10am, 2pm, or 4pm available"
  ↓
Receptionist → User: "I have 10am, 2pm, or 4pm available, which works best?"
```

**Key Pattern:** Realtime agent handles conversational flow while supervisor handles tool execution and complex reasoning.

---

## Project Structure

### Current Structure

```
ai-receptionist/
├── app/                                # Next.js frontend (PARTIAL)
│   ├── app/
│   │   ├── test/                      # Voice test page
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   └── AudioVisualizer.tsx        # Visualizer component
│   ├── hooks/
│   │   ├── useAudioDevices.ts         # Device selection
│   │   └── useAudioStream.ts          # Stream management
│   └── package.json
│
├── server/                             # Node.js backend (PARTIAL)
│   ├── src/
│   │   ├── config/
│   │   │   └── openai.ts              # OpenAI config
│   │   ├── routes/
│   │   │   ├── websocket.ts           # WebSocket server
│   │   │   └── sessions.ts            # Session management
│   │   └── index.ts                   # Server entry
│   └── package.json
│
├── reference/                          # Reference materials (git-ignored)
│   ├── openai-realtime-agents/        # OpenAI official example
│   ├── initial-mvp-reference/         # Scaffolding reference
│   └── openai-realtime-twilio-demo-main/  # Twilio patterns
│
└── package.json                        # Root workspace config
```

---

## Implementation Status

### Completed (~30% of MVP)

- [x] Project structure setup
- [x] Basic Node.js server with Express
- [x] WebSocket server infrastructure
- [x] Session management endpoint
- [x] Basic audio capture (Next.js app)

### In Progress (Critical Path to MVP)

- [ ] Install `@openai/agents` package
- [ ] OpenAI Realtime API integration (WebSocket)
- [ ] Receptionist agent configuration
- [ ] Supervisor agent with sample tool
- [ ] Audio streaming (browser → server → OpenAI)
- [ ] WebSocket client (Next.js app)
- [ ] Full conversation flow testing

### Backlog (Order May Change)

**Database & Persistence:**
- [ ] Turso database setup
- [ ] Drizzle schema (users, calls, sessions)
- [ ] Call logging to database
- [ ] Session persistence
- [ ] Analytics queries

**Dashboard & UI:**
- [ ] Landing page
- [ ] User authentication
- [ ] Call logs dashboard
- [ ] Session management UI
- [ ] Billing page (Polar integration)

**Enhanced Capabilities:**
- [ ] Google Calendar integration
- [ ] Customer database lookup
- [ ] Appointment booking tool
- [ ] Transfer to human (escalation)
- [ ] Multi-language support

**Twilio Integration:**
- [ ] Twilio account setup
- [ ] Phone number provisioning
- [ ] Inbound call routing
- [ ] Audio format conversion (G.711 μ-law for PSTN)
- [ ] Outbound calling

---

## Database Schema (Reference Only)

⚠️ **DRAFT - Not Confirmed:** Existing billing boilerplate may differ from this schema. This is a reference/idea for future implementation.

### Users

```typescript
{
  id: uuid (primary key)
  email: string (unique)
  name: string
  phone: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Sessions

```typescript
{
  id: uuid (primary key)
  userId: uuid? (nullable, foreign key)
  status: enum ('pending', 'active', 'completed', 'failed')
  createdAt: timestamp
  startedAt: timestamp?
  endedAt: timestamp?
}
```

### Calls

```typescript
{
  id: uuid (primary key)
  sessionId: uuid (foreign key)
  userId: uuid? (nullable)
  callerPhone: string
  duration: integer (seconds)
  transcript: text
  summary: text
  status: enum ('completed', 'failed', 'transferred')
  metadata: jsonb (agent events, tool calls, etc.)
  createdAt: timestamp
}
```

---

## Reference Materials

### OpenAI Documentation

- [Realtime API Docs](https://platform.openai.com/docs/api-reference/realtime)
- [Voice Agents Guide](https://platform.openai.com/docs/guides/voice-agents)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [TypeScript SDK](https://platform.openai.com/docs/libraries/typescript-javascript-library)

### OpenAI Cookbooks

- [Realtime Prompting Guide](https://cookbook.openai.com/examples/realtime_prompting_guide)
- [MCP-Powered Voice Agents](https://cookbook.openai.com/examples/partners/mcp_powered_voice_agents/mcp_powered_agents_cookbook)
- [Voice Agents with Agents SDK](https://cookbook.openai.com/examples/agents_sdk/app_assistant_voice_agents)

### Reference Implementations (Local)

**OpenAI Realtime Agents** (STUDIED)
- Path: `./reference/openai-realtime-agents/`
- GitHub: https://github.com/openai/openai-realtime-agents
- Key files:
  - Chat-Supervisor pattern: `src/app/agentConfigs/chatSupervisor/`
  - Session management: `src/app/api/session/route.ts`
  - Realtime hooks: `src/app/hooks/useRealtimeSession.ts`

**Initial MVP Reference** (STUDIED)
- Path: `./reference/initial-mvp-reference/`
- Our initial scaffolding attempt
- Server structure patterns

**Twilio Integration** (TO BE STUDIED)
- Path: `./reference/openai-realtime-twilio-demo-main/`
- GitHub: https://github.com/openai/openai-realtime-twilio-demo
- Critical for Twilio integration (audio formats, PSTN, WebSocket patterns)

### Additional References

- [Aurelio Labs Agents SDK Course](https://github.com/aurelio-labs/agents-sdk-course)
- [OpenAI Customer Service Agents](https://github.com/openai/openai-cs-agents-demo)

### Other Technologies

- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Turso Docs](https://docs.turso.tech/)
- [Twilio Voice Docs](https://www.twilio.com/docs/voice)
- [Web Audio API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

---

## Next Steps

**Immediate (MVP Completion):**

1. Install `@openai/agents` package in server
2. Create agent configurations (receptionist + supervisor)
3. Implement OpenAI Realtime WebSocket connection
4. Build audio streaming pipeline (browser → server → OpenAI)
5. Implement WebSocket client in Next.js app
6. Test full conversation flow

**Development Approach:**
- Build incrementally with meaningful commits
- Test each component in isolation before integration
- Use reference implementations as guides
- No premature optimization - focus on working MVP first

**Note:** Types defined locally in each package for now. Shared package can be added later if needed for database schemas.