import WebSocket from "ws";
import {
  getMicrophoneAudioFormat,
  initMicrophoneRecorder,
  printMessage,
  readGladiaKey,
} from "./helpers";

const gladiaApiUrl = "https://api.gladia.io";
const gladiaKey = readGladiaKey();
const config = {
  language_config: {
    languages: [],
    code_switching: false,
  },
};

async function initLiveSession() {
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

function initWebSocketClient({ url }) {
  let socket = null;
  let bytesSent = 0;
  let audioBuffer = Buffer.alloc(0);
  let stopRecording = false;
  function initWebSocket() {
    console.log(">>>>> Connecting to websocket");
    socket = new WebSocket(url);
    socket.addEventListener("open", function () {
      console.log(">>>>> Connected to websocket");
      if (audioBuffer.byteLength) {
        socket?.send(audioBuffer);
        audioBuffer = Buffer.alloc(0);
      }
      if (stopRecording) {
        socket?.send(JSON.stringify({ type: "stop_recording" }));
      }
    });
    socket.addEventListener("error", function (error) {
      console.error(error);
      process.exit(1);
    });
    socket.addEventListener("close", async ({ code, reason }) => {
      if (code === 1000 || stopRecording) {
        process.exit(0);
      } else {
        console.log(">>>>> Lost connection with websocket");
        socket?.removeAllListeners();
        socket = null;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        initWebSocket();
      }
    });
    socket.addEventListener("message", function (event) {
      // All the messages we are sending are in JSON format
      const message = JSON.parse(event.data.toString());
      printMessage(message);
      if (message.type === "audio_chunk" && message.acknowledged) {
        audioBuffer = audioBuffer.subarray(
          message.data.byte_range[1] - bytesSent
        );
        bytesSent = message.data.byte_range[1];
      }
    });
  }
  initWebSocket();
  return {
    sendAudioChunk: (chunk) => {
      audioBuffer = Buffer.concat([audioBuffer, chunk]);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(chunk);
      }
    },
    stopRecording: () => {
      stopRecording = true;
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "stop_recording" }));
      }
    },
    forceClose: () => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close(4500);
      }
    },
  };
}

async function start() {
  const initiateResponse = await initLiveSession();
  const client = initWebSocketClient(initiateResponse);
  let closeInterval = null;
  const recorder = initMicrophoneRecorder(
    // Send every chunk from recorder to the socket
    (chunk) => client.sendAudioChunk(chunk),
    // When the recording is stopped, we send a message to tell the server
    // we are done sending audio and it can start the post-processing
    () => {
      if (closeInterval) clearInterval(closeInterval);
      client.stopRecording();
    }
  );
  // We can start the recording without waiting for the connection to be open
  // since the client buffers the audio
  console.log();
  console.log("################ Begin session ################");
  console.log();
  recorder.start();
  closeInterval = setInterval(() => {
    client.forceClose();
  }, 10000);
}

start();
