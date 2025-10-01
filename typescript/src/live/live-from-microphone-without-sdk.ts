import { type LiveV2InitRequest, type LiveV2InitResponse } from '@gladiaio/sdk';
import axios from 'axios';
import WebSocket from 'ws';
import { getGladiaApiKey, getGladiaApiUrl, getGladiaRegion } from '../env.js';
import {
  getMicrophoneAudioFormat,
  initMicrophoneRecorder,
  printMessage,
} from './helpers.js';

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
    languages: [],
    code_switching: false,
  },
  messages_config: {
    receive_partial_transcripts: false, // Set to true to receive partial/intermediate transcript
    receive_final_transcripts: true,
  },
};

async function initLiveSession(): Promise<LiveV2InitResponse> {
  return (
    await httpClient.post<LiveV2InitResponse>('/v2/live', {
      ...getMicrophoneAudioFormat(),
      ...config,
    })
  ).data;
}

async function start() {
  const initiateResponse = await initLiveSession();

  const socket: WebSocket = new WebSocket(initiateResponse.url);

  const recorder = initMicrophoneRecorder(
    // Send every chunk from recorder to the socket
    (chunk) => socket.send(chunk),
    // When the recording is stopped, we send a message to tell the server
    // we are done sending audio and it can start the post-processing
    () => socket.send(JSON.stringify({ type: 'stop_recording' })),
  );

  socket.addEventListener('open', function () {
    console.log();
    console.log(
      `################ Begin session ${initiateResponse.id} ################`,
    );
    console.log();

    recorder.start();
  });

  socket.addEventListener('message', function (event) {
    // All the messages we are sending are in JSON format
    const message = JSON.parse(event.data.toString());
    printMessage(message);
  });

  socket.addEventListener('error', function (error) {
    console.error(error);
    recorder.stop();
  });

  socket.addEventListener('close', async ({ code, reason }) => {
    if (code !== 1000) {
      console.error(`WebSocket closed abnormally: ${code} ${reason}`);
      process.exit(1);
    }

    console.log();
    console.log(
      `################  End session ${initiateResponse.id}  ################`,
    );
    console.log();
  });
}

start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
