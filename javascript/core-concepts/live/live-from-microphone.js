import { GladiaClient } from '@gladiaio/sdk';
import {
  getMicrophoneAudioFormat,
  initMicrophoneRecorder,
  printMessage,
} from './live-helpers.js';

const gladiaClient = new GladiaClient();

const config = {
  language_config: { languages: ['en'], code_switching: false },
  messages_config: {
    receive_partial_transcripts: false,
    receive_final_transcripts: true,
  },
};

async function start() {
  const session = gladiaClient.liveV2().startSession({
    ...getMicrophoneAudioFormat(),
    ...config,
  });

  session.once('started', () => {
    console.log(
      `\n################ Begin session ${session.sessionId} ################\n`,
    );
  });

  session.on('message', (message) => printMessage(message));
  session.on('error', (err) => console.error('Error:', err));
  session.once('ended', () => {
    console.log(
      `\n################ End session ${session.sessionId} ################\n`,
    );
  });

  const recorder = initMicrophoneRecorder(
    (chunk) => session.sendAudio(chunk),
    () => session.stopRecording(),
  );
  recorder.start();
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
