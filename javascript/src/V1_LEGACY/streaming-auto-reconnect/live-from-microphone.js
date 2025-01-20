"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = require("process");
const mic_1 = __importDefault(require("mic"));
const websocket_client_js_1 = require("./websocket-client.js");
const TYPE_KEY = "type";
const TRANSCRIPTION_KEY = "transcription";
const LANGUAGE_KEY = "language";
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
// connect to api websocket
const gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription";
async function start() {
    // connect to api websocket
    const socket = new websocket_client_js_1.WebSocketClient(gladiaUrl, {
        x_gladia_key: gladiaKey,
        language_behaviour: "automatic single language",
        sample_rate: SAMPLE_RATE,
        // "model_type":"accurate" <- Slower but more accurate model, useful if you need precise addresses for example.
    }, {
        onTranscript(message) {
            if (message.transcription) {
                console.log(`${message[TYPE_KEY]}: (${message[LANGUAGE_KEY]}) ${message[TRANSCRIPTION_KEY]}`);
            }
        },
        onError(error) {
            if (error.closed) {
                console.error(`Connection lost to the server, can't recover`, error);
                (0, process_1.exit)(1);
            }
            else {
                console.error(error);
            }
        },
    });
    await socket.ready();
    // create microphone instance
    const microphone = (0, mic_1.default)({
        rate: SAMPLE_RATE,
        channels: 1,
    });
    const microphoneInputStream = microphone.getAudioStream();
    microphoneInputStream.on("data", function (data) {
        const base64 = data.toString("base64");
        socket.sendMessage(JSON.stringify({ frames: base64 }));
    });
    microphoneInputStream.on("error", function (err) {
        console.log("Error in Input Stream: " + err);
    });
    microphone.start();
}
start();
