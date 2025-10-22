import { WebSocketServer } from 'ws';

export function createWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.send(JSON.stringify({ type: 'connected' }));
  });
  
  return wss;
}
