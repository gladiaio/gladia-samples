import axios, { AxiosError } from 'axios';

// retrieve Gladia key
const gladiaKey = process.argv[2];
if (!gladiaKey) {
  console.error(
    'You must provide a Gladia key. Go to https://app.gladia.io to get yours.',
  );
  process.exit(1);
} else {
  console.log(`Using the Gladia key: ${gladiaKey}`);
}

const gladiaV2BaseUrl = 'https://api.gladia.io/v2/';

async function pollForResult(resultUrl: string, headers: any) {
  while (true) {
    console.log('Polling for results...');
    const pollResponse = (await axios.get(resultUrl, { headers: headers }))
      .data;

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
      audio_url:
        'http://files.gladia.io/example/audio-transcription/split_infinity.wav',
      diarization: true,
    };
    const headers = {
      'x-gladia-key': gladiaKey,
      'Content-Type': 'application/json',
    };

    console.log('- Sending initial request to Gladia API...');

    const initialResponse = (
      await axios.post(gladiaV2BaseUrl + 'transcription/', requestData, {
        headers,
      })
    ).data;

    console.log('- Initial response with Transcription ID:', initialResponse);

    if (initialResponse.result_url) {
      await pollForResult(initialResponse.result_url, headers);
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
