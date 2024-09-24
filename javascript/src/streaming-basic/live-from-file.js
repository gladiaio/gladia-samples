import WebSocket from "ws";
import fs from "fs";
import { resolve } from "path";
import { exit } from "process";
import pkg from 'wavefile';
const { WaveFile } = pkg;

const sleep = (delay) => new Promise((f) => setTimeout(f, delay));
// retrieve gladia key
const gladiaKey = process.argv[2];
if (!gladiaKey) {
    console.error("You must provide a gladia key. Go to app.gladia.io");
    exit(1);
} else {
    console.log("Using the gladia key : " + gladiaKey);
}
const gladiaUrl = process.argv[3] || "wss://api.gladia.io/audio/text/audio-transcription";
const processAudioFile = async (file) => {

    const socket = new WebSocket(gladiaUrl);
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
        const fileBuffer = fs.readFileSync(resolve(dataFolder, file));
        let wav = new WaveFile(fileBuffer);
        const sampleRate = wav.fmt.sampleRate;

        const configuration = {
            x_gladia_key: gladiaKey,
            language_behaviour: "automatic multiple languages",
            sample_rate: sampleRate,
            // "model_type":"accurate" <- Slower but more accurate model, useful if you need precise addresses for example.
        };
        socket.send(JSON.stringify(configuration));
        // Once the initial message is sent, send audio data
        const fileSync = fs.readFileSync(file);
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
            if (socket.readyState === WebSocket.OPEN) {
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
};

// get all wav files in the data folder
const dataFolder = resolve("../data");
const files = fs.readdirSync(dataFolder);
const wavFiles = files.filter(file => file.endsWith('.wav'));

// process each wav file in parallel
const processPromises = wavFiles.map(file => {
    const filePath = resolve(dataFolder, file);
    return processAudioFile(filePath);
});

Promise.all(processPromises)
    .then(() => {
        console.log("All files processed successfully");
    })
    .catch(error => {
        console.error("Error processing files:", error);
    });


