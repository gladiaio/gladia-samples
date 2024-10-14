import fs from "fs";
import { resolve } from "path";
import { exit } from "process";
import { WebSocketClient } from "./websocket-client.js";
const TYPE_KEY = "type";
const TRANSCRIPTION_KEY = "transcription";
const LANGUAGE_KEY = "language";
const sleep = (delay) => new Promise((f) => setTimeout(f, delay));
// retrieve gladia key
const gladiaKey = process.argv[2];
if (!gladiaKey) {
    console.error("You must provide a gladia key. Go to app.gladia.io");
    exit(1);
}
else {
    console.log("Using the gladia key : " + gladiaKey);
}
const gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription";
async function start() {
    // connect to api websocket
    const socket = new WebSocketClient(gladiaUrl, {
        x_gladia_key: gladiaKey,
        language_behaviour: "automatic multiple languages",
        frames_format: "bytes",
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
                exit(1);
            }
            else {
                console.error(error);
            }
        },
    });
    await socket.ready();
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
        socket.sendMessage(part);
    }
    await sleep(1000);
    console.log("Final closing");
    socket.close();
}
start();
