import { GladiaClient } from '@gladiaio/sdk';
import { getAudioFileFormat, initFileRecorder } from '../live_helpers.js';

const gladiaClient = new GladiaClient();
const filePath = '../data/anna-and-sasha-16000.wav';

const config = {
  language_config: { languages: ['en' as const], code_switching: false },
  messages_config: {
    receive_partial_transcripts: false,
    receive_final_transcripts: true,
  },
};

async function start() {
  const session = gladiaClient.liveV2().startSession({
    ...getAudioFileFormat(filePath),
    ...config,
  });

  session.once('started', () => {
    console.log(
      `\n################ Begin session ${session.sessionId} ################\n`,
    );
  });

  session.on('message', (message) => {
    if (message.type !== 'transcript') return;
    const u = message.data.utterance;
    if (message.data.is_final) {
      console.log(
        `${u.start.toFixed(3)} --> ${u.end.toFixed(3)} | ${u.text.trim()}`,
      );
    }
  });

  session.on('error', (err) => console.error('Error:', err));

  session.once('ended', () => {
    console.log(
      `\n################ End session ${session.sessionId} ################\n`,
    );
  });

  const recorder = initFileRecorder(
    (chunk) => session.sendAudio(chunk),
    () => session.stopRecording(),
    filePath,
  );
  recorder.start();
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
