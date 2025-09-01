import * as http from 'http';
import * as dotenv from 'dotenv';
import { WebSocket, WebSocketServer } from 'ws';
import { createSession } from './gladiaClient';
import { processMessage, handleGladia } from './handlers';
import { GladiaSession } from './types';

// Load environment variables
dotenv.config();

// Constants
const DEFAULT_PORT = '5001';

// Global variables
let gladiaAPIKey: string;
let session: GladiaSession;

async function main() {
  // Configure logging
  console.log = (...args) => {
    const date = new Date().toISOString();
    process.stdout.write(`${date} ${args.join(' ')}\n`);
  };

  // Get API key
  gladiaAPIKey = process.env.GLADIA_API_KEY || '';
  if (!gladiaAPIKey) {
    console.error('GLADIA_API_KEY environment variable is required');
    process.exit(1);
  }

  // Get port
  const port = process.env.HTTP_PORT || DEFAULT_PORT;

  try {
    // Initialize Gladia session
    session = await createSession(gladiaAPIKey);
  } catch (error) {
    console.error(`Failed to create initial Gladia session: ${error}`);
    process.exit(1);
  }

  // Create HTTP server
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      // Health check endpoint
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'twilio-gladia-transcription'
      }));
    } else {
      // For regular HTTP requests to root, return a simple info page
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Twilio-Gladia Transcription Server\n\nAvailable endpoints:\n- /media (WebSocket): Connect Twilio Media Streams\n- /health (HTTP): Health check endpoint');
    }
  });

  // Create WebSocket server
  const wss = new WebSocketServer({ server });

  // Handle WebSocket connections
  wss.on('connection', async (twilioConn: WebSocket, req: http.IncomingMessage) => {
    const clientInfo = req.socket.remoteAddress || 'unknown';
    console.log(`🔌 Twilio WebSocket connected from ${clientInfo} on path ${req.url}`);

    try {
      // Connect to Gladia
      const gladiaConn = new WebSocket(session.url);
      
      // Handle connection errors
      gladiaConn.on('error', (error) => {
        console.error(`Error with Gladia connection: ${error}`);
        twilioConn.close();
      });

      // Wait for Gladia connection to open
      await new Promise<void>((resolve, reject) => {
        gladiaConn.on('open', () => {
          console.log(`Connected to Gladia session ${session.id}`);
          resolve();
        });
        gladiaConn.on('error', reject);
      });

      // Handle messages from Twilio
      twilioConn.on('message', (message: Buffer) => {
        try {
          processMessage(message, gladiaConn);
        } catch (error) {
          console.error(`Error processing Twilio message: ${error}`);
        }
      });

      // Handle messages from Gladia
      gladiaConn.on('message', (message: Buffer) => {
        try {
          handleGladia(message);
        } catch (error) {
          console.error(`Error processing Gladia message: ${error}`);
        }
      });

      // Handle Twilio connection close
      twilioConn.on('close', () => {
        console.log(`Twilio connection closed from ${clientInfo}`);
        gladiaConn.close();
      });

      // Handle Gladia connection close
      gladiaConn.on('close', () => {
        console.log('Gladia connection closed');
        twilioConn.close();
      });

    } catch (error) {
      console.error(`Failed to establish connection to Gladia: ${error}`);
      twilioConn.close();
    }
  });

  // Start the server
  server.listen(parseInt(port), '0.0.0.0', () => {
    console.log(`🚀 Starting server on 0.0.0.0:${port}`);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Server shutting down...');
    server.close(() => {
      console.log('Server stopped');
      process.exit(0);
    });
  });
}

main().catch(error => {
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});