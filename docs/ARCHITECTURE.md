# Voice Agent Architecture

## Project Overview
Real-time voice-to-voice conversational AI agent for Prime Auto Lab (automotive service company). The agent acts as a professional receptionist handling customer inquiries, appointment scheduling, and lead capture.

## Tech Stack
- **Speech-to-Text**: Deepgram (Real-time transcription)
- **AI/LLM**: OpenAI GPT-4o-mini (Conversational AI)
- **Text-to-Speech**: ElevenLabs (Voice synthesis)
- **Server**: Node.js + Express + WebSocket
- **Client**: Vanilla JavaScript (browser)

## System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    VOICE AGENT FLOW                          │
└─────────────────────────────────────────────────────────────┘

1. USER SPEAKS
   └→ Browser captures microphone audio (16kHz, mono, 16-bit PCM)
   └→ WebSocket streams audio to server
   └→ Server forwards to Deepgram API
   └→ Deepgram transcribes in real-time
   └→ Server sends transcripts back to client

2. SPEECH DETECTION (Deepgram VAD)
   ├→ SpeechStarted: User begins speaking
   │  └→ If AI is speaking: INTERRUPT (stop ElevenLabs playback)
   │  └→ Track interruption point for context
   └→ UtteranceEnd: User stops speaking (1.2s silence)
      └→ Complete transcript ready → Send to OpenAI

3. AI PROCESSING
   └→ Server sends complete transcript to OpenAI
   └→ OpenAI streams response text (word-by-word)
   └→ Client displays streaming text in real-time
   └→ Server waits for complete response

4. AI VOICE RESPONSE
   └→ Server sends COMPLETE text to ElevenLabs
   └→ ElevenLabs generates MP3 audio (streaming)
   └→ Server streams audio chunks to client
   └→ Client collects all chunks → Plays as single audio

5. INTERRUPTION HANDLING
   └→ User starts speaking while AI talks
   └→ Server sets isAISpeaking = false
   └→ Audio generation stops
   └→ Client clears audio queue
   └→ Process new user input
