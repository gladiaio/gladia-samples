# Gladia JavaScript Samples

Welcome to the Gladia samples for JavaScript developers!

First, grab your API key at [docs.gladia.io](https://docs.gladia.io/chapters/introduction/getting-started) set the `GLADIA_API_KEY` in your environment and you're good to go.

## Quickstart

Two commands and you're running:

```bash
npm install
npm run core:pre-recorded
```

This folder covers pre-recorded transcription, live from file, and live from microphone.

**Core concepts**

|                           | Run                                 |
| ------------------------- | ----------------------------------- |
| Pre-recorded (local file) | `npm run core:pre-recorded`         |
| Live from file            | `npm run core:live-from-file`       |
| Live from microphone      | `npm run core:live-from-microphone` |

**Examples** (end-to-end scripts):

| Example                     | Description                                                          | Run                                       |
| --------------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| **Anonymized call**         | Pre-recorded transcription with PII redaction (GDPR-style)           | `npm run example:anonymized-call`         |
| **Call sentiment analysis** | Pre-recorded transcription with sentiment analysis and diarization   | `npm run example:call-sentiment-analysis` |
| **Meeting summary**         | Pre-recorded transcription with summarization                        | `npm run example:meeting-summary`         |
| **YouTube translation**     | Transcribe a YouTube URL with multi-language and translation options | `npm run example:youtube-translation`     |

From there, play around — drop in a YouTube link, a local video, your own audio. Have fun with it!
