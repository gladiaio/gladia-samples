import { GladiaClient } from '@gladiaio/sdk';

const gladiaClient = new GladiaClient();
const result = await gladiaClient
  .preRecorded()
  .transcribe('../data/call-center-example.mp4', {
    pii_redaction: true,
    pii_redaction_config: {
      // @ts-expect-error - check all supported entity types at https://docs.gladia.io/chapters/audio-intelligence/named-entity-recognition
      entity_types: ['GDPR'],
      processed_text_type: 'MASK',
    },
  });

console.log(result.result?.transcription?.full_transcript ?? '');
