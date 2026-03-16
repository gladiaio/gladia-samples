# JavaScript

First, install all the required packages by running:

```bash
npm install
```

Note: You can get your Gladia key from https://app.gladia.io. Set it via `GLADIA_API_KEY` or a `.env` file.

## Core concepts

### Pre-recorded

Documentation: [Pre-recorded flow](https://docs.gladia.io/api-reference/pre-recorded-flow)

Transcribe a local audio or video file:

```bash
GLADIA_API_KEY=<your_gladia_key> npm run core:pre-recorded
```

### Live

Documentation: [Live flow](https://docs.gladia.io/api-reference/live-flow)

**Live from file** — simulate a live session using an audio file:

```bash
GLADIA_API_KEY=<your_gladia_key> npm run core:live-from-file
```

**Live from microphone** — real-time transcription from your microphone (requires [arecord](https://www.thegeekdiary.com/arecord-command-not-found/) on Linux and [SoX](https://formulae.brew.sh/formula/sox) on macOS):

```bash
GLADIA_API_KEY=<your_gladia_key> npm run core:live-from-microphone
```

When running the live-from-file example you should get an output like:

```bash
00:01.124 --> 00:04.588 | Hola Sasha, ¿qué tal? Hace mucho tiempo que no nos vemos. ¿Cómo vas?
00:05.128 --> 00:10.707 | Hola, ¿qué tal? Yo estoy muy bien. ¿Qué tal estás tú? Yo muy bien. ¿Qué has hecho ayer?
...
01:08.588 --> 01:22.691 | Et finalement, il faut qu'on parle en français...
```

## Solutions

End-to-end examples combining the API with common use cases.

| Solution | Description | Run |
|----------|-------------|-----|
| **Anonymized call** | Pre-recorded transcription with PII redaction (GDPR-style) | `npm run solution:anonymized-call` |
| **Call sentiment analysis** | Pre-recorded transcription with sentiment analysis and diarization | `npm run solution:call-sentiment-analysis` |
| **Meeting summary** | Pre-recorded transcription with summarization | `npm run solution:meeting-summary` |
| **YouTube translation** | Transcribe a YouTube URL with multi-language and translation options | `npm run solution:youtube-translation` |

Example:

```bash
GLADIA_API_KEY=<your_gladia_key> npm run solution:meeting-summary
```
