import { type LiveV2InitRequest, type LiveV2InitResponse } from '@gladiaio/sdk';
import WebSocket from 'ws';
import {
  getAudioFileFormat,
  initFileRecorder,
  printMessage,
  readGladiaApiKey,
} from './helpers.js';

const gladiaApiKey = readGladiaApiKey();
const gladiaApiUrl = 'https://api.gladia.io';
const region = 'eu-west'; // us-west

const filepath = '../data/anna-and-sasha-16000.wav';
const config: LiveV2InitRequest = {
  language_config: {
    languages: ['es', 'ru', 'en', 'fr'],
    code_switching: true,
  },
  messages_config: {
    receive_partial_transcripts: false, // Set to true to receive partial/intermediate transcript
    receive_final_transcripts: true,
  },
};

async function initLiveSession(): Promise<LiveV2InitResponse> {
  const response = await fetch(`${gladiaApiUrl}/v2/live?region=${region}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GLADIA-KEY': gladiaApiKey,
    },
    body: JSON.stringify({ ...getAudioFileFormat(filepath), ...config }),
  });
  if (!response.ok) {
    console.error(
      `${response.status}: ${(await response.text()) || response.statusText}`,
    );
    process.exit(response.status);
  }

  return (await response.json()) as LiveV2InitResponse;
}

function initWebSocket(
  { url }: LiveV2InitResponse,
  onOpen: () => void,
  onClose: (event: { code: number; reason: string }) => void,
): WebSocket {
  const socket = new WebSocket(url);

  socket.addEventListener('open', function () {
    onOpen();
  });

  socket.addEventListener('error', function (error) {
    console.error(error);
  });

  socket.addEventListener('close', async ({ code, reason }) => {
    onClose({ code, reason });
  });

  socket.addEventListener('message', function (event) {
    // All the messages we are sending are in JSON format
    const message = JSON.parse(event.data.toString());
    printMessage(message);
  });

  return socket;
}

async function start() {
  const initiateResponse = await initLiveSession();

  const socket: WebSocket = new WebSocket(initiateResponse.url);

  const recorder = initFileRecorder(
    // Send every chunk from recorder to the socket
    (chunk) => socket.send(chunk),
    // When the recording is stopped, we send a message to tell the server
    // we are done sending audio and it can start the post-processing
    () => socket.send(JSON.stringify({ type: 'stop_recording' })),
    filepath,
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
  });

  socket.addEventListener('close', async ({ code, reason }) => {
    console.log();
    console.log(
      `################  End session ${initiateResponse.id}  ################`,
    );
    console.log();
  });
}

start();
