import { GladiaClient } from '@gladiaio/sdk';
import 'dotenv/config';

const gladiaClient = new GladiaClient();
const result = await gladiaClient
  .preRecorded()
  .transcribe('../data/call-center-example.mp4', {
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

const sentiments = result.result?.sentiment_analysis?.results;
if (!sentiments) {
  console.log('No sentiment results');
  process.exit(0);
}

type SentimentRow = {
  speaker: string;
  sentiment: string;
  emotion: string;
  text: string;
  start: number;
  end: number;
};
const list: SentimentRow[] =
  typeof sentiments === 'string' ? JSON.parse(sentiments) : sentiments;

for (let i = 0; i < list.length; i++) {
  const r = list[i];
  console.log(`Speaker ${r.speaker}: [${r.sentiment}] ${r.emotion}`);
  console.log(`  "${r.text}"`);
  console.log(`  ${r.start.toFixed(2)}s - ${r.end.toFixed(2)}s`);
}
