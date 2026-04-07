import { GladiaClient } from '@gladiaio/sdk';
import 'dotenv/config';

const gladiaClient = new GladiaClient();
const audioPath = '../data/call-center-example.mp4';

const result = await gladiaClient.preRecorded().transcribe(audioPath, {
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
    // max_speakers: 2,
    // min_speakers: 1,
  },
});

console.log(result.result?.sentiment_analysis?.results ?? '');
