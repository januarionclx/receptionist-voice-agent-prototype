require('dotenv').config();
const express = require('express');
const { WebSocketServer } = require('ws');
const { createClient, LiveTranscriptionEvents } = require('@deepgram/sdk');
const { streamText, experimental_generateSpeech: generateSpeech } = require('ai');
const { openai: openaiProvider } = require('@ai-sdk/openai');
const { elevenlabs: elevenlabsProvider } = require('@ai-sdk/elevenlabs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Receptionist system prompt
const SYSTEM_PROMPT = `You are a professional receptionist for Prime Auto Lab, an automotive service company.

Your role:
- Greet callers warmly and professionally
- Answer questions about our services
- Help schedule appointments
- Collect lead information for new customers

Our services:
- General auto repair and maintenance
- Diagnostics and inspections
- Oil changes and fluid services
- Brake services
- Tire services
- Engine repairs

Guidelines:
- Keep responses concise and conversational (1-2 sentences)
- Be friendly but professional
- Ask for customer name, phone, and preferred date/time for appointments
- If you don't know something, offer to have someone call them back
- Always confirm details before ending the conversation

Important: Keep responses SHORT for natural voice conversation.`;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('Client connected');

  let deepgramLive = null;
  let audioPacketCount = 0;
  let conversationHistory = []; // Track conversation context
  let isAISpeaking = false; // Track if AI is currently speaking
  let currentAudioStream = null; // Track current ElevenLabs stream for interruption

  // Initialize Deepgram client
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('ERROR: DEEPGRAM_API_KEY is not set in .env file!');
    ws.send(JSON.stringify({ type: 'error', message: 'Server configuration error: Missing API key' }));
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('ERROR: OPENAI_API_KEY is not set in .env file!');
    ws.send(JSON.stringify({ type: 'error', message: 'Server configuration error: Missing OpenAI API key' }));
    return;
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY is not set in .env file!');
    ws.send(JSON.stringify({ type: 'error', message: 'Server configuration error: Missing ElevenLabs API key' }));
    return;
  }

  // Process user utterance with AI SDK + ElevenLabs
  async function processWithAI(userMessage) {
    try {
      console.log('💬 User said:', userMessage);

      // Add user message to history
      conversationHistory.push({
        role: 'user',
        content: userMessage
      });

      isAISpeaking = true;

      // Signal client that AI is responding
      ws.send(JSON.stringify({
        type: 'ai_response_start'
      }));

      // Use AI SDK's streamText for better streaming
      const result = streamText({
        model: openaiProvider('gpt-4o-mini'),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...conversationHistory
        ],
        temperature: 0.7,
        maxTokens: 150,
      });

      let fullResponse = '';

      // Stream text chunks to client
      for await (const chunk of result.textStream) {
        // Check if interrupted
        if (!isAISpeaking) {
          console.log('⚠️ AI speech interrupted');
          break;
        }

        fullResponse += chunk;

        // Send text chunk to client for display
        ws.send(JSON.stringify({
          type: 'ai_response_chunk',
          text: chunk
        }));
      }

      console.log('🤖 AI complete response:', fullResponse);

      // Signal text completion
      ws.send(JSON.stringify({
        type: 'ai_response_end'
      }));

      // Now generate speech with STREAMING for low latency
      if (fullResponse.trim() && isAISpeaking) {
        console.log('🔊 Generating speech with streaming...');

        try {
          // Use OpenAI directly for streaming audio
          const OpenAI = require('openai');
          const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

          const mp3Stream = await openaiClient.audio.speech.create({
            model: 'tts-1',
            voice: 'alloy',
            input: fullResponse.trim(),
            response_format: 'mp3',
          });

          console.log('🎵 Streaming audio chunks to client...');
          let chunkCount = 0;

          // Stream audio chunks as they arrive
          for await (const chunk of mp3Stream) {
            if (!isAISpeaking) {
              console.log('⚠️ Audio streaming interrupted');
              break;
            }

            chunkCount++;
            // Send each chunk immediately
            ws.send(JSON.stringify({
              type: 'audio_chunk',
              audio: chunk.toString('base64'),
              isStreaming: true,
              chunkIndex: chunkCount
            }));
          }

          console.log(`✅ Streamed ${chunkCount} audio chunks`);

        } catch (ttsError) {
          console.error('TTS error:', ttsError);
        }
      }

      // Signal audio completion
      ws.send(JSON.stringify({
        type: 'audio_end'
      }));

      isAISpeaking = false;
      currentAudioStream = null;

      // Add full response to history
      conversationHistory.push({
        role: 'assistant',
        content: fullResponse
      });

      // Keep conversation history manageable (last 10 messages)
      if (conversationHistory.length > 10) {
        conversationHistory = conversationHistory.slice(-10);
      }

      return fullResponse;

    } catch (error) {
      console.error('OpenAI/ElevenLabs error:', error);
      isAISpeaking = false;
      currentAudioStream = null;

      ws.send(JSON.stringify({
        type: 'ai_response',
        text: 'I apologize, I had trouble processing that. Could you please repeat?'
      }));

      return null;
    }
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      // Handle user interruption
      if (data.type === 'user_interrupted') {
        console.log('🛑 User interrupted AI at', data.interruptedAt, '/', data.totalDuration, 'seconds');

        // Calculate what percentage was heard
        const percentHeard = data.totalDuration > 0 ? (data.interruptedAt / data.totalDuration) : 0;
        console.log(`   User heard ~${Math.round(percentHeard * 100)}% of response`);

        // Estimate which words were heard (rough approximation)
        const fullText = data.fullText || '';
        const words = fullText.split(' ');
        const wordsHeard = Math.floor(words.length * percentHeard);
        const partialText = words.slice(0, wordsHeard).join(' ');

        console.log(`   Estimated heard text: "${partialText}${wordsHeard < words.length ? ' [interrupted]' : ''}"`);

        // Update conversation history to reflect what was actually heard
        if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'assistant') {
          // Replace the last assistant message with the partial one
          conversationHistory[conversationHistory.length - 1] = {
            role: 'assistant',
            content: partialText + (wordsHeard < words.length ? ' [interrupted by user]' : '')
          };
        }

        // Stop AI speaking
        isAISpeaking = false;
        currentAudioStream = null;

        return;
      }

      // Handle start command
      if (data.type === 'start') {
        console.log('Starting Deepgram connection...');

        // Create live transcription connection
        deepgramLive = deepgram.listen.live({
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          encoding: 'linear16',
          sample_rate: 16000,
          channels: 1,
          interim_results: true,
          utterance_end_ms: 1200,  // 1.2 seconds for faster conversational flow
          vad_events: true,
          // Improve noise filtering
          punctuate: true,
          filler_words: false,
        });

        // Handle Deepgram open event
        deepgramLive.on(LiveTranscriptionEvents.Open, () => {
          console.log('Deepgram connection opened');
          ws.send(JSON.stringify({ type: 'status', message: 'Connected to Deepgram' }));
        });

        // Track if we've detected actual speech (not just noise)
        let hasSpeechStarted = false;
        let utteranceTranscript = '';

        // Handle speech started event - User began speaking
        // NOTE: This can trigger on noise, so we verify with actual transcripts
        deepgramLive.on(LiveTranscriptionEvents.SpeechStarted, () => {
          console.log('🎤 VAD detected audio activity');
          // Don't send to client yet - wait for actual transcript
        });

        // Handle utterance end event - User stopped speaking
        deepgramLive.on(LiveTranscriptionEvents.UtteranceEnd, async () => {
          console.log('🔚 Utterance ended');

          // Only send if we actually had real speech
          if (hasSpeechStarted && utteranceTranscript.trim().length > 0) {
            console.log('📝 Complete utterance:', utteranceTranscript);

            const completeTranscript = utteranceTranscript.trim();

            ws.send(JSON.stringify({
              type: 'utterance_end',
              message: 'User finished speaking',
              transcript: completeTranscript
            }));

            // Process with AI (streaming happens inside processWithAI)
            await processWithAI(completeTranscript);
          }

          // Reset for next utterance
          hasSpeechStarted = false;
          utteranceTranscript = '';
        });

        // Handle transcript results
        deepgramLive.on(LiveTranscriptionEvents.Transcript, (data) => {
          const transcript = data.channel.alternatives[0].transcript;

          // Only process non-empty transcripts
          if (transcript && transcript.trim().length > 0) {
            // Log all transcripts for debugging
            console.log(`Transcript (${data.is_final ? 'FINAL' : 'interim'}):`, transcript);
            // First real transcript = actual speech started (not just noise)
            if (!hasSpeechStarted) {
              hasSpeechStarted = true;
              console.log('✅ Real speech detected (not noise)');

              // Interrupt AI if it's currently speaking
              if (isAISpeaking) {
                console.log('🛑 Interrupting AI speech');
                isAISpeaking = false;
                currentAudioStream = null;

                ws.send(JSON.stringify({
                  type: 'interrupt_ai',
                  message: 'User interrupted AI'
                }));
              }

              ws.send(JSON.stringify({
                type: 'speech_started',
                message: 'User started speaking'
              }));
            }

            // Accumulate transcript for complete utterance
            if (data.is_final) {
              utteranceTranscript += transcript + ' ';
            }

            // Send transcript to client
            ws.send(JSON.stringify({
              type: 'transcript',
              text: transcript,
              is_final: data.is_final,
              speech_final: data.speech_final || false,
            }));
          }
        });

        // Handle errors
        deepgramLive.on(LiveTranscriptionEvents.Error, (error) => {
          console.error('Deepgram error:', error);
          ws.send(JSON.stringify({ type: 'error', message: error.message }));
        });

        // Handle close event
        deepgramLive.on(LiveTranscriptionEvents.Close, () => {
          console.log('Deepgram connection closed');
        });
      }

      // Handle stop command
      if (data.type === 'stop') {
        console.log('Stopping transcription...');
        if (deepgramLive) {
          deepgramLive.finish();
          deepgramLive = null;
        }
      }
    } catch (error) {
      // Handle binary audio data
      if (Buffer.isBuffer(message)) {
        if (deepgramLive) {
          deepgramLive.send(message);

          // Log audio packets periodically
          audioPacketCount++;
          if (audioPacketCount % 50 === 0) {
            console.log(`Received ${audioPacketCount} audio packets from client, forwarded to Deepgram`);
          }
        } else {
          console.warn('Received audio data but Deepgram connection not established');
        }
      } else {
        console.error('Error processing message:', error);
      }
    }
  });

  // Clean up on disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
    if (deepgramLive) {
      deepgramLive.finish();
      deepgramLive = null;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
