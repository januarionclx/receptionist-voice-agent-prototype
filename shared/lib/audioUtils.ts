/**
 * Shared audio utilities for PCM16 encoding/decoding
 * Used by both Express server and Next.js app
 */

/**
 * Convert Float32Array audio samples to PCM16 format (Int16)
 * MediaStream audio is Float32 (-1.0 to 1.0), OpenAI expects PCM16 (Int16)
 *
 * @param float32Array - Input audio samples as Float32Array
 * @returns PCM16 encoded audio as Int16Array
 */
export function float32ToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length);

  for (let i = 0; i < float32Array.length; i++) {
    // Clamp values to -1.0 to 1.0 range
    const clamped = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit integer range (-32768 to 32767)
    pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
  }

  return pcm16;
}

/**
 * Convert PCM16 Int16Array to Buffer/ArrayBuffer
 *
 * @param pcm16 - PCM16 audio as Int16Array
 * @returns ArrayBuffer for transmission
 */
export function pcm16ToBuffer(pcm16: Int16Array): ArrayBuffer {
  return pcm16.buffer;
}

/**
 * Convert Float32 audio directly to PCM16 buffer (combined operation)
 *
 * @param float32Array - Input audio samples
 * @returns PCM16 encoded audio as ArrayBuffer
 */
export function float32ToPCM16Buffer(float32Array: Float32Array): ArrayBuffer {
  const pcm16 = float32ToPCM16(float32Array);
  return pcm16ToBuffer(pcm16);
}

/**
 * Convert PCM16 buffer back to Float32Array for playback
 *
 * @param buffer - PCM16 audio as ArrayBuffer
 * @returns Float32Array for Web Audio API playback
 */
export function pcm16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const pcm16 = new Int16Array(buffer);
  const float32 = new Float32Array(pcm16.length);

  for (let i = 0; i < pcm16.length; i++) {
    // Convert from 16-bit integer to float (-1.0 to 1.0)
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
  }

  return float32;
}

/**
 * Convert PCM16 base64 string (from OpenAI) to ArrayBuffer
 *
 * @param base64 - Base64 encoded PCM16 audio
 * @returns ArrayBuffer
 */
export function base64ToPCM16Buffer(base64: string): ArrayBuffer {
  // Works in both Node.js and browser
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(base64, 'base64').buffer;
  } else {
    // Browser environment
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Convert ArrayBuffer to base64 string for transmission
 *
 * @param buffer - Audio data as ArrayBuffer
 * @returns Base64 encoded string
 */
export function bufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(buffer).toString('base64');
  } else {
    // Browser environment
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
