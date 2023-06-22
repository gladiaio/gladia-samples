const axios = require("axios");
const FormData = require("form-data");

const gladiaKey = process.argv[2]
if (!gladiaKey) {
  console.error('You must provide a gladia key. Go to app.gladia.io')
  process.exit(1)
} else {
  console.log('using the gladia key : ' + gladiaKey)
}

async function url() {
  const form = new FormData();
  form.append(
    "audio_url",
    "http://files.gladia.io/example/audio-transcription/split_infinity.wav"
  );
  form.append("output_format", "json");

  const response = await axios.post(
    "https://api.gladia.io/audio/text/audio-transcription/",
    form,
    {
      headers: {
        ...form.getHeaders(),
        accept: "application/json",
        "x-gladia-key": gladiaKey,
        "Content-Type": "multipart/form-data",
      },
    }
  );
  const stringResponse = JSON.stringify(response.data, null, 2)
  console.log(stringResponse);
}

url()
