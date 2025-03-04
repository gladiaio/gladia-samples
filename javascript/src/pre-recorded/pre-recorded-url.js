"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importStar(require("axios"));
// retrieve Gladia key
const gladiaKey = process.argv[2];
if (!gladiaKey) {
    console.error("You must provide a Gladia key. Go to https://app.gladia.io to get yours.");
    process.exit(1);
}
else {
    console.log(`Using the Gladia key: ${gladiaKey}`);
}
const gladiaV2BaseUrl = "https://api.gladia.io/v2/";
async function pollForResult(resultUrl, headers) {
    while (true) {
        console.log("Polling for results...");
        const pollResponse = (await axios_1.default.get(resultUrl, { headers: headers }))
            .data;
        if (pollResponse.status === "done") {
            console.log("- Transcription done: \n ");
            console.log(pollResponse.result.transcription.full_transcript);
            break;
        }
        else {
            console.log("- Transcription status: ", pollResponse.status);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}
async function startTranscription() {
    try {
        const requestData = {
            audio_url: "http://files.gladia.io/example/audio-transcription/split_infinity.wav",
            diarization: true,
        };
        const headers = {
            "x-gladia-key": gladiaKey,
            "Content-Type": "application/json",
        };
        console.log("- Sending initial request to Gladia API...");
        const initialResponse = (await axios_1.default.post(gladiaV2BaseUrl + "transcription/", requestData, {
            headers,
        })).data;
        console.log("- Initial response with Transcription ID:", initialResponse);
        if (initialResponse.result_url) {
            await pollForResult(initialResponse.result_url, headers);
        }
    }
    catch (e) {
        if (e instanceof axios_1.AxiosError) {
            console.log(`AxiosError on ${e.config?.url}: ${e.message}\n-> ${JSON.stringify(e.response?.data)}`);
        }
        else {
            console.log(e);
        }
    }
}
startTranscription();
