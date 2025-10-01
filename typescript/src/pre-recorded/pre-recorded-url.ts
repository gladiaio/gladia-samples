import axios, { AxiosError } from 'axios';
import { getGladiaApiKey, getGladiaApiUrl } from '../env';

const fileUrl =
  'http://files.gladia.io/example/audio-transcription/split_infinity.wav';

const config = {
  language_config: {
    languages: [],
    code_switching: false,
  },
  diarization: false,
};

const httpClient = axios.create({
  baseURL: getGladiaApiUrl(),
  headers: {
    'x-gladia-key': getGladiaApiKey(),
    'Content-Type': 'application/json',
  },
});

async function pollForResult(resultUrl: string) {
  while (true) {
    console.log('Polling for results...');
    const pollResponse = (await httpClient.get(resultUrl)).data;

    if (pollResponse.status === 'done') {
      console.log('- Transcription done: \n ');
      console.log(pollResponse.result.transcription.full_transcript);
      break;
    } else {
      console.log('- Transcription status: ', pollResponse.status);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

async function startTranscription() {
  try {
    const requestData = {
      audio_url: fileUrl,
      ...config,
    };

    console.log('- Sending initial request to Gladia API...');

    const initialResponse = (
      await httpClient.post('/v2/transcription/', requestData)
    ).data;

    console.log('- Initial response with Transcription ID:', initialResponse);

    if (initialResponse.result_url) {
      await pollForResult(initialResponse.result_url);
    }
  } catch (e) {
    if (e instanceof AxiosError) {
      console.log(
        `AxiosError on ${e.config?.url}: ${e.message}\n-> ${JSON.stringify(
          e.response?.data,
        )}`,
      );
    } else {
      console.log(e);
    }
  }
}

startTranscription();
