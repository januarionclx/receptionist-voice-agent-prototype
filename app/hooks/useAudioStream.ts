'use client';

import { useState } from 'react';

/**
 * Hook for managing audio stream state
 *
 * @example
 * ```tsx
 * const { audioStream, startAudio, stopAudio } = useAudioStream();
 *
 * // Start capturing audio
 * const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
 * startAudio(stream);
 *
 * // Stop audio
 * stopAudio();
 * ```
 */
export function useAudioStream() {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  const startAudio = (stream: MediaStream) => {
    setAudioStream(stream);
  };

  const stopAudio = () => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    setAudioStream(null);
  };

  return {
    audioStream,
    startAudio,
    stopAudio,
  };
}
