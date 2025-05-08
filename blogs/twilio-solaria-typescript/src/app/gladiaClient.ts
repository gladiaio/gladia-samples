import * as https from 'https';
import { GladiaSession } from './types';

// Constants
const GLADIA_INIT_URL = 'https://api.gladia.io/v2/live';

/**
 * Creates a Gladia real-time transcription session
 * @param apiKey Gladia API key
 * @returns Promise resolving to a session with ID and WebSocket URL
 */
export async function createSession(apiKey: string): Promise<GladiaSession> {
  // Define the payload for μ-law, 8-bit, 8 kHz, mono audio
  const payload = {
    encoding: 'wav/ulaw',
    bit_depth: 8,
    sample_rate: 8000,
    channels: 1
  };

  // Convert payload to JSON
  const body = JSON.stringify(payload);

  // Create and return a promise for the HTTP request
  return new Promise((resolve, reject) => {
    // Prepare the request options
    const options = {
      method: 'POST',
      headers: {
        'X-Gladia-Key': apiKey,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    // Make the HTTP request
    const req = https.request(GLADIA_INIT_URL, options, (res) => {
      // Check for successful status code
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        const statusCode = res.statusCode;
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          reject(new Error(`Bad status code: ${statusCode} - ${responseData}`));
        });
        
        return;
      }

      // Collect the response data
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });

      // Process the response when it's complete
      res.on('end', () => {
        try {
          const data = JSON.parse(responseData) as GladiaSession;
          console.log(`🛰 Gladia session ID: ${data.id}`);
          resolve(data);
        } catch (error) {
          reject(new Error(`Failed to decode response: ${error}`));
        }
      });
    });

    // Handle request errors
    req.on('error', (error) => {
      reject(new Error(`Session init request failed: ${error}`));
    });

    // Set timeout (10 seconds)
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    // Send the request body
    req.write(body);
    req.end();
  });
}