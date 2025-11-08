# AI Receptionist

**Multi-tenant AI receptionist platform** where each client gets their own configurable voice agent, dashboard, and CRM integrations. Built with a **supervisor agent pattern** using OpenAI's Realtime API for natural phone conversations, supporting Twilio integration and MCP-powered CRM connections.

**Current Phase:** 2-week prototype to demonstrate the core voice pipeline and dual-agent architecture.

## Project Structure

```
ai-receptionist/
├── app/       → Next.js frontend (Vercel)
├── server/    → Node.js backend (VPS)
└── shared/    → Shared utilities (@ai-receptionist/shared)
```

**Turbo commands:**
```bash
turbo dev --filter=app      # Start Next.js app
turbo dev --filter=server   # Start Node.js server
turbo build --filter=app    # Build Next.js app
turbo build --filter=server # Build Node.js server
```

## Implementation Plan

See [PLAN.md](./PLAN.md) for detailed implementation guide with code examples and timeline.

## Quick Start

```bash
# Install all dependencies
npm install

# Start development servers
npm run dev

# Build for production
npm run build
```