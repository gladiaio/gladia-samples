# Gladia Python Samples

Welcome to the gladia samples for pythoners ! 

First, grab your API key at [docs.gladia.io](https://docs.gladia.io/chapters/introduction/getting-started) and you're good to go.

Set it as `GLADIA_API_KEY` in your environment or put it in a `.env` file in this folder.

## Quickstart

Three commands and you're running:
```bash
uv venv
uv sync
uv run 'core-concepts:pre-recorded'
```

This repo has everything you need to get started with Gladia — pre-recorded transcription, live from file, and live from microphone. 

Plus a set of real-world solution scripts you can run straight away:

| Solution | Description | Run |
|----------|-------------|-----|
| **Anonymized call** | Pre-recorded transcription with PII redaction (GDPR-style) | `python src/solutions/anonymized-call.py` |
| **Call sentiment analysis** | Pre-recorded transcription with sentiment analysis and diarization | `python src/solutions/call-sentiment-analysis.py` |
| **Meeting summary** | Pre-recorded transcription with summarization | `python src/solutions/meeting-summary.py` |
| **YouTube translation** | Transcribe a YouTube URL with multi-language and translation options | `python src/solutions/youtube-translation.py` |

From there, play around — drop in a YouTube link, a local video, your own audio. Have fun with it!