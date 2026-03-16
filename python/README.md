# Python

First, create a virtual environment and install dependencies from `src/`:

```bash
cd src
uv venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate
uv sync
```

Note: You can get your Gladia key from https://app.gladia.io. Set it via `GLADIA_API_KEY` or a `.env` file in `src/` (see `.env.example`).

## Core concepts

Run scripts from the `src/` directory.

### Pre-recorded

Documentation: [Pre-recorded flow](https://docs.gladia.io/api-reference/pre-recorded-flow)

Transcribe a local audio or video file:

```bash
cd src
GLADIA_API_KEY=<your_gladia_key> python core-concepts/pre-recorded.py
```

### Live

Documentation: [Live flow](https://docs.gladia.io/api-reference/live-flow)

**Live from file** — simulate a live session using an audio file (requires [FFmpeg](https://ffmpeg.org/)):

```bash
cd src
GLADIA_API_KEY=<your_gladia_key> python core-concepts/live-from-file.py
```

**Live from microphone** — real-time transcription from your microphone:

```bash
cd src
GLADIA_API_KEY=<your_gladia_key> python core-concepts/live-from-microphone.py
```

## Solutions

End-to-end examples combining the API with common use cases.

| Solution | Description | Run |
|----------|-------------|-----|
| **Anonymized call** | Pre-recorded transcription with PII redaction (GDPR-style) | `python solutions/anonymized-call.py` |
| **Call sentiment analysis** | Pre-recorded transcription with sentiment analysis and diarization | `python solutions/call-sentiment-analysis.py` |
| **Meeting summary** | Pre-recorded transcription with summarization | `python solutions/meeting-summary.py` |
| **YouTube translation** | Transcribe a YouTube URL with multi-language and translation options | `python solutions/youtube-translation.py` |

Example (from `src/`):

```bash
cd src
GLADIA_API_KEY=<your_gladia_key> python solutions/meeting-summary.py
```
