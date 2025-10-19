import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the server directory FIRST
dotenv.config({ path: path.join(__dirname, '../.env') });

// Now import the config after env vars are loaded
import { OPENAI_CONFIG } from './config/openai';


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ai-receptionist-server',
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║          AI Receptionist Server - Started             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`🚀 Server:      http://localhost:${PORT}`);
  console.log(`🏥 Health:      http://localhost:${PORT}/health`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 OpenAI:      ${OPENAI_CONFIG.apiKey ? 'configured' : 'not configured'}`);
  console.log('');
});
