import { GladiaClient } from '@gladiaio/sdk';

const gladiaClient = new GladiaClient();
const result = await gladiaClient
  .preRecorded()
  .transcribe('../data/call-center-example.mp4', {
    summarization: true,
    summarization_config: {
      // check all the summarization options at https://docs.gladia.io/chapters/audio-intelligence/summarization
      type: 'bullet_points',
    },
  });

console.log(result.result?.summarization?.results ?? '');
