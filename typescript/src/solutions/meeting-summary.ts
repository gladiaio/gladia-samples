import { GladiaClient } from '@gladiaio/sdk';

const gladiaClient = new GladiaClient();
const result = await gladiaClient.preRecorded().transcribe('../data/call-center-example.mp4', {
  summarization: true,
});

console.log(result.result?.summarization?.results ?? '');
