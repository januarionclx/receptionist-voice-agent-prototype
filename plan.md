# AI Receptionist - Project Plan

## Current State

**What exists NOW:**
- ✅ Planning documentation (this file)
- ✅ Root workspace configuration (`package.json`)
- ✅ Git repository initialized
- ✅ Reference materials in `reference/` folder (git-ignored):
  - `reference/openai-realtime-agents/` - OpenAI's official example
  - `reference/initial-mvp-reference/` - Initial scaffolding (for reference only)

**What does NOT exist yet:**
- ❌ No `app/` folder (Next.js frontend)
- ❌ No `server/` folder (Node.js backend)
- ❌ No actual code implementation
- ❌ We're starting Phase 1 from scratch

---

## Overview
Building an AI-powered receptionist using OpenAI's Realtime API for natural voice interactions, with a smarter backend model handling complex reasoning and tool calls. Similar to the Chat-Supervisor pattern from the [OpenAI Realtime Agents reference](./reference/openai-realtime-agents/).

## Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                     WebSocket + Voice Interface                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ WebSocket Audio (for consistency with Twilio)
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                    NEXT.JS APP (Frontend)                        │
│  - Billing & Payment Processing (Polar)                          │
│  - User Profiles & Authentication (Google OAuth + Iron Sessions) │
│  - Support Dashboard                                             │
│  - Landing Pages & Marketing                                     │
│  - Session Management (Create session IDs for calls)             │
│  - Voice Test Client (/test route)                               │
│  - Routes: /api/session (connect to backend)                     │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ REST API (session ID, HTTP/WebSocket)
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                  NODE.JS SERVER (Backend)                        │
│  - Handles actual phone calls using session IDs                  │
│  - OpenAI Realtime API via WebSocket (voice I/O)                 │
│  - Supervisor Agent (GPT-4/GPT-4.1) for reasoning & tool calls  │
│  - Call logging & analytics                                      │
│  - Twilio integration via WebSocket (phone number handling)      │
│  - Database operations (call records, logs, user data)           │
│  - Types defined locally (shared package in Phase 2)             │
└──────────────────────────────────────────────────────────────────┘
```

### Connection Strategy: WebSocket vs WebRTC

**Decision: Use WebSocket for consistency**

The OpenAI Realtime API supports both WebRTC and WebSocket connections:

- **WebRTC**: Lower latency, peer-to-peer, better for direct browser connections
- **WebSocket**: More stable, server-to-server, required for Twilio integration

**Why WebSocket:**
1. **Twilio Requirement**: Twilio connects to our server via WebSocket for phone calls
2. **Consistency**: One connection method to maintain across browser and phone
3. **Stability**: Better for production PSTN calls
4. **Audio Conversion**: Easier to handle format conversion (8kHz for phone networks)

**Architecture:**
- Browser → Next.js → Node.js Server → OpenAI Realtime API (all via WebSocket)
- Twilio → Node.js Server → OpenAI Realtime API (via WebSocket)
```

### External Services
- **OpenAI Realtime API** - Voice interaction (gpt-4o-realtime-mini or gpt-4o-realtime)
- **OpenAI API** - Supervisor agent for complex reasoning (gpt-4.1 or gpt-4.1-mini)
- **Turso** - Database (SQLite-compatible, edge-ready)
- **Twilio** - Phone number management & PSTN integration (future)
- **Hosting** - Render / Coolify / Self-hosted for Node.js server

## Project Structure (PLANNED)

**Current actual structure:**
```
ai-receptionist/
├── reference/                          # Reference materials (git-ignored)
│   ├── openai-realtime-agents/        # OpenAI's official example
│   └── initial-mvp-reference/         # Our initial scaffolding reference
├── .gitignore
├── package.json                        # Root workspace config
└── plan.md                             # This file
```

