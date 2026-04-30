import { type LiveV2InitRequest, type LiveV2InitResponse } from '@gladiaio/sdk';
import axios from 'axios';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import WebSocket from 'ws';
import {
  getGladiaApiKey,
  getGladiaApiUrl,
  getGladiaRegion,
} from '../../env.js';
import { printMessage } from './live_helpers.js';

const filePath = '../data/anna-and-sasha-16000.wav';
const chunkDurationMs = 100;
const reconnectAfterSeconds = 30;

const httpClient = axios.create({
  baseURL: getGladiaApiUrl(),
  headers: {
    'x-gladia-key': getGladiaApiKey(),
    'Content-Type': 'application/json',
  },
  params: {
    region: getGladiaRegion(),
  },
});

const config: LiveV2InitRequest = {
  language_config: {
    languages: ['es', 'ru', 'en', 'fr'],
    code_switching: true,
  },
  messages_config: {
    receive_partial_transcripts: false,
    receive_final_transcripts: true,
  },
};

type AudioFormat = Required<
  Pick<LiveV2InitRequest, 'encoding' | 'sample_rate' | 'channels' | 'bit_depth'>
>;
type AudioFile = AudioFormat & { audioData: Buffer };

function parseAudioFile(filePath: string): AudioFile {
  const textDecoder = new TextDecoder();
  const buffer = readFileSync(resolve(filePath));

  if (
    textDecoder.decode(buffer.subarray(0, 4)) !== 'RIFF' ||
    textDecoder.decode(buffer.subarray(8, 12)) !== 'WAVE' ||
    textDecoder.decode(buffer.subarray(12, 16)) !== 'fmt '
  ) {
    throw new Error('Unsupported file format');
  }

  const fmtSize = buffer.readUInt32LE(16);
  const format = buffer.readUInt16LE(20);
  let encoding: AudioFormat['encoding'];
  if (format === 1) {
    encoding = 'wav/pcm';
  } else if (format === 6) {
    encoding = 'wav/alaw';
  } else if (format === 7) {
    encoding = 'wav/ulaw';
  } else {
    throw new Error('Unsupported encoding');
  }

  const channels = buffer.readUInt16LE(22) as AudioFormat['channels'];
  const sample_rate = buffer.readUInt32LE(24) as AudioFormat['sample_rate'];
  const bit_depth = buffer.readUInt16LE(34) as AudioFormat['bit_depth'];

  let nextSubChunk = 16 + 4 + fmtSize;
  while (
    textDecoder.decode(buffer.subarray(nextSubChunk, nextSubChunk + 4)) !==
    'data'
  ) {
    nextSubChunk += 8 + buffer.readUInt32LE(nextSubChunk + 4);
  }

  const dataStart = nextSubChunk + 8;
  const dataLength = buffer.readUInt32LE(nextSubChunk + 4);
  const audioData = buffer.subarray(dataStart, dataStart + dataLength);

  return {
    encoding,
    sample_rate,
    channels,
    bit_depth,
    audioData,
  };
}

async function initLiveSession(
  audioFile: AudioFile,
): Promise<LiveV2InitResponse> {
  return (
    await httpClient.post<LiveV2InitResponse>('/v2/live', {
      encoding: audioFile.encoding,
      sample_rate: audioFile.sample_rate,
      channels: audioFile.channels,
      bit_depth: audioFile.bit_depth,
      ...config,
    })
  ).data;
}

async function start() {
  const audioFile = parseAudioFile(filePath);
  const bytesPerSample = audioFile.bit_depth / 8;
  const bytesPerSecond =
    audioFile.sample_rate * audioFile.channels * bytesPerSample;
  const chunkSize = Math.max(
    1,
    Math.floor((chunkDurationMs / 1000) * bytesPerSecond),
  );
  const reconnectOffset = Math.floor(reconnectAfterSeconds * bytesPerSecond);

  const initiated = await initLiveSession(audioFile);
  let offset = 0;
  let hasResumed = false;
  let stopSent = false;
  let connectionAttempt = 0;

  console.log();
  console.log(
    `################ Begin session ${initiated.id} ################`,
  );
  console.log();

  const runSocket = async (): Promise<void> => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      connectionAttempt += 1;
      const attempt = connectionAttempt;
      const socket = new WebSocket(initiated.url);
      let interval: NodeJS.Timeout | null = null;

      const clearTicker = () => {
        if (!interval) return;
        clearInterval(interval);
        interval = null;
      };

      socket.addEventListener('open', () => {
        if (attempt === 1) {
          console.log('>>>>> WebSocket connected (initial stream)');
        } else {
          console.log(
            `>>>>> WebSocket reconnected (attempt ${attempt}) - resumed at ${(offset / bytesPerSecond).toFixed(2)}s`,
          );
        }

        interval = setInterval(() => {
          if (offset >= audioFile.audioData.length) {
            clearTicker();
            if (!stopSent) {
              stopSent = true;
              console.log('>>>>> Sent all audio data, sending stop_recording');
              socket.send(JSON.stringify({ type: 'stop_recording' }));
            }
            return;
          }

          const nextOffset = Math.min(
            offset + chunkSize,
            audioFile.audioData.length,
          );
          socket.send(audioFile.audioData.subarray(offset, nextOffset));
          offset = nextOffset;

          if (!hasResumed && offset >= reconnectOffset) {
            hasResumed = true;
            clearTicker();
            console.log(
              `>>>>> Simulating network drop at ${(offset / bytesPerSecond).toFixed(2)}s`,
            );
            socket.close(4000, 'Simulated drop');
          }
        }, chunkDurationMs);
      });

      socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data.toString());
        printMessage(message);
      });

      socket.addEventListener('error', (error) => {
        console.error(error);
      });

      socket.addEventListener('close', ({ code, reason }) => {
        clearTicker();
        const reasonText = reason.toString();

        if (code === 1000) {
          if (!stopSent) {
            rejectPromise(
              new Error(
                `Session closed before stop_recording (code=${code}, reason=${reasonText})`,
              ),
            );
            return;
          }
          console.log('>>>>> Session completed (close code 1000)');
          resolvePromise();
          return;
        }

        console.log(
          `>>>>> WebSocket closed (code=${code}, reason=${reasonText || 'n/a'})`,
        );

        if (!hasResumed) {
          rejectPromise(
            new Error(
              `WebSocket closed abnormally before resume: ${code} ${reasonText}`,
            ),
          );
          return;
        }

        console.log('>>>>> Reconnecting to the same session URL to resume...');
        setTimeout(() => {
          runSocket().then(resolvePromise).catch(rejectPromise);
        }, 500);
      });
    });
  };

  await runSocket();

  console.log();
  console.log(
    `################  End session ${initiated.id}  ################`,
  );
  console.log();
}

start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
