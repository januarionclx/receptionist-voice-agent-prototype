# AI Context Document - Voice Agent Project

## Quick Summary for LLMs
This is a **real-time voice-to-voice AI agent** that acts as a receptionist for Prime Auto Lab. Users speak → Deepgram transcribes → OpenAI responds → ElevenLabs speaks back. The agent can be interrupted mid-sentence when users start speaking.

## Current State (What Works)
✅ Real-time speech recognition (Deepgram)
✅ Live transcription display
✅ OpenAI streaming text responses
✅ ElevenLabs voice synthesis (multilingual v2)
✅ Audio playback in browser
✅ Microphone device selection (auto-selects default)
✅ Audio level meter
✅ Speech detection (filters out noise)
✅ Basic interruption (stops AI when user speaks)
✅ Conversation history (last 10 messages)
✅ Visual indicators (speaking, processing, etc.)

## Current Issues / In Progress
⚠️ Audio base64 decoding was causing errors - JUST FIXED (decode chunks separately)
⏳ Need to track interruption context (what AI was saying when interrupted)
⏳ Need visual indicators for interruption points
⏳ Lead capture not implemented
⏳ Appointment scheduling not implemented

## File Structure
```
ai-prototype/
├── server.js                 # Main server (Express + WebSocket + APIs)
├── package.json             # Dependencies
├── .env                     # API keys (gitignored)
├── .env.example            # Template for API keys
├── public/
│   ├── index.html          # UI
│   └── client.js           # Client-side logic
└── docs/
    ├── ARCHITECTURE.md     # Full technical documentation
    └── CONTEXT.md          # This file
```

## Recent Changes
1. **Fixed audio playback** - Base64 chunks now decoded separately before concatenation
2. **Switched to multilingual v2** - Supports English + Spanish
3. **Added default mic detection** - Auto-selects system default
4. **Removed duplicate event handlers** - Fixed audio collection bug
5. **Improved interruption** - Uses transcript-based detection (not just VAD)

## Important Code Locations

### Server.js Key Sections
- **Line 17-40**: System prompt (receptionist personality)
- **Line 90-242**: `processWithAI()` - Main conversation handler
- **Line 154-178**: ElevenLabs integration (generates voice)
- **Line 319-340**: Speech detection & interruption handling
- **Line 66-67**: Interruption state tracking

### Client.js Key Sections
- **Line 23-26**: Audio playback state
- **Line 136-180**: WebSocket event handlers
- **Line 310-355**: Audio playback function
- **Line 287-370**: Audio chunk collection & playback

## API Keys Required
```env
DEEPGRAM_API_KEY=...     # Speech-to-text
OPENAI_API_KEY=...       # LLM
ELEVENLABS_API_KEY=...   # Text-to-speech
```

## Critical Settings

### Deepgram
- **utterance_end_ms**: 1200 (1.2s silence = speech ended)
- **vad_events**: true (enables SpeechStarted/UtteranceEnd)
- **interim_results**: true (shows typing effect)

### OpenAI
- **model**: gpt-4o-mini (fast, cheap)
- **max_tokens**: 150 (short voice responses)
- **streaming**: true (word-by-word display)

### ElevenLabs
- **voice**: EXAVITQu4vr4xnSDxMaL (Bella - soft female)
- **model**: eleven_multilingual_v2 (English + Spanish)
- **optimize_streaming_latency**: 4 (quality vs speed)

## Common Tasks for Next AI Session

### 1. Add Interruption Context Tracking
**Goal**: Store what AI was saying when interrupted

**Steps**:
1. Before sending to ElevenLabs, store `lastAIResponse`
2. Track how many audio chunks were sent (= what was spoken)
3. Calculate unspoken portion
4. Add to conversation history with interruption metadata
5. Display in UI with visual indicator

**Files to modify**: `server.js` (line 90-242)

### 2. Implement Lead Capture
**Goal**: Extract customer info from conversation

**Steps**:
1. Add lead state tracking to server
2. Update system prompt to ask for name/phone/service
3. Use OpenAI function calling or structured output
4. Store extracted data
5. Display in UI

**Files to modify**: `server.js` (system prompt + new function)

### 3. Add Visual Interruption Indicators
**Goal**: Show where conversation was interrupted

**Steps**:
1. Add new event type `conversation_interrupted`
2. Update UI to show interrupted text differently
3. Add indicator showing "AI was saying..." on hover
4. Style interrupted messages distinctly

**Files to modify**: `client.js`, `index.html`

### 4. Improve Receptionist Prompt
**Goal**: Better conversation flow

**Current**: Generic automotive receptionist
**Needed**:
- Specific to Miami (bilingual emphasis)
- Handle common questions
- Better appointment flow
- Lead qualification

**Files to modify**: `server.js` line 17-40

## Testing Checklist
- [ ] Microphone auto-selects correctly
- [ ] Audio playback works smoothly (no cuts)
- [ ] Can interrupt AI mid-sentence
- [ ] Transcripts appear in real-time
- [ ] Conversation history maintained
- [ ] Spanish phrases work (multilingual model)
- [ ] Audio level meter shows activity
- [ ] No base64 decoding errors
- [ ] Visual indicators update correctly

## Known Limitations
1. **No persistence** - Conversations lost on refresh
2. **No auth** - Anyone can use
3. **No rate limiting** - Could rack up API costs
4. **No lead storage** - Info not saved anywhere
5. **No appointment booking** - Just conversation
6. **Single user** - No multi-session support
7. **Interruption context** - Not tracked yet

## User Workflow
1. User opens page → mic auto-selected
2. Click "Start Recording"
3. Speak question: "Hi, I need an oil change"
4. See live transcript appear
5. AI responds (text streams, then voice plays)
6. User can interrupt anytime
7. Conversation continues naturally

## Error Scenarios
- **"No audio chunks to play"** → Audio collection not initialized (check ai_response_start handler)
- **"InvalidCharacterError"** → Base64 decoding issue (chunks must be decoded separately)
- **"voice_limit_reached"** → Using custom voice (switch to pre-made voice)
- **Empty transcripts** → Filtered out automatically (line 315-318 server.js)
- **Choppy audio** → Was streaming too many small chunks (now waits for complete response)

## Performance Notes
- OpenAI streaming: ~500ms first token
- ElevenLabs generation: ~1-2s for full response
- Total latency: ~2-3s from user speech to AI voice
- Can be improved with sentence-level TTS (not implemented)

## Miami-Specific Context
- **Location**: Miami, FL
- **Languages**: English + Spanish (many bilingual customers)
- **Customer base**: Local residents + fleet vehicles
- **Peak hours**: Mornings and lunch breaks
- **Common services**: Oil changes, brake work, diagnostics
