import { WebSocketServer, WebSocket } from 'ws';

type SessionConnection = {
  sessionId: string;
  ws: WebSocket;
  connectedAt: Date;
};

const activeConnections = new Map<string, SessionConnection>();

export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    console.log('Client connected');
    
    // Extract session ID from query params
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      ws.close(1008, 'Session ID required');
      return;
    }
    
    // Store the connection
    activeConnections.set(sessionId, {
      sessionId,
      ws,
      connectedAt: new Date()
    });
    
    console.log(`Session ${sessionId} connected. Total active: ${activeConnections.size}`);
    
    ws.send(JSON.stringify({ 
      type: 'connected', 
      sessionId,
      activeConnections: activeConnections.size 
    }));
    
    ws.on('close', () => {
      activeConnections.delete(sessionId);
      console.log(`Session ${sessionId} disconnected. Total active: ${activeConnections.size}`);
    });
    
    ws.on('error', (error) => {
      console.error(`WebSocket error for session ${sessionId}:`, error);
      activeConnections.delete(sessionId);
    });
  });
  
  return wss;
}

export function sendToSession(sessionId: string, message: any) {
  const connection = activeConnections.get(sessionId);
  if (connection && connection.ws.readyState === WebSocket.OPEN) {
    connection.ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

export function getActiveSessions() {
  return Array.from(activeConnections.keys());
}

export function getConnectionCount() {
  return activeConnections.size;
}
