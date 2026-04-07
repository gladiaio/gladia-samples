import { GladiaClient } from '@gladiaio/sdk';
import 'dotenv/config';

const gladiaClient = new GladiaClient();
const result = await gladiaClient
  .preRecorded()
  .transcribe('https://www.youtube.com/watch?v=hbhTVIa9arE', {
    language_config: {
      // check all the supported languages at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
      languages: ['en', 'ko', 'zh', 'mn', 'ru', 'ja'],
      code_switching: true,
    },
    // Want to know more about custom vocabulary? check https://docs.gladia.io/chapters/audio-intelligence/custom-vocabulary

    custom_vocabulary_config: {
      vocabulary: [
        'aaruul',
        { value: 'mutton' },
        {
          value: 'Misha',
          pronunciations: ['micha', 'misha', 'mi cha', 'mi sha'],
          intensity: 0.4,
          language: 'ko',
        },
      ],
      default_intensity: 0.6,
    },
    // Want to know more about translation and subtitles ? Check https://docs.gladia.io/chapters/audio-intelligence/translation
    translation: true,
    translation_config: {
      // check all the supported languages for translation at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
      target_languages: ['en'],
    },
  });

console.log(
  'Transcription: ',
  result.result?.transcription?.full_transcript ?? '',
);
console.log('--------------------------------');
console.log(
  'Translation: ',
  result.result?.translation?.results?.[0]?.full_transcript ?? '',
);
