# Gladia Python Samples

Welcome to the Gladia samples for Python developers!

First, grab your API key at [docs.gladia.io](https://docs.gladia.io/chapters/introduction/getting-started), set `GLADIA_API_KEY` in your environment (or in the `.env` file) and you're good to go!

## Quickstart

Three commands and you're running (from this `python/` directory):

```bash
uv venv
uv sync
uv run python core-concepts/pre-recorded/pre_recorded.py
```

This repo has everything you need to get started with Gladia — pre-recorded transcription (sync/async), live from file, and live from microphone.

**Core concepts**

|                           | Run                                                           |
| ------------------------- | ------------------------------------------------------------- |
| Pre-recorded (local file) | `uv run python core-concepts/pre-recorded/pre_recorded.py`    |
| Pre-recorded (URL, async) | `uv run python core-concepts/pre-recorded/pre_recorded_async.py` |
| Live from file            | `uv run python core-concepts/live/live-from-file.py`          |
| Live from microphone      | `uv run python core-concepts/live/live-from-microphone.py`    |

**Examples** (end-to-end scripts):

| Example                     | Description                                                          | Run                                               |
| --------------------------- | -------------------------------------------------------------------- | ------------------------------------------------- |
| **Anonymized call**         | Pre-recorded transcription with PII redaction (GDPR-style)           | `uv run python examples/anonymized_call.py`       |
| **Call sentiment analysis** | Pre-recorded transcription with sentiment analysis and diarization   | `uv run python examples/call_sentiment_analysis.py` |
| **Meeting summary**         | Pre-recorded transcription with summarization                        | `uv run python examples/meeting_summary.py`       |
| **YouTube translation**     | Transcribe a YouTube URL with multi-language and translation options | `uv run python examples/youtube_translation.py`   |

From there, play around — drop in a YouTube link, a local video, your own audio. Have fun with it!
