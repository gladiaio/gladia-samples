import WebSocket from 'ws';
import {
  getMicrophoneAudioFormat,
  initMicrophoneRecorder,
  printMessage,
  readGladiaApiKey,
} from './helpers.js';
const gladiaApiKey = readGladiaApiKey();
const gladiaApiUrl = 'https://api.gladia.io';
const region = 'eu-west'; // us-west
const config = {
  language_config: {
    languages: [],
    code_switching: false,
  },
  messages_config: {
    receive_partial_transcripts: false, // Set to true to receive partial/intermediate transcript
    receive_final_transcripts: true,
  },
};
async function initLiveSession() {
  const response = await fetch(`${gladiaApiUrl}/v2/live?region=${region}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-GLADIA-KEY': gladiaApiKey,
    },
    body: JSON.stringify({ ...getMicrophoneAudioFormat(), ...config }),
  });
  if (!response.ok) {
    console.error(
      `${response.status}: ${(await response.text()) || response.statusText}`,
    );
    process.exit(response.status);
  }
  return await response.json();
}
async function start() {
  const initiateResponse = await initLiveSession();
  const socket = new WebSocket(initiateResponse.url);
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
