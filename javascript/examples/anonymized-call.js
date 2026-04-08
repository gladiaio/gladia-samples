import { GladiaClient } from '@gladiaio/sdk';
import 'dotenv/config';

const gladiaClient = new GladiaClient();

const result = await gladiaClient
  .preRecorded()
  .transcribe('../data/call-center-example.mp4', {
    pii_redaction: true,
    pii_redaction_config: {
      // Check all the supported entity types at https://docs.gladia.io/chapters/audio-intelligence/pii-redaction
      entity_types: ['GDPR'],
      processed_text_type: 'MASK',
    },
  });

console.log(result.result?.transcription?.full_transcript ?? '');
