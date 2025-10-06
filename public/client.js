// DOM elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const audioMeterEl = document.getElementById('audioMeter');
const meterFillEl = document.getElementById('meterFill');
const audioLevelEl = document.getElementById('audioLevel');
const speechIndicatorEl = document.getElementById('speechIndicator');
const speechStatusEl = document.getElementById('speechStatus');
const aiActionEl = document.getElementById('aiAction');
const microphoneSelectEl = document.getElementById('microphoneSelect');

// Audio context and processing
let mediaStream = null;
let audioContext = null;
let audioWorkletNode = null;
let websocket = null;
let isRecording = false;
let analyser = null;
let selectedDeviceId = null;

// AI audio playback
let audioChunks = [];
let isCollectingAudio = false;
let currentAudioElement = null;
let isAIPlaying = false;
let currentAIText = ''; // Track the full AI text being spoken
let wordHighlightInterval = null; // For word highlighting
let currentAIResponseDiv = null; // Reference to AI response div for highlighting

// Update status display
function updateStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.className = 'text-sm mb-6';
  if (type === 'connected') {
    statusEl.classList.add('text-green-600', 'font-medium');
  } else if (type === 'error') {
    statusEl.classList.add('text-red-600', 'font-medium');
  } else {
    statusEl.classList.add('text-gray-600');
  }
}

// Load available audio input devices
async function loadAudioDevices() {
  try {
    // Request permissions first
    const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    tempStream.getTracks().forEach(track => track.stop());

    // Now get the device list
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');

    // Clear and populate dropdown
    microphoneSelectEl.innerHTML = '';

    if (audioInputs.length === 0) {
      microphoneSelectEl.innerHTML = '<option value="">No microphones found</option>';
      return;
    }

    // Find the default device
    const defaultDevice = audioInputs.find(device => device.deviceId === 'default') || audioInputs[0];

    audioInputs.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;

      // Mark default device
      const isDefault = device.deviceId === defaultDevice.deviceId;
      option.textContent = (device.label || `Microphone ${index + 1}`) + (isDefault ? ' (Default)' : '');

      if (isDefault) {
        option.selected = true;
      }

      microphoneSelectEl.appendChild(option);
    });

    // Set default device
    selectedDeviceId = defaultDevice.deviceId;

    console.log(`Found ${audioInputs.length} audio input device(s), default: ${defaultDevice.label || 'unnamed'}`);
  } catch (error) {
    console.error('Error loading audio devices:', error);
    microphoneSelectEl.innerHTML = '<option value="">Error loading devices</option>';
  }
}

// Handle device selection change
microphoneSelectEl.addEventListener('change', (e) => {
  selectedDeviceId = e.target.value;
  console.log('Selected microphone:', microphoneSelectEl.options[microphoneSelectEl.selectedIndex].text);

  // If currently recording, restart with new device
  if (isRecording) {
    stopRecording();
    setTimeout(() => startRecording(), 500);
  }
});

// Initialize WebSocket connection
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  websocket = new WebSocket(wsUrl);

  websocket.onopen = () => {
    console.log('WebSocket connected');
    updateStatus('Connected to server', 'connected');

    // Send start command
    websocket.send(JSON.stringify({ type: 'start' }));
  };

  websocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'status') {
      updateStatus(data.message, 'connected');
    } else if (data.type === 'speech_started') {
      console.log('🎤 Speech started - Interrupt AI here');
      updateStatus('🎤 User speaking', 'connected');

      // Update speech indicator
      speechIndicatorEl.className = 'mb-6 p-5 bg-blue-50 border-2 border-blue-400 rounded-lg text-center transition-all duration-300 pulse-glow';
      speechStatusEl.textContent = '🎤 Speaking Detected';
      speechStatusEl.className = 'text-lg font-semibold text-blue-600';
      aiActionEl.textContent = '→ AI STOPPED (interrupted)';
      aiActionEl.className = 'text-xs text-blue-500 mt-1';

      // Interrupt AI if currently playing audio
      if (isAIPlaying) {
        console.log('🛑 Interrupting AI audio playback');
        const interruptedAt = currentAudioElement ? currentAudioElement.currentTime : 0;
        const totalDuration = currentAudioElement ? currentAudioElement.duration : 0;

        stopAudioPlayback();

        // Notify server about interruption with timing info
        websocket.send(JSON.stringify({
          type: 'user_interrupted',
          interruptedAt: interruptedAt,
          totalDuration: totalDuration,
          fullText: currentAIText
        }));
      }

    } else if (data.type === 'utterance_end') {
      console.log('🔚 Utterance ended - Processing with AI...');
      updateStatus('🤖 AI is thinking...', 'connected');

      // Update speech indicator
      speechIndicatorEl.className = 'mb-6 p-5 bg-green-50 border-2 border-green-400 rounded-lg text-center transition-all duration-300';
      speechStatusEl.textContent = '🤖 AI Processing...';
      speechStatusEl.className = 'text-lg font-semibold text-green-600';
      aiActionEl.textContent = 'Generating response...';
      aiActionEl.className = 'text-xs text-green-500 mt-1';

    } else if (data.type === 'ai_response_start') {
      // AI is starting to stream response
      console.log('🤖 AI streaming started');
      updateStatus('🤖 AI responding...', 'connected');
      startAIResponseStreaming();

      // Start collecting audio
      audioChunks = [];
      isCollectingAudio = true;
      currentAIText = ''; // Reset text tracker

    } else if (data.type === 'ai_response_chunk') {
      // Append streaming chunk
      appendAIResponseChunk(data.text);
      currentAIText += data.text; // Track full AI response

    } else if (data.type === 'ai_response_end') {
      // AI finished streaming
      console.log('🤖 AI streaming completed');
      updateStatus('✅ AI finished', 'connected');
      finishAIResponseStreaming();

      // Reset speech indicator
      setTimeout(() => {
        speechIndicatorEl.className = 'mb-6 p-5 bg-gray-50 border-2 border-gray-200 rounded-lg text-center transition-all duration-300';
        speechStatusEl.textContent = 'Listening...';
        speechStatusEl.className = 'text-lg font-semibold text-gray-600';
        aiActionEl.textContent = 'Waiting for speech';
        aiActionEl.className = 'text-xs text-gray-400 mt-1';
        updateStatus('Recording... Speak into your microphone', 'connected');
      }, 1000);

    } else if (data.type === 'ai_response') {
      // Fallback for non-streaming response (error case)
      console.log('🤖 AI responded:', data.text);
      updateStatus('🤖 AI responded', 'connected');
      displayAIResponse(data.text);

    } else if (data.type === 'audio_chunk') {
      // Collect audio chunks
      if (isCollectingAudio) {
        audioChunks.push(data.audio);
        console.log(`📦 Received audio chunk ${audioChunks.length}`);
      }

    } else if (data.type === 'audio_end') {
      console.log(`🔊 Playing complete audio (${audioChunks.length} chunks)`);
      isCollectingAudio = false;
      playCompleteAudio();

    } else if (data.type === 'interrupt_ai') {
      console.log('🛑 AI interrupted by server');
      stopAudioPlayback();

    } else if (data.type === 'transcript') {
      displayTranscript(data.text, data.is_final);
    } else if (data.type === 'error') {
      updateStatus(`Error: ${data.message}`, 'error');
      console.error('Transcription error:', data.message);
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    updateStatus('Connection error', 'error');
  };

  websocket.onclose = () => {
    console.log('WebSocket closed');
    if (isRecording) {
      updateStatus('Disconnected from server', 'error');
    }
  };
}

// Display transcript text
let currentInterim = '';
let finalTranscript = '';

function displayTranscript(text, isFinal) {
  if (isFinal) {
    // Add final transcript
    finalTranscript += `<div class="my-3 text-blue-600"><strong>You:</strong> ${text}</div>`;
    currentInterim = '';
  } else {
    // Update interim transcript
    currentInterim = text;
  }

  // Display combined transcript
  const combined = finalTranscript + (currentInterim ? `<div class="my-3 text-gray-400 italic"><strong>You:</strong> ${currentInterim}</div>` : '');

  if (combined.trim()) {
    transcriptEl.innerHTML = combined;
    // Auto-scroll to bottom
    transcriptEl.parentElement.scrollTop = transcriptEl.parentElement.scrollHeight;
  }
}

// Display AI response (non-streaming fallback)
function displayAIResponse(text) {
  finalTranscript += `<div class="my-3 text-green-600"><strong>AI:</strong> ${text}</div>`;
  transcriptEl.innerHTML = finalTranscript;

  // Auto-scroll to bottom
  transcriptEl.parentElement.scrollTop = transcriptEl.parentElement.scrollHeight;
}

// Streaming AI response handlers
let currentAIResponse = '';
let aiResponseDiv = null;

function startAIResponseStreaming() {
  // Create a new div for the streaming AI response
  currentAIResponse = '';
  aiResponseDiv = document.createElement('div');
  aiResponseDiv.className = 'my-3 text-green-600';
  aiResponseDiv.innerHTML = '<strong>AI:</strong> ';

  // Append to transcript element
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = finalTranscript;
  tempContainer.appendChild(aiResponseDiv);
  transcriptEl.innerHTML = tempContainer.innerHTML;

  // Auto-scroll
  transcriptEl.parentElement.scrollTop = transcriptEl.parentElement.scrollHeight;
}

