/**
 * API client for direct connection to Express server
 * Updated to match UNIFIED_PLAN_B.md - includes token authentication
 */

const SERVER_URL = 'http://localhost:3001';

export interface SessionResponse {
  sessionId: string;
  token: string;
}

/**
 * Create a new session by calling the Express server directly
 * Returns both sessionId and ephemeral token for WebSocket authentication
 */
export async function createSession(): Promise<SessionResponse> {
  try {
    const response = await fetch(`${SERVER_URL}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    const data: SessionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Get WebSocket URL for direct connection to Express server
 * Updated to include token for authentication
 */
export function getWebSocketUrl(sessionId: string, token: string): string {
  return `ws://localhost:3001/ws?sessionId=${sessionId}&token=${token}`;
}
