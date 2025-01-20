"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
// retrieve gladia key
const gladiaKey = process.argv[2];
if (!gladiaKey) {
    console.error("You must provide a gladia key. Go to app.gladia.io");
    process.exit(1);
}
else {
    console.log("using the gladia key : " + gladiaKey);
}
const gladiaUrl = "https://api.gladia.io/audio/text/audio-transcription/";
const headers = {
    "x-gladia-key": gladiaKey,
    accept: "application/json", // Accept json as a response, but we are sending a Multipart FormData
};
const file_path = "../data/long.wav"; // Change with your file path
fs_1.default.access(file_path, fs_1.default.constants.F_OK, (err) => {
    if (err) {
        console.log("- File does not exist");
    }
    else {
        console.log("- File exists");
        const form = new form_data_1.default();
        const stream = fs_1.default.createReadStream(file_path);
        // Explicitly set filename, and mimeType
        form.append("audio", stream, {
            filename: "anna-and-sasha-16000.wav",
            contentType: "audio/wav",
        });
        form.append("toggle_diarization", "true"); // form-data library requires fields to be string, Buffer or Stream
        console.log("- Sending request to Gladia API...");
        axios_1.default
            .post(gladiaUrl, form, {
            // form.getHeaders to get correctly formatted form-data boundaries
            // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
            headers: { ...form.getHeaders(), ...headers },
        })
            .then((response) => {
            console.log(response.data); // Get the results
            console.log(response.status); // Status code
            console.log("- End of work");
        })
            .catch((error) => {
            console.error(error);
        });
    }
});
