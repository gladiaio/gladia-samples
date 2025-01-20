"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const fs_1 = __importDefault(require("fs"));
const path_1 = require("path");
const process_1 = require("process");
const sleep = (delay) => new Promise((f) => setTimeout(f, delay));
// retrieve gladia key
const gladiaKey = process.argv[2];
if (!gladiaKey) {
    console.error("You must provide a gladia key. Go to app.gladia.io");
    (0, process_1.exit)(1);
}
else {
    console.log("Using the gladia key : " + gladiaKey);
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
        language_behaviour: "automatic multiple languages",
        // "model_type":"accurate" <- Slower but more accurate model, useful if you need precise addresses for example.
    };
    socket.send(JSON.stringify(configuration));
    // Once the initial message is sent, send audio data
    const file = (0, path_1.resolve)("../data/anna-and-sasha-16000.wav");
    const fileSync = fs_1.default.readFileSync(file);
    const newBuffers = Buffer.from(fileSync);
    const segment = newBuffers.slice(44, newBuffers.byteLength);
    const base64Frames = segment.toString("base64");
    const partSize = 20000; // The size of each part
    const numberOfParts = Math.ceil(base64Frames.length / partSize);
    // Split the audio data into parts and send them sequentially
    for (let i = 0; i < numberOfParts; i++) {
        const start = i * partSize;
        const end = Math.min((i + 1) * partSize, base64Frames.length);
        const part = base64Frames.substring(start, end);
        // Delay between sending parts (500 mseconds in this case)
        await sleep(500);
        const message = {
            frames: part,
        };
        if (socket.readyState === ws_1.default.OPEN) {
            socket.send(JSON.stringify(message));
        }
        else {
            console.log("WebSocket ready state is not [OPEN]");
            break;
        }
    }
    await sleep(2000);
    console.log("Final closing");
    socket.close();
});
