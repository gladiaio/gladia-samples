import axios from "axios";
import fs from "fs";
import { access } from "fs/promises";
import FormData from "form-data";

const gladiaKey = process.argv[2];
if (!gladiaKey) {
  console.error(
    "You must provide a Gladia key. Go to https://app.gladia.io to get yours."
  );
  process.exit(1);
} else {
  console.log(`Using the Gladia key: ${gladiaKey}`);
}

const gladiaV2BaseUrl = "https://api.gladia.io/v2/";

async function pollForResult(resultUrl: string, headers: any) {
  while (true) {
    console.log("Polling for results...");
    const pollResponse = (await axios.get(resultUrl, { headers: headers }))
      .data;

    if (pollResponse.status === "done") {
      console.log("- Transcription done: \n ");
      console.log(pollResponse.result.transcription.full_transcript);
      break;
    } else {
      console.log("Transcription status: ", pollResponse.status);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function startTranscription() {
  try {
    const file_path = "../data/anna-and-sasha-16000.wav"; // Change with your file path

    try {
      await access(file_path, fs.constants.F_OK);
      console.log("- File exists");
    } catch (err: unknown) {
      console.log("- File does not exist");
      process.exit(0);
    }

    const form = new FormData();
    const stream = fs.createReadStream(file_path);

    // Explicitly set filename, and mimeType
    form.append("audio", stream, {
      filename: "anna-and-sasha-16000.wav",
      contentType: "audio/wav",
    });

    const headers: Record<string, string> = {
      "x-gladia-key": gladiaKey,
    };

    console.log("- Uploading file to Gladia...");
    const uploadResponse = (
      await axios.post(gladiaV2BaseUrl + "upload/", form, {
        // form.getHeaders to get correctly formatted form-data boundaries
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
        headers: { ...form.getHeaders(), ...headers },
      })
    ).data;

    console.log("Upload response with File ID:", uploadResponse);

    headers["Content-Type"] = "application/json";

    const requestData = {
      audio_url: uploadResponse.audio_url,
      diarization: true,
    };
    console.log("- Sending post transcription request to Gladia API...");
    const postTranscriptionResponse = (
      await axios.post(gladiaV2BaseUrl + "transcription/", requestData, {
        headers,
      })
    ).data;

    console.log(
      "Initial response with Transcription ID:",
      postTranscriptionResponse
    );

    if (postTranscriptionResponse.result_url) {
      await pollForResult(postTranscriptionResponse.result_url, headers);
    }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      console.log(
        `AxiosError on ${err.config?.url}: ${err.message}\n-> ${JSON.stringify(
          err.response?.data
        )}`
      );
    } else {
      console.log(err);
    }
  }
}

startTranscription();