**Target structure (to be built in Phase 1):**
```
ai-receptionist/
├── reference/                          # Reference materials (git-ignored)
│   ├── openai-realtime-agents/        # OpenAI's official example
│   └── initial-mvp-reference/         # Our initial scaffolding reference
│
├── app/                                # Next.js frontend application (TO BE CREATED)
│   ├── app/                            # App router pages
│   │   ├── test/                      # Voice test client
│   │   │   └── page.tsx              # Test page with auto-session
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Landing page
│   │   └── globals.css               # Global styles
│   ├── components/                    # React components
│   ├── lib/                           # Frontend utilities
│   │   └── websocket.ts              # WebSocket client
│   └── package.json
│
├── server/                             # Node.js backend server (TO BE CREATED)
│   ├── src/
│   │   ├── config/                    # Configuration
│   │   │   ├── database.ts           # DB connection config + types
│   │   │   ├── openai.ts             # OpenAI API config + types
│   │   │   └── twilio.ts             # Twilio config + types (future)
│   │   ├── agents/                    # Agent configurations
│   │   │   ├── receptionist.ts       # Main receptionist agent + types
│   │   │   ├── supervisor.ts         # Supervisor agent + types
│   │   │   └── index.ts              # Agent exports
│   │   ├── services/                  # Business logic
│   │   │   ├── realtime.ts           # OpenAI Realtime API service + types
│   │   │   ├── supervisor.ts         # Supervisor agent service + types
│   │   │   ├── database.ts           # Database operations + types
│   │   │   ├── twilio.ts             # Twilio integration + types (future)
│   │   │   └── audio.ts              # Audio processing + types
│   │   ├── tools/                     # Agent tools/functions
│   │   │   ├── calendar.ts           # Appointment scheduling + types
│   │   │   ├── availability.ts       # Check availability + types
│   │   │   ├── customer.ts           # Customer lookup + types
│   │   │   ├── appointment.ts        # Appointment management + types
│   │   │   └── index.ts              # Tool registry + types
│   │   ├── routes/                    # Express routes
│   │   │   ├── websocket.ts          # WebSocket handling + types
│   │   │   ├── sessions.ts           # Session management + types
│   │   │   ├── calls.ts              # Call handling + types (future)
│   │   │   └── health.ts             # Health checks + types
│   │   ├── middleware/                # Express middleware
│   │   │   ├── auth.ts               # Authentication + types
│   │   │   ├── logging.ts            # Request logging + types
│   │   │   ├── rateLimit.ts          # Rate limiting + types
│   │   │   └── errorHandler.ts       # Error handling + types
│   │   ├── utils/                     # Utilities
│   │   │   ├── logger.ts             # Logging utilities + types
│   │   │   ├── validation.ts         # Input validation + types
│   │   │   ├── audio.ts              # Audio format conversion + types
│   │   │   └── constants.ts          # App constants + types
│   │   └── index.ts                   # Server entry point
│   └── package.json
│
├── package.json                        # Root workspace config (app + server)
├── .gitignore
└── plan.md                             # This file (main documentation)

```

## Tech Stack