function appendAIResponseChunk(chunk) {
  if (!aiResponseDiv) return;

  currentAIResponse += chunk;

  // Update the AI response div with streaming text
  const tempContainer = document.createElement('div');
  tempContainer.innerHTML = finalTranscript;

  // Find or create the AI response div
  const updatedDiv = document.createElement('div');
  updatedDiv.className = 'my-3 text-green-600';
  updatedDiv.innerHTML = `<strong>AI:</strong> ${currentAIResponse}`;

  tempContainer.appendChild(updatedDiv);
  transcriptEl.innerHTML = tempContainer.innerHTML;

  // Auto-scroll to bottom
  transcriptEl.parentElement.scrollTop = transcriptEl.parentElement.scrollHeight;
}

function finishAIResponseStreaming() {
  // Commit the streamed response to finalTranscript with word spans for highlighting
  if (currentAIResponse.trim()) {
    const words = currentAIResponse.split(' ');
    const wordsHtml = words.map((word, index) =>
      `<span class="ai-word transition-all duration-100" data-word-index="${index}">${word}</span>`
    ).join(' ');

    const responseDiv = `<div id="current-ai-response" class="my-3 text-green-600"><strong>AI:</strong> ${wordsHtml}</div>`;
    finalTranscript += responseDiv;
    transcriptEl.innerHTML = finalTranscript;

    // Store reference to current AI response for highlighting
    currentAIResponseDiv = document.getElementById('current-ai-response');
  }

  // Reset streaming state
  currentAIResponse = '';
  aiResponseDiv = null;

  // Auto-scroll
  transcriptEl.parentElement.scrollTop = transcriptEl.parentElement.scrollHeight;
}

// Audio playback - collect all chunks then play as single audio
function playCompleteAudio() {
  if (audioChunks.length === 0) {
    console.log('No audio chunks to play');
    return;
  }

  try {
    console.log(`Playing ${audioChunks.length} audio chunks as complete stream`);

    // Decode each chunk separately and combine binary data
    const allBytes = [];
    for (const chunk of audioChunks) {
      const binaryString = atob(chunk);
      for (let i = 0; i < binaryString.length; i++) {
        allBytes.push(binaryString.charCodeAt(i));
      }
    }

    // Convert to Uint8Array
    const bytes = new Uint8Array(allBytes);

    console.log(`Total audio size: ${bytes.length} bytes`);

    // Create blob from complete audio
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);

    // Play audio
    currentAudioElement = new Audio(url);

    // Add loadeddata event to ensure audio is ready
    currentAudioElement.addEventListener('loadeddata', () => {
      console.log('Audio loaded, duration:', currentAudioElement.duration);
    });

    currentAudioElement.addEventListener('canplaythrough', () => {
      console.log('Audio can play through');
    });

    currentAudioElement.onended = () => {
      console.log('✅ Audio playback finished');
      URL.revokeObjectURL(url);
      currentAudioElement = null;
      isAIPlaying = false;

      // Clear word highlighting
      if (wordHighlightInterval) {
        clearInterval(wordHighlightInterval);
        wordHighlightInterval = null;
      }

      // Remove highlight from all words
      if (currentAIResponseDiv) {
        const words = currentAIResponseDiv.querySelectorAll('.ai-word');
        words.forEach(word => {
          word.className = 'ai-word transition-all duration-100';
        });
      }
    };

    currentAudioElement.onerror = (e) => {
      console.error('Audio playback error:', e, currentAudioElement.error);
      URL.revokeObjectURL(url);
      currentAudioElement = null;
      isAIPlaying = false;
    };

    // Set flag before playing
    isAIPlaying = true;

    currentAudioElement.play().catch(err => {
      console.error('Play error:', err);
      isAIPlaying = false;
    });

    // Start word highlighting
    startWordHighlighting();

  } catch (error) {
    console.error('Error playing complete audio:', error);
  }
}

// Highlight words as they're being spoken
function startWordHighlighting() {
  if (!currentAIResponseDiv || !currentAudioElement) return;

  const words = currentAIResponseDiv.querySelectorAll('.ai-word');
  const totalWords = words.length;
  const audioDuration = currentAudioElement.duration;

  if (!audioDuration || audioDuration === 0 || totalWords === 0) return;

  // Average time per word
  const timePerWord = audioDuration / totalWords;

  // Update highlighting every 50ms
  wordHighlightInterval = setInterval(() => {
    if (!currentAudioElement || currentAudioElement.paused) {
      clearInterval(wordHighlightInterval);
      return;
    }

    const currentTime = currentAudioElement.currentTime;
    const currentWordIndex = Math.floor(currentTime / timePerWord);

    // Remove previous highlights
    words.forEach(word => {
      word.className = 'ai-word transition-all duration-100';
    });

    // Highlight current word
    if (currentWordIndex < totalWords) {
      words[currentWordIndex].className = 'ai-word transition-all duration-100 bg-yellow-200 font-bold px-1 py-0.5 rounded';
    }
  }, 50);
}

