import WebSocket from "ws";
import fs from "fs";
import { resolve } from "path";
import { exit } from "process";

const ERROR_KEY = "error";
const TYPE_KEY = "type";
const TRANSCRIPTION_KEY = "transcription";
const LANGUAGE_KEY = "language";
const CONNECTION_ID = "apiCallId";

const sleep = (delay: number): Promise<void> =>
  new Promise((f) => setTimeout(f, delay));

// retrieve gladia key
const gladiaKey = process.argv[2];

if (!gladiaKey) {
  console.error("You must provide a gladia key. Go to app.gladia.io");
  exit(1);
} else {
  console.log("using the gladia key : " + gladiaKey);
}

// connect to api websocket
const gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription";
const socket = new WebSocket(gladiaUrl);

// get ready to receive transcriptions
socket.on("message", (event: any) => {
  if (event) {
    const utterance = JSON.parse(event.toString());
    if (Object.keys(utterance).length !== 0) {
      if (CONNECTION_ID in utterance) {
        console.log(`\n* Connection id: ${utterance[CONNECTION_ID]} *\n`);
      } else if (ERROR_KEY in utterance) {
        console.error(`${utterance[ERROR_KEY]}`);
        socket.close();
      } else if (
        [TYPE_KEY, LANGUAGE_KEY, TRANSCRIPTION_KEY].every(
          (key) => key in utterance
        )
      ) {
        console.log(
          `${utterance[TYPE_KEY]}: (${utterance[LANGUAGE_KEY]}) ${utterance[TRANSCRIPTION_KEY]}`
        );
      }
    }
  } else {
    console.log("empty ...");
  }
});

socket.on("error", (error: WebSocket.ErrorEvent) => {
  console.log(error.message);
});

socket.on("open", async () => {
  // Configure stream with a configuration message
  const configuration = {
    x_gladia_key: gladiaKey,
    frames_format: "bytes",
    // "model_type":"accurate"
  };
  socket.send(JSON.stringify(configuration));

  // Once the initial message is sent, send audio data
  const file = resolve("../data/anna-and-sasha-16000.wav");
  const fileSync = fs.readFileSync(file);
  const newBuffers = Buffer.from(fileSync);
  const segment = newBuffers.slice(44, newBuffers.byteLength);
  const partSize = 20000; // The size of each part
  const numberOfParts = Math.ceil(segment.length / partSize);

  // Split the audio data into parts and send them sequentially
  for (let i = 0; i < numberOfParts; i++) {
    const start = i * partSize;
    const end = Math.min((i + 1) * partSize, segment.length);
    const part = segment.slice(start, end);

    // Delay between sending parts (500 mseconds in this case)
    await sleep(500);
    socket.send(part, { binary: true });
  }

  await sleep(2000);
  console.log("final closing");
  socket.close();
});
