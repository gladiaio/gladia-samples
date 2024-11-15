import WebSocket from "ws";
import {
  getMicrophoneAudioFormat,
  initMicrophoneRecorder,
  printMessage,
  readGladiaKey,
} from "./helpers";
import { InitiateResponse, StreamingConfig } from "./types";

const gladiaApiUrl = "https://api.gladia.io";
const gladiaKey = readGladiaKey();

const config: StreamingConfig = {
  language_config: {
    languages: [],
    code_switching: false,
  },
  pre_processing: {
    audio_enhancer: false,
  },
};

async function initLiveSession(): Promise<InitiateResponse> {
  const response = await fetch(`${gladiaApiUrl}/v2/live`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GLADIA-KEY": gladiaKey,
    },
    body: JSON.stringify({ ...getMicrophoneAudioFormat(), ...config }),
  });
  if (!response.ok) {
    console.error(
      `${response.status}: ${(await response.text()) || response.statusText}`
    );
    process.exit(response.status);
  }

  return await response.json();
}

function initWebSocket(
  { url }: InitiateResponse,
  onOpen: () => void
): WebSocket {
  const socket = new WebSocket(url);

  socket.addEventListener("open", function () {
    onOpen();
  });

  socket.addEventListener("error", function (error) {
    console.error(error);
    process.exit(1);
  });

  socket.addEventListener("close", async ({ code, reason }) => {
    if (code === 1000) {
      process.exit(0);
    } else {
      console.error(`Connection closed with code ${code} and reason ${reason}`);
      process.exit(1);
    }
  });

  socket.addEventListener("message", function (event) {
    // All the messages we are sending are in JSON format
    const message = JSON.parse(event.data.toString());
    printMessage(message);
  });

  return socket;
}

async function start() {
  const initiateResponse = await initLiveSession();

  let socket: WebSocket | null = null;

  const recorder = initMicrophoneRecorder(
    // Send every chunk from recorder to the socket
    (chunk) => socket?.send(chunk),
    // When the recording is stopped, we send a message to tell the server
    // we are done sending audio and it can start the post-processing
    () => socket?.send(JSON.stringify({ type: "stop_recording" }))
  );

  // Connect to the WebSocket and start recording once the connection is open
  socket = initWebSocket(initiateResponse, () => {
    console.log();
    console.log("################ Begin session ################");
    console.log();

    recorder.start();
  });
}

start();
