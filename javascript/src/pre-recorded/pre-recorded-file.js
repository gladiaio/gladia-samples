"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("fs/promises");
const form_data_1 = __importDefault(require("form-data"));
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
            console.log("Transcription status: ", pollResponse.status);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}
async function startTranscription() {
    try {
        const file_path = "../data/anna-and-sasha-16000.wav"; // Change with your file path
        try {
            await (0, promises_1.access)(file_path, fs_1.default.constants.F_OK);
            console.log("- File exists");
        }
        catch (err) {
            console.log("- File does not exist");
            process.exit(0);
        }
        const form = new form_data_1.default();
        const stream = fs_1.default.createReadStream(file_path);
        // Explicitly set filename, and mimeType
        form.append("audio", stream, {
            filename: "anna-and-sasha-16000.wav",
            contentType: "audio/wav",
        });
        const headers = {
            "x-gladia-key": gladiaKey,
        };
        console.log("- Uploading file to Gladia...");
        const uploadResponse = (await axios_1.default.post(gladiaV2BaseUrl + "upload/", form, {
            // form.getHeaders to get correctly formatted form-data boundaries
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
            headers: { ...form.getHeaders(), ...headers },
        })).data;
        console.log("Upload response with File ID:", uploadResponse);
        headers["Content-Type"] = "application/json";
        const requestData = {
            audio_url: uploadResponse.audio_url,
            diarization: true,
        };
        console.log("- Sending post transcription request to Gladia API...");
        const postTranscriptionResponse = (await axios_1.default.post(gladiaV2BaseUrl + "transcription/", requestData, {
            headers,
        })).data;
        console.log("Initial response with Transcription ID:", postTranscriptionResponse);
        if (postTranscriptionResponse.result_url) {
            await pollForResult(postTranscriptionResponse.result_url, headers);
        }
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err)) {
            console.log(`AxiosError on ${err.config?.url}: ${err.message}\n-> ${JSON.stringify(err.response?.data)}`);
        }
        else {
            console.log(err);
        }
    }
}
startTranscription();
