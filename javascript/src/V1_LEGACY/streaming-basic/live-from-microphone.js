"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = require("process");
const ws_1 = __importDefault(require("ws"));
const mic_1 = __importDefault(require("mic"));
const SAMPLE_RATE = 16000;
// retrieve gladia key
const gladiaKey = process.argv[2];
if (!gladiaKey) {
    console.error("You must provide a gladia key. Go to app.gladia.io");
    (0, process_1.exit)(1);
}
else {
    console.log("using the gladia key : " + gladiaKey);
}
const gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription";
// connect to api websocket
const socket = new ws_1.default(gladiaUrl);
// get ready to receive transcriptions
socket.on("message", (event) => {
    if (!event)
        return;
    const utterance = JSON.parse(event.toString());
    if (!Object.keys(utterance).length) {
        console.log("Empty ...");
        return;
    }
    if (utterance.event === "connected") {
        console.log(`\n* Connection id: ${utterance.request_id} *\n`);
    }
    else if (utterance.event === "error") {
        console.error(`[${utterance.code}] ${utterance.message}`);
        socket.close();
    }
    else if (utterance.event === "transcript" && utterance.transcription) {
        console.log(`${utterance.type}: (${utterance.language}) ${utterance.transcription}`);
    }
});
socket.on("error", (error) => {
    console.log("An error occurred:", error.message);
});
socket.on("close", () => {
    console.log("Connection closed");
});
socket.on("open", async () => {
    // Configure stream with a configuration message
    const configuration = {
        x_gladia_key: gladiaKey,
        language_behaviour: "automatic single language",
        sample_rate: SAMPLE_RATE,
        // "model_type":"accurate" <- Slower but more accurate model, useful if you need precise addresses for example.
    };
    socket.send(JSON.stringify(configuration));
    // create microphone instance
    const microphone = (0, mic_1.default)({
        rate: SAMPLE_RATE,
        channels: 1,
    });
    const microphoneInputStream = microphone.getAudioStream();
    microphoneInputStream.on("data", function (data) {
        const base64 = data.toString("base64");
        if (socket.readyState === ws_1.default.OPEN) {
            socket.send(JSON.stringify({ frames: base64 }));
        }
        else {
            console.log("WebSocket ready state is not [OPEN]");
        }
    });
    microphoneInputStream.on("error", function (err) {
        console.log("Error in Input Stream: " + err);
    });
    microphone.start();
});