function stopAudioPlayback() {
  // Clear collected chunks
  audioChunks = [];
  isCollectingAudio = false;

  // Stop current audio
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
    currentAudioElement = null;
  }

  // Clear word highlighting
  if (wordHighlightInterval) {
    clearInterval(wordHighlightInterval);
    wordHighlightInterval = null;
  }

  // Remove highlight from all words
  if (currentAIResponseDiv) {
    const words = currentAIResponseDiv.querySelectorAll('.ai-word');
    words.forEach(word => {
      word.className = 'ai-word transition-all duration-100';
    });
  }

  isAIPlaying = false;
  console.log('🛑 Audio playback stopped');
}

// Convert Float32Array to 16-bit PCM
function float32To16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);

  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return buffer;
}

// Update audio level meter
function updateAudioLevel() {
  if (!analyser || !isRecording) return;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);

  // Calculate RMS (root mean square) for volume
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const normalized = (dataArray[i] - 128) / 128;
    sum += normalized * normalized;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const level = Math.min(100, Math.floor(rms * 200));

  // Update meter display
  meterFillEl.style.width = `${level}%`;
  audioLevelEl.textContent = `${level}%`;

  // Log if we're getting audio
  if (level > 5) {
    console.log('Audio detected:', level + '%');
  }

  requestAnimationFrame(updateAudioLevel);
}

// Process audio with ScriptProcessorNode (fallback for compatibility)
function processAudioWithScriptProcessor(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 16000
  });

  const source = audioContext.createMediaStreamSource(stream);

  // Create analyser for level monitoring
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  // Create script processor (buffer size: 4096)
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  let packetCount = 0;
  processor.onaudioprocess = (e) => {
    if (!isRecording || !websocket || websocket.readyState !== WebSocket.OPEN) {
      return;
    }

    const inputData = e.inputBuffer.getChannelData(0);
    const pcmData = float32To16BitPCM(inputData);

    // Send audio data to server
    websocket.send(pcmData);

    // Log every 50th packet to verify audio is being sent
    packetCount++;
    if (packetCount % 50 === 0) {
      console.log(`Sent ${packetCount} audio packets (${(pcmData.byteLength / 1024).toFixed(1)} KB total)`);
    }
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  // Start level monitoring
  updateAudioLevel();

  return processor;
}

// Start recording
async function startRecording() {
  try {
    updateStatus('Requesting microphone access...');

    // Get microphone access
    const audioConstraints = {
      channelCount: 1,
      sampleRate: 16000,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    // Add device ID if selected
    if (selectedDeviceId) {
      audioConstraints.deviceId = { exact: selectedDeviceId };
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: audioConstraints
    });

    updateStatus('Microphone access granted');

    // Connect WebSocket
    connectWebSocket();

    // Process audio
    audioWorkletNode = processAudioWithScriptProcessor(mediaStream);

    isRecording = true;

    // Update UI
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    speechIndicatorEl.classList.remove('hidden');
    audioMeterEl.classList.remove('hidden');
    transcriptEl.innerHTML = '';
    finalTranscript = '';
    currentInterim = '';

    // Initialize speech indicator
    speechIndicatorEl.className = 'mb-6 p-5 bg-gray-50 border-2 border-gray-200 rounded-lg text-center transition-all duration-300';
    speechStatusEl.textContent = 'Listening...';
    speechStatusEl.className = 'text-lg font-semibold text-gray-600';
    aiActionEl.textContent = 'Waiting for speech';
    aiActionEl.className = 'text-xs text-gray-400 mt-1';

    updateStatus('Recording... Speak into your microphone', 'connected');

  } catch (error) {
    console.error('Error starting recording:', error);
    updateStatus(`Failed to start: ${error.message}`, 'error');
    stopRecording();
  }
}

// Stop recording
function stopRecording() {
  isRecording = false;

  // Stop media stream
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }

  // Close audio context
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  // Disconnect audio worklet
  if (audioWorkletNode) {
    audioWorkletNode.disconnect();
    audioWorkletNode = null;
  }

  // Close WebSocket
  if (websocket) {
    websocket.send(JSON.stringify({ type: 'stop' }));
    websocket.close();
    websocket = null;
  }

  // Update UI
  startBtn.classList.remove('hidden');
  stopBtn.classList.add('hidden');
  speechIndicatorEl.classList.add('hidden');
  audioMeterEl.classList.add('hidden');
  updateStatus('Recording stopped');
}

// Event listeners
startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

// Load devices on page load
window.addEventListener('load', () => {
  loadAudioDevices();
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (isRecording) {
    stopRecording();
  }
});
