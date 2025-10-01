import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { access } from 'fs/promises';
import { getGladiaApiKey, getGladiaApiUrl } from '../env';
import { getDataFilePath } from '../file';
const fileName = 'anna-and-sasha-16000.wav';
const filePath = getDataFilePath(fileName);
const config = {
  language_config: {
    languages: ['es', 'ru', 'en', 'fr'],
    code_switching: true,
  },
  diarization: true,
};
const httpClient = axios.create({
  baseURL: getGladiaApiUrl(),
  headers: {
    'x-gladia-key': getGladiaApiKey(),
    'Content-Type': 'application/json',
  },
});
async function pollForResult(resultUrl) {
  while (true) {
    console.log('Polling for results...');
    const pollResponse = (await httpClient.get(resultUrl)).data;
    if (pollResponse.status === 'done') {
      console.log('- Transcription done: \n ');
      console.log(pollResponse.result.transcription.full_transcript);
      break;
    } else {
      console.log('Transcription status: ', pollResponse.status);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
async function startTranscription() {
  try {
    try {
      await access(filePath, fs.constants.F_OK);
      console.log('- File exists');
    } catch (err) {
      console.log('- File does not exist');
      process.exit(0);
    }
    const form = new FormData();
    const stream = fs.createReadStream(filePath);
    // Explicitly set filename, and mimeType
    form.append('audio', stream, {
      filename: fileName,
      contentType: 'audio/wav',
    });
    console.log('- Uploading file to Gladia...');
    const uploadResponse = (
      await httpClient.post('/v2/upload/', form, {
        // form.getHeaders to get correctly formatted form-data boundaries
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type
        headers: form.getHeaders(),
      })
    ).data;
    console.log('Upload response with File ID:', uploadResponse);
    const requestData = {
      audio_url: uploadResponse.audio_url,
      ...config,
    };
    console.log('- Sending post transcription request to Gladia API...');
    const postTranscriptionResponse = (
      await httpClient.post('/v2/transcription/', requestData)
    ).data;
    console.log(
      'Initial response with Transcription ID:',
      postTranscriptionResponse,
    );
    if (postTranscriptionResponse.result_url) {
      await pollForResult(postTranscriptionResponse.result_url);
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.log(
        `AxiosError on ${err.config?.url}: ${err.message}\n-> ${JSON.stringify(err.response?.data)}`,
      );
    } else {
      console.log(err);
    }
  }
}
startTranscription();
