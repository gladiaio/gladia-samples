import { GladiaClient, type LiveV2InitRequest } from '@gladiaio/sdk';
import {
  getMicrophoneAudioFormat,
  initMicrophoneRecorder,
  printMessage,
} from './helpers.js';

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

async function start() {
  const liveSession = new GladiaClient().liveV2().startSession({
    ...getMicrophoneAudioFormat(),
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
    recorder.stop();
  });
  liveSession.once('ended', (event) => {
    if (event.code !== 1000) {
      console.error(
        `WebSocket closed abnormally: ${event.code} ${event.reason}`,
      );
      process.exit(1);
    }

    console.log();
    console.log(
      `################  End session ${liveSession.sessionId}  ################`,
    );
    console.log();
  });

  const recorder = initMicrophoneRecorder(
    // Send every chunk from recorder to the socket
    (chunk) => liveSession.sendAudio(chunk),
    // When the recording is stopped, we send a message to tell the server
    // we are done sending audio and it can start the post-processing
    () => liveSession.stopRecording(),
  );

  recorder.start();
}

start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
