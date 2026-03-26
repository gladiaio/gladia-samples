import { GladiaClient } from '@gladiaio/sdk';
import 'dotenv/config';

const gladiaClient = new GladiaClient();
const audioPath = '../data/online-meeting-example.mp4';

const result = await gladiaClient.preRecorded().transcribe(audioPath);

console.log(result.result?.transcription?.full_transcript ?? '');