### Frontend (Next.js App)
- **Framework**: Next.js 15 (App Router & Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Google OAuth + Iron Sessions
- **Billing**: Polar
- **State Management**: React Context / Zustand (TBD)

### Backend (Node.js Server)
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **WebSocket**: Native WebSocket / ws library
- **OpenAI SDK**: `openai` (v4+), `@openai/agents` (for Realtime via WebSocket)
- **Phone**: Twilio SDK (future, also via WebSocket)

### Database & ORM
- **Database**: Turso (LibSQL/SQLite edge database)
- **ORM**: Drizzle ORM
- **Migrations**: Drizzle Kit
- **Validation**: Zod

### DevOps & Hosting
- **Frontend Hosting**: Vercel (Next.js native)
- **Backend Hosting**: Render / Coolify / Self-hosted
- **Database**: Turso Cloud
- **CI/CD**: GitHub Actions (future)

## Agent Architecture (Chat-Supervisor Pattern)

Based on the OpenAI Realtime Agents reference, we'll use the **Chat-Supervisor architecture**:

### 1. Receptionist Agent (Realtime API)
- **Model**: `gpt-4o-realtime-preview-2025-06-03` (full capabilities)
- **Purpose**: Handle real-time voice interaction
- **Responsibilities**:
  - Greet callers naturally
  - Basic conversation and chitchat
  - Collect information (name, phone, reason for call)
  - Provide immediate acknowledgment ("Let me check that for you")
  - Defer complex tasks to Supervisor Agent

### 2. Supervisor Agent (Text-based)
- **Model**: `gpt-4.1` or `gpt-4.1-mini`
- **Purpose**: Handle complex reasoning and tool calls
- **Responsibilities**:
  - Calendar management (check availability, book appointments)
  - Customer lookup (retrieve customer info from database)
  - Business logic decisions
  - Tool/function calling
  - Generate high-quality responses for complex queries

### Flow Example
```
User: "I'd like to book an appointment for next Tuesday"
  ↓
Receptionist: "Sure, let me check what times are available" [immediate response]
  ↓
Receptionist → Supervisor: getNextResponseFromSupervisor()
  ↓
Supervisor → Tool: checkAvailability(date="2025-10-21")
  ↓
Supervisor → Receptionist: "I have 10am, 2pm, or 4pm available"
  ↓
Receptionist → User: "I have 10am, 2pm, or 4pm available, which works best?"
```

## Key Features (MVP)

### Phase 1 - Basic Voice Receptionist (CURRENT PHASE - NOT STARTED)
- [ ] Project structure setup (app/ and server/ folders)
- [ ] Basic Node.js server with Express
- [ ] OpenAI Realtime API integration (WebSocket)
- [ ] Simple receptionist agent (greeting, basic conversation)
- [ ] Supervisor agent with sample tool (e.g., check availability)
- [ ] Call session management
- [ ] WebSocket server for client connections
- [ ] Audio pipeline (microphone input → WebSocket)
- [ ] Full conversation flow testing

### Phase 2 - Database & Session Management
- [ ] Set up Turso database
- [ ] Define Drizzle schema in server (users, calls, sessions)
- [ ] Store call logs in database
- [ ] Persist sessions to database
- [ ] Add database queries to API endpoints
- [ ] (Optional) Create shared package for types if needed

### Phase 3 - Frontend Dashboard
- [ ] Next.js landing page
- [ ] User authentication
- [ ] Dashboard to view call logs
- [ ] Session management UI
- [ ] Basic billing page (placeholder)

### Phase 4 - Enhanced Agent Capabilities
- [ ] Real calendar integration (Google Calendar API)
- [ ] Customer database lookup
- [ ] Appointment booking tool
- [ ] Transfer to human (escalation)
- [ ] Multi-language support

### Phase 5 - Twilio Integration
- [ ] Twilio account setup
- [ ] Phone number provisioning
- [ ] Inbound call routing to Node.js server
- [ ] Audio format conversion for PSTN (8kHz codec)
- [ ] Outbound calling capability

## Database Schema (Preliminary)

### Users Table
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

### Sessions Table
```typescript
{
  id: uuid (primary key)
  userId: uuid (foreign key to users)
  status: enum ('pending', 'active', 'completed', 'failed')
  createdAt: timestamp
  startedAt: timestamp?
  endedAt: timestamp?
}
```

### Calls Table
```typescript
{
  id: uuid (primary key)
  sessionId: uuid (foreign key to sessions)
  userId: uuid? (nullable, foreign key to users)
  callerPhone: string
  duration: integer (seconds)
  transcript: text
  summary: text
  status: enum ('completed', 'failed', 'transferred')
  createdAt: timestamp
  metadata: jsonb (agent events, tool calls, etc.)
}
```

### Billing Table
```typescript
{
  id: uuid (primary key)
  userId: uuid (foreign key to users)
  amount: decimal
  currency: string
  status: enum ('pending', 'paid', 'failed')
  billingPeriodStart: timestamp
  billingPeriodEnd: timestamp
  createdAt: timestamp
}
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
OPENAI_API_KEY=sk-...
DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### Backend (.env)
```
PORT=3001
OPENAI_API_KEY=sk-...
DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
TWILIO_ACCOUNT_SID=... (future)
TWILIO_AUTH_TOKEN=... (future)
TWILIO_PHONE_NUMBER=... (future)
```

## Development Workflow

### Initial Setup
1. Install dependencies for all packages
2. Set up Turso database and get credentials
3. Run database migrations
4. Start development servers
   - Next.js: `npm run dev` (port 3000)
   - Node.js server: `npm run dev` (port 3001)

### Testing Locally
1. Open Next.js app in browser (http://localhost:3000/test)
2. Session is automatically created on page load
3. WebSocket connects to Node.js server
4. Server connects to OpenAI Realtime API via WebSocket
5. Test voice interaction in browser

## Future Considerations

### Monorepo Strategy

**Current Setup (Phase 1):**
- Using npm workspaces to manage `app/` and `server/` packages
- Each package has its own dependencies
- Types defined locally in each package
- Simple and fast for initial development

**Workspace Configuration:**
```json
// root package.json
{
  "workspaces": ["app", "server"]
}
```

**Future: Shared Package (Phase 2+):**

When you need shared code (database schemas, types), you can:

**Option A: Add shared package to workspace**
```json
// root package.json
{
  "workspaces": ["app", "server", "shared"]
}

// Reference in app/server
import { users } from '@shared/db/schema';
```

**Option B: Private npm package**
```json
{
  "dependencies": {
    "@your-company/shared": "^1.0.0"
  }
}
```

**Option C: Git dependency**
```json
{
  "dependencies": {
    "@your-company/shared": "git+ssh://git@github.com:org/shared.git#main"
  }
}
```

**For now:** Keep it simple with no shared package. Add when database is implemented.

**Tools to Consider Later:**
- **Turborepo** or **Nx** for monorepo management (when scaling)
- **pnpm workspaces** for faster package management

### Scaling
- Use Redis for session state
- Queue system for async tasks (BullMQ)
- Load balancing for Node.js server
- CDN for frontend assets

### Security
- Rate limiting on API endpoints
- API key rotation
- Audit logging for all database operations
- HIPAA compliance if handling health data

### Monitoring
- Error tracking (Sentry)
- Performance monitoring (DataDog / New Relic)
- Call analytics dashboard
- Cost tracking for OpenAI API usage

## Reference Materials

### Key Documentation
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/api-reference/realtime)
- [OpenAI TypeScript SDK](https://platform.openai.com/docs/libraries/typescript-javascript-library)
- [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Turso Docs](https://docs.turso.tech/)
- [Twilio Voice Docs](https://www.twilio.com/docs/voice)

### OpenAI Cookbooks (see `./reference/cookbooks/`)
- [Realtime API Prompting Guide](https://cookbook.openai.com/examples/realtime_prompting_guide)
- [MCP-Powered Voice Agents](https://cookbook.openai.com/examples/partners/mcp_powered_voice_agents/mcp_powered_agents_cookbook)
- [Voice Agents with Agents SDK](https://cookbook.openai.com/examples/agents_sdk/app_assistant_voice_agents)

### Reference Implementations

**OpenAI Official Example:**
- Local: `./reference/openai-realtime-agents/`
- GitHub: https://github.com/openai/openai-realtime-agents
- Key files to reference:
  - Chat-Supervisor pattern: `src/app/agentConfigs/chatSupervisor/`
  - Session management: `src/app/api/session/route.ts`
  - Realtime connection: `src/app/hooks/useRealtimeSession.ts`

**Our Initial Scaffolding (for reference):**
- Local: `./reference/initial-mvp-reference/`
- Contains our first attempt at project structure
- Use as reference while building Phase 1 from scratch
- Files organized with config/ pattern for server
- WebSocket implementation examples

## Next Steps (Phase 1)

1. ~~Create empty folder structure~~ (skip - build as we go)
2. Basic Node.js server with TypeScript and Express (with hot reload)
3. Add OpenAI configuration (`config/openai.ts`)
4. Create session management endpoint
5. Implement WebSocket server for client connections
6. Create receptionist agent configuration
7. Create supervisor agent with sample tools
8. Implement Realtime API integration
9. Create `app/` folder for Next.js frontend
10. Build test client for voice interaction
11. Test full conversation flow end-to-end

**Development approach:** Build step-by-step with meaningful commits. No empty folders - create files as needed.

**Note:** No shared package yet - types defined locally in each package. Add shared package later in Phase 2 if needed for database schemas.
