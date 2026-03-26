import { GladiaClient } from '@gladiaio/sdk';
import 'dotenv/config';

const gladiaClient = new GladiaClient();
const audioPath = '../data/call-center-example.mp4';

const result = await gladiaClient.preRecorded().transcribe(audioPath, {
  language_config: {
    languages: ['en'],
  },
  sentiment_analysis: true,
  diarization: true,
  diarization_config: {
    number_of_speakers: 2,
    // max_speakers: 2,
    // min_speakers: 1,
  },
});

console.log(result.result?.sentiment_analysis?.results ?? '');
