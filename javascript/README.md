# Gladia JavaScript Samples

Welcome to the Gladia samples for JavaScript developers!

First, grab your API key at [docs.gladia.io](https://docs.gladia.io/chapters/introduction/getting-started) and you're good to go. 

Set it as `GLADIA_API_KEY` in your environment or put it in a `.env.js` file.

## Quickstart

Two commands and you're running:

```bash
npm install
npm run core:pre-recorded
```

This repo has everything you need to get started with Gladia — pre-recorded transcription, live from file, and live from microphone.

Plus a set of real-world solution scripts you can run straight away:

| Solution | Description | Run |
|----------|-------------|-----|
| **Anonymized call** | Pre-recorded transcription with PII redaction (GDPR-style) | `npm run solution:anonymized-call` |
| **Call sentiment analysis** | Pre-recorded transcription with sentiment analysis and diarization | `npm run solution:call-sentiment-analysis` |
| **Meeting summary** | Pre-recorded transcription with summarization | `npm run solution:meeting-summary` |
| **YouTube translation** | Transcribe a YouTube URL with multi-language and translation options | `npm run solution:youtube-translation` |

From there, play around — drop in a YouTube link, a local video, your own audio. Have fun with it!
