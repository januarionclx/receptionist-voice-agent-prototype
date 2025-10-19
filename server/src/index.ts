import express, { Request, Response } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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
    version: '0.1.0',
  });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'AI Receptionist Server',
    version: '0.1.0',
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
  console.log('');
});
