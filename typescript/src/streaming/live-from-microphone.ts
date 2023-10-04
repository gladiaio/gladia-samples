import { exit } from "process";
import WebSocket from "ws";
import mic from "mic";

const ERROR_KEY = "error";
const TYPE_KEY = "type";
const TRANSCRIPTION_KEY = "transcription";
const LANGUAGE_KEY = "language";
const SAMPLE_RATE = 16_000;

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
      if (ERROR_KEY in utterance) {
        console.error(`${utterance[ERROR_KEY]}`);
        socket.close();
      } else {
        if (utterance && utterance[TRANSCRIPTION_KEY])
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

socket.on("close", () => {
  console.log("Connection closed by Gladia Server");
});

socket.on("open", async () => {
  // Configure stream with a configuration message
  const configuration = {
    "x-gladia-key": gladiaKey,
    language_behaviour: "automatic single languages",
    sample_rate: SAMPLE_RATE,
    // "model_type":"accurate" <- Slower but more accurate model, useful if you need precise addresses for example.
  };
  socket.send(JSON.stringify(configuration));

  // create microphone instance
  const microphone = mic({
    rate: SAMPLE_RATE,
    channels: "1",
  });

  const microphoneInputStream = microphone.getAudioStream();
  microphoneInputStream.on("data", function (data: any) {
    const base64 = data.toString("base64");
    socket.send(JSON.stringify({ frames: base64 }));

    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ frames: base64 }));
    } else {
      console.log("WebSocket ready state is not [OPEN]");
    }
  });

  microphoneInputStream.on("error", function (err: any) {
    console.log("Error in Input Stream: " + err);
  });

  microphone.start();
});
