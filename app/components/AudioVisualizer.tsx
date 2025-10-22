'use client';

import { useRef, useEffect } from 'react';

export interface AudioVisualizerProps {
  /**
   * The audio stream to visualize
   */
  audioStream: MediaStream | null;

  /**
   * Whether the visualizer is active
   */
  isActive: boolean;

  /**
   * Canvas width in pixels
   * @default 300
   */
  width?: number;

  /**
   * Canvas height in pixels
   * @default 300
   */
  height?: number;

  /**
   * Base radius of the orb in pixels
   * @default 40
   */
  baseRadius?: number;

  /**
   * Number of bars radiating from center
   * @default 32
   */
  barCount?: number;

  /**
   * Number of segments per bar
   * @default 5
   */
  segments?: number;

  /**
   * CSS class name for the canvas element
   */
  className?: string;
}

/**
 * AudioVisualizer - A segmented radial bar visualizer component
 *
 * Displays audio as radial bars with frequency-based segments.
 * Inner segments react to low frequencies, outer to high frequencies.
 * Overall volume amplifies all segments.
 *
 * @example
 * ```tsx
 * <AudioVisualizer
 *   audioStream={stream}
 *   isActive={true}
 *   width={300}
 *   height={300}
 * />
 * ```
 */
export default function AudioVisualizer({
  audioStream,
  isActive,
  width = 300,
  height = 300,
  baseRadius = 40,
  barCount = 32,
  segments = 5,
  className = '',
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();

  useEffect(() => {
    drawIdleState();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!audioStream || !isActive) {
      cleanup();
      drawIdleState();
      return;
    }

    setupAudioAnalysis(audioStream);

    return () => {
      cleanup();
    };
  }, [audioStream, isActive]);

  const setupAudioAnalysis = (stream: MediaStream) => {
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);

    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;

    animate();
  };

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
  };

  const drawIdleState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw subtle pulsing circles in idle state
    for (let i = 0; i < 3; i++) {
      const radius = baseRadius + (i * 20);

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = `rgba(200, 200, 200, ${0.3 - i * 0.1})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Draw small dots around the circles
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * 2 * Math.PI;
      const radius = baseRadius + 40;

      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#d1d5db';
      ctx.fill();
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    if (!canvas || !analyser || !dataArray) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyser.getByteFrequencyData(dataArray);

    const centerX = width / 2;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Calculate overall volume
    let totalVolume = 0;
    for (let i = 0; i < dataArray.length; i++) {
      totalVolume += dataArray[i];
    }
    const avgVolume = totalVolume / dataArray.length / 255;

    // Draw multiple concentric rings that react to frequency bands
    const rings = segments;
    const bandSize = Math.floor(dataArray.length / rings);

    for (let ring = 0; ring < rings; ring++) {
      // Calculate ring intensity
      const bandStart = ring * bandSize;
      const bandEnd = Math.min(bandStart + bandSize, dataArray.length);

      let bandVolume = 0;
      for (let j = bandStart; j < bandEnd; j++) {
        bandVolume += dataArray[j];
      }
      bandVolume = bandVolume / (bandEnd - bandStart) / 255;

      const intensity = Math.min(1, bandVolume * 1.5 + avgVolume * 0.3);
      const radius = baseRadius + (ring * 20);

      // Draw smooth circle with varying opacity and width
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);

      const alpha = 0.2 + (intensity * 0.8);
      const lineWidth = 1 + (intensity * 3);

      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // Draw dots around the outer ring that pulse with audio
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * 2 * Math.PI;

      // Map each dot to a frequency
      const dataIndex = Math.floor((i / barCount) * dataArray.length);
      const amplitude = dataArray[dataIndex] / 255;

      const dotIntensity = Math.min(1, amplitude + avgVolume * 0.3);
      const radius = baseRadius + 40 + (dotIntensity * 15);

      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 2 + (dotIntensity * 2), 0, 2 * Math.PI);

      const alpha = 0.3 + (dotIntensity * 0.7);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fill();
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
