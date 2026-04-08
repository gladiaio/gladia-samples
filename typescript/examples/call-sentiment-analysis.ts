import { GladiaClient } from '@gladiaio/sdk';
import 'dotenv/config';

const gladiaClient = new GladiaClient();
const result = await gladiaClient
  .preRecorded()
  .transcribe('../data/call-center-example.mp4', {
    language_config: {
      // check all the supported languages at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
      languages: ['en'],
    },
    // check all the sentiment/ emotion supported at https://docs.gladia.io/chapters/audio-intelligence/sentiment-analysis#sentiment-and-emotion-analysis
    sentiment_analysis: true,
    // Tip: Enabling diarization and sentiment analysis will extract, for each speaker, the sentiment and emotion of each sentence. Diarization is optional, but it is recommended to enable it when sentiment analysis is enabled.
    diarization: true,
    diarization_config: {
      // Setting the number of speakers, if known, will enhance the accuracy/stability of the diarization.
      number_of_speakers: 2,
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
