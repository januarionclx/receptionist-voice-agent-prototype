/**
 * OpenAI API Configuration
 */

import OpenAI from 'openai';

export const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  realtimeModel: 'gpt-4o-realtime-preview-2025-06-03',
  supervisorModel: 'gpt-4.1',
  audioFormat: 'pcm16' as const,
} as const;

// Validate configuration
if (!OPENAI_CONFIG.apiKey) {
  console.warn('⚠️  WARNING: OPENAI_API_KEY is not set in environment variables');
}

/**
 * OpenAI client instance
 */
export const openai = new OpenAI({
  apiKey: OPENAI_CONFIG.apiKey,
});
