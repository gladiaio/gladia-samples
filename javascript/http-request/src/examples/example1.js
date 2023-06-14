const axios = require("axios");
const FormData = require("form-data");
const GLADIA_API_KEY = process.env.GLADIA_API_KEY;

async function example1() {
  const form = new FormData();
  form.append(
    "audio_url",
    "http://files.gladia.io/example/audio-transcription/split_infinity.wav"
  );
  form.append("diarization_max_speakers", "2");
  form.append("language", "english");
  form.append("language_behaviour", "automatic single language");
  form.append("output_format", "json");

  const response = await axios.post(
    "https://api.gladia.io/audio/text/audio-transcription/",
    form,
    {
      headers: {
        ...form.getHeaders(),
        accept: "application/json",
        "x-gladia-key": GLADIA_API_KEY,
        "Content-Type": "multipart/form-data",
      },
    }
  );

  console.log(response.data);
}

module.exports = { example1 };
