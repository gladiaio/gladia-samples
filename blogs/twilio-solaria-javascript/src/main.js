const http = require('http');
const WebSocket = require('ws');
const dotenv = require('dotenv');
const fetch = require('node-fetch');
const { fileURLToPath } = require('url');
const path = require('path');
const fs = require('fs');

// Constants
const GLADIA_INIT_URL = 'https://api.gladia.io/v2/live';

// Load environment variables
dotenv.config();

// Global variables
let gladiaAPIKey = process.env.GLADIA_API_KEY;
let session = null;

// Create a Gladia session for real-time transcription
async function createSession() {
  // μ-law, 8-bit, 8 kHz, mono
  const payload = {
    encoding: 'wav/ulaw',
    bit_depth: 8,
    sample_rate: 8000,
    channels: 1
  };

  try {
    const response = await fetch(GLADIA_INIT_URL, {
      method: 'POST',
      headers: {
        'X-Gladia-Key': gladiaAPIKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      timeout: 10000
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Bad status code: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    console.log(`🛰 Gladia session ID: ${data.id}`);
    return data;
  } catch (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }
}

// Process Twilio messages, decode μ-law audio and forward to Gladia
function processMessage(message, gladiaConn) {
  try {
    const msg = JSON.parse(message);
    if (msg.event !== 'media') {
      console.log(`Ignoring non-media event: ${msg.event}`);
      return; // Ignore non-media events
    }
    
    // Decode base64 payload to get raw μ-law bytes
    const mulaw = Buffer.from(msg.media.payload, 'base64');
    
    gladiaConn.send(mulaw, { binary: true }, (err) => {
      if (err) {
        console.log(`Error sending to Gladia: ${err}`);
      }
    });
  } catch (error) {
    console.log(`Error parsing Twilio message: ${error}`);
  }
}

// Handle messages from Gladia and extract final transcripts
function handleGladia(message) {
  try {
    const msg = JSON.parse(message);
    if (msg.type === 'transcript' && msg.data.is_final) {
      const transcript = msg.data.utterance.text;
      console.log(`📝 Transcript: ${transcript}`);
      return transcript;
    }
    return '';
  } catch (error) {
    console.log(`Error parsing Gladia message: ${error}`);
    return '';
  }
}

// Handle WebSocket connections from Twilio
function handleWebSocket(twilioConn) {
  const clientInfo = twilioConn._socket.remoteAddress;
  console.log(`🔌 Twilio WebSocket connected from ${clientInfo}`);
  
  // Connect to Gladia
  const gladiaConn = new WebSocket(session.url);
  
  gladiaConn.on('open', () => {
    console.log(`Connected to Gladia session ${session.id}`);
    
    // Handle incoming messages from Twilio
    twilioConn.on('message', (msg) => {
      processMessage(msg, gladiaConn);
    });
    
    // Handle errors from Twilio connection
    twilioConn.on('error', (error) => {
      console.log(`Error from Twilio: ${error}`);
    });
    
    // Handle Twilio connection close
    twilioConn.on('close', () => {
      console.log('Twilio connection closed');
      gladiaConn.close();
    });
  });
  
  // Handle messages from Gladia
  gladiaConn.on('message', (msg) => {
    handleGladia(msg.toString());
  });
  
  // Handle errors from Gladia connection
  gladiaConn.on('error', (error) => {
    console.log(`Error from Gladia: ${error}`);
  });
  
  // Handle Gladia connection close
  gladiaConn.on('close', () => {
    console.log('Gladia connection closed');
    twilioConn.close();
  });
}

// Initialize and start the server
async function main() {
  // Check for API key
  if (!gladiaAPIKey) {
    console.error('GLADIA_API_KEY environment variable is required');
    process.exit(1);
  }
  
  // Get port from environment or use default
  const port = process.env.HTTP_PORT || 5001;
  
  try {
    // Create initial Gladia session
    session = await createSession();
    
    // Create HTTP server
    const server = http.createServer((req, res) => {
      // Handle health check endpoint
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          service: 'twilio-gladia-transcription' 
        }));
        return;
      }
      
      // Default message for HTTP requests
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Twilio-Gladia Transcription Server\n\nAvailable endpoints:\n- /media (WebSocket): Connect Twilio Media Streams\n- /health (HTTP): Health check endpoint');
    });
    
    // Create WebSocket server
    const wss = new WebSocket.Server({ server });
    
    // Handle WebSocket connections
    wss.on('connection', (ws, req) => {
      console.log(`🔌 WebSocket connected to ${req.url}`);
      handleWebSocket(ws);
    });
    
    // Start the server
    server.listen(port, () => {
      console.log(`🚀 Starting server on 0.0.0.0:${port}`);
    });
    
  } catch (error) {
    console.error(`Server initialization failed: ${error}`);
    process.exit(1);
  }
}

// Start the application
main().catch(err => {
  console.error(`Unhandled error: ${err}`);
  process.exit(1);
});