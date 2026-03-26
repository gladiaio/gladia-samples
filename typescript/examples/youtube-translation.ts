import { GladiaClient } from '@gladiaio/sdk';

const gladiaClient = new GladiaClient();
const result = await gladiaClient
  .preRecorded()
  .transcribe('https://www.youtube.com/watch?v=hbhTVIa9arE', {
    language_config: {
      languages: ['en', 'ko', 'zh', 'mn', 'ru', 'ja'],
      code_switching: true,
    },
    custom_vocabulary_config: {
      vocabulary: [
        'aaruul',
        { value: 'mutton' },
        {
          value: 'Misha',
          pronunciations: ['micha, misha, mi cha, mi sha'],
          intensity: 0.4,
          language: 'de',
        },
      ],
      default_intensity: 0.6,
    },
    translation: true,
    translation_config: {
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
