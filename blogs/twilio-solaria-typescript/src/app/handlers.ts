import { WebSocket } from 'ws';
import { TwilioMessage, GladiaMessage } from './types';

/**
 * Processes messages from Twilio, decodes the base64 payload, and forwards to Gladia
 * @param message The raw message from Twilio
 * @param gladiaConn The WebSocket connection to Gladia
 */
export function processMessage(message: Buffer, gladiaConn: WebSocket): void {
  try {
    // Parse the message from Twilio
    const msg: TwilioMessage = JSON.parse(message.toString());
    
    // Ignore non-media events
    if (msg.event !== 'media') {
      console.log(`Ignoring non-media event: ${msg.event}`);
      return;
    }
    
    // Ensure we have a payload
    if (!msg.media || !msg.media.payload) {
      console.log('Missing media payload');
      return;
    }
    
    // Decode the base64 payload to get raw μ-law bytes
    const mulaw = Buffer.from(msg.media.payload, 'base64');
    
    // Forward the raw bytes to Gladia
    gladiaConn.send(mulaw, { binary: true }, (error) => {
      if (error) {
        console.error(`Error sending to Gladia: ${error}`);
      }
    });
  } catch (error) {
    console.error(`Error parsing Twilio message: ${error}`);
  }
}

/**
 * Processes messages from Gladia and logs final transcripts
 * @param message The raw message from Gladia
 * @returns The transcript text if final, empty string otherwise
 */
export function handleGladia(message: Buffer): string {
  try {
    // Parse the message from Gladia
    const msg: GladiaMessage = JSON.parse(message.toString());
    
    // Check if this is a final transcript
    if (msg.type === 'transcript' && msg.data?.is_final) {
      const transcript = msg.data.utterance.text;
      console.log(`📝 Transcript: ${transcript}`);
      return transcript;
    }
    
    return '';
  } catch (error) {
    console.error(`Error parsing Gladia message: ${error}`);
    return '';
  }
}