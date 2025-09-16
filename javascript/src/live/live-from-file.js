import { GladiaClient } from '@gladiaio/sdk';
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
const config = {
  language_config: {
    languages: ['es', 'ru', 'en', 'fr'],
    code_switching: true,
  },
  messages_config: {
    receive_partial_transcripts: false, // Set to true to receive partial/intermediate transcript
    receive_final_transcripts: true,
  },
};
async function start() {
  const gladiaClient = new GladiaClient({
    apiKey: gladiaApiKey,
    apiUrl: gladiaApiUrl,
    region,
  });
  const liveSession = gladiaClient.liveV2().startSession({
    ...getAudioFileFormat(filepath),
    ...config,
  });
  liveSession.once('started', () => {
    console.log();
    console.log(
      `################ Begin session ${liveSession.sessionId} ################`,
    );
    console.log();
  });
  liveSession.on('message', (message) => {
    printMessage(message);
  });
  liveSession.on('error', (error) => {
    console.error(error);
  });
  liveSession.once('ended', () => {
    console.log();
    console.log(
      `################  End session ${liveSession.sessionId}  ################`,
    );
    console.log();
  });
  const recorder = initFileRecorder(
    // Send every chunk from recorder to the socket
    (chunk) => liveSession.sendAudio(chunk),
    // When the recording is stopped, we send a message to tell the server
    // we are done sending audio and it can start the post-processing
    () => liveSession.stopRecording(),
    filepath,
  );
  recorder.start();
}
start();