```

## Key Files

### Server (`server.js`)
- WebSocket server handling client connections
- Deepgram integration (speech recognition)
- OpenAI integration (LLM streaming)
- ElevenLabs integration (TTS)
- Conversation history management
- Interruption handling

### Client (`public/client.js`)
- Microphone capture & audio processing
- WebSocket communication
- Audio playback management
- UI updates (transcripts, status)
- Device selection

### Frontend (`public/index.html`)
- User interface
- Microphone selector
- Audio level meter
- Speech status indicator
- Transcript display

## Configuration

### Environment Variables (`.env`)
```
DEEPGRAM_API_KEY=your_key
OPENAI_API_KEY=your_key
ELEVENLABS_API_KEY=your_key
```

### Deepgram Settings
- Model: `nova-2`
- Language: `en-US`
- Encoding: `linear16`
- Sample Rate: `16000`
- Channels: `1`
- Interim Results: `true`
- Utterance End: `1200ms` (1.2 seconds silence)
- VAD Events: `true` (speech detection)

### OpenAI Settings
- Model: `gpt-4o-mini`
- Temperature: `0.7`
- Max Tokens: `150` (concise voice responses)
- Streaming: `true`

### ElevenLabs Settings
- Voice ID: `EXAVITQu4vr4xnSDxMaL` (Bella - soft female)
- Model: `eleven_multilingual_v2` (English + Spanish support)
- Output Format: `mp3_44100_128`
- Latency Optimization: `4`

## WebSocket Events

### Client → Server
- `{type: 'start'}` - Start Deepgram connection
- `{type: 'stop'}` - Stop transcription
- Binary audio data (16-bit PCM)

### Server → Client
- `{type: 'status', message}` - Connection status
- `{type: 'speech_started'}` - User began speaking (real words detected)
- `{type: 'utterance_end', transcript}` - User finished speaking
- `{type: 'ai_response_start'}` - AI starting response
- `{type: 'ai_response_chunk', text}` - Streaming AI text
- `{type: 'ai_response_end'}` - AI finished text generation
- `{type: 'audio_chunk', audio}` - Base64 MP3 audio chunk
- `{type: 'audio_end'}` - Audio playback complete
- `{type: 'interrupt_ai'}` - User interrupted AI
- `{type: 'transcript', text, is_final}` - Deepgram transcript
- `{type: 'error', message}` - Error occurred

## State Management

### Server State (per WebSocket connection)
```javascript
let deepgramLive = null;              // Deepgram connection
let conversationHistory = [];         // Chat history (last 10 messages)
let isAISpeaking = false;             // AI currently generating voice
let currentAudioStream = null;        // ElevenLabs stream reference
let hasSpeechStarted = false;         // Real speech detected (not noise)
let utteranceTranscript = '';         // Accumulated user speech
```

### Client State
```javascript
let mediaStream = null;               // Microphone stream
let audioContext = null;              // Audio processing context
let websocket = null;                 // WebSocket connection
let isRecording = false;              // Mic active
let selectedDeviceId = null;          // Selected microphone
let audioChunks = [];                 // Collected TTS audio chunks
let isCollectingAudio = false;        // Receiving audio from server
let currentAudioElement = null;       // HTML5 Audio player
```

## Interruption Strategy

**Challenge**: When user interrupts AI, need to track conversation context.

**Current Implementation**:
- Server detects real speech (not noise) via transcript
- Sets `isAISpeaking = false` to stop audio generation
- Sends `interrupt_ai` event to client
- Client stops audio playback immediately

**TODO - Track Interruption Point**:
1. When AI generates response, store it: `lastAIResponse`
2. When interrupted, calculate what was spoken:
   - Audio chunks sent to client = spoken portion
   - Remaining text = not spoken
3. Add to conversation history:
   ```javascript
   {
     role: 'assistant',
     content: lastAIResponse,
     interrupted: true,
     spoken_portion: "Hello! Thank you for...",
     unspoken_portion: "...calling Prime Auto Lab. How can I assist?"
   }
   ```
4. OpenAI can use this context for more natural follow-ups

## Receptionist Behavior

**Company**: Prime Auto Lab (automotive service)

**Services Offered**:
- General auto repair and maintenance
- Diagnostics and inspections
- Oil changes and fluid services
- Brake services
- Tire services
- Engine repairs

**Agent Personality**:
- Professional but friendly
- Concise responses (1-2 sentences for voice)
- Proactive (asks for name, phone, appointment time)
- Helpful (offers callback if unsure)

**System Prompt Location**: `server.js` line 17-40

## Troubleshooting

### No Audio Heard
- Check browser console for "Playing X audio chunks"
- Verify ElevenLabs API key is valid
- Check voice ID is correct (pre-made voices only)
- Look for TTS errors in server console

### Choppy/Broken Audio
- Audio chunks must be collected then played as one
- Check `playCompleteAudio()` function
- Verify base64 decoding works properly

### Transcription Issues
- Empty transcripts filtered out (line 315 server.js)
- Check Deepgram API key
- Verify microphone permissions
- Check audio format (16kHz, mono, linear16)

### False Speech Detection
- Use transcript-based detection, not just VAD
- Current implementation waits for actual words
- Adjust `utterance_end_ms` for sensitivity (1200ms default)

## Next Steps / TODO

1. **Track Interruption Context**
   - Store what AI said before interruption
   - Include in conversation history
   - Better conversation flow

2. **Add Conversation Persistence**
   - Store conversations in database
   - Link to customer records
   - Analytics and insights

3. **Lead Capture**
   - Detect when gathering customer info
   - Store: name, phone, email, service needed
   - Create structured data output

4. **Appointment Scheduling**
   - Integrate with calendar system
   - Check availability
   - Confirm bookings

5. **Multi-language Support**
   - Already using multilingual_v2 model
   - Add Spanish prompt variations
   - Language detection

6. **Visual Indicators**
   - Show interruption points in UI
   - Display conversation context
   - Highlight important info (phone, name, etc.)

## Running the Application

```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Add your API keys to .env

# Start server
npm start

# Open browser
http://localhost:3000

# Allow microphone access
# Click "Start Recording"
# Speak naturally
```

## Development Notes

- **Audio encoding is critical**: Must be 16kHz, mono, 16-bit PCM for Deepgram
- **Base64 chunks**: Decode each separately before concatenating
- **Conversation history**: Limited to last 10 messages to manage tokens
- **Voice responses**: Keep under 150 tokens for natural conversation
- **Interruption detection**: Waits for actual transcript, not just VAD events
- **Default microphone**: Auto-selected on page load
