# Gladia sample repository

Sample code for the [Gladia speech-to-text API](https://docs.gladia.io):

- [pre-recorded (async) transcription](https://www.gladia.io/product/speech-to-text-api/async)
- [real-time transcription](https://www.gladia.io/product/speech-to-text-api/real-time)
- [audio intelligence](https://www.gladia.io/product/audio-intelligence)

See [pricing](https://www.gladia.io/pricing) for plans and limits.

## Layout inside each language folder

For **`python/`**, **`javascript/`**, and **`typescript/`**, you will find this tree structure:

```text
language/                          <-- python | javascript | typescript
├── core-concepts/                 <-- basic code samples
│   ├── pre-recorded/              <-- pre-recorded STT (sync / async)
│   └── live/                      <-- live STT (from file and from microphone)
├── examples/                      <-- applied use cases
│   ├── anonymized-call
│   ├── call-sentiment-analysis
│   ├── meeting-summary
│   └── youtube-translation
└── README.md                      <-- how to run samples in that language
```

## Language samples

|                                                                            |                Python                |                  TypeScript                  |                  JavaScript                  |
| :------------------------------------------------------------------------- | :----------------------------------: | :------------------------------------------: | :------------------------------------------: |
| **[Pre-recorded](https://www.gladia.io/product/speech-to-text-api/async)** |                  ✅                  |                      ✅                      |                      ✅                      |
| **[Live](https://www.gladia.io/product/speech-to-text-api/real-time)**     |                  ✅                  |                      ✅                      |                      ✅                      |
| **README**                                                                 | [python/README.md](python/README.md) | [typescript/README.md](typescript/README.md) | [javascript/README.md](javascript/README.md) |

## Applied examples

The `examples/` folder in each language shows [audio intelligence](https://www.gladia.io/product/audio-intelligence) features on top of transcription:

| Example                 | Feature                                  |
| :---------------------- | :--------------------------------------- |
| anonymized-call         | PII redaction                            |
| call-sentiment-analysis | Sentiment analysis + speaker diarization |
| meeting-summary         | Summarization                            |
| youtube-translation     | Translation                              |

## Integration examples

These integrations stream audio to Gladia [real-time transcription](https://www.gladia.io/product/speech-to-text-api/real-time) to power voice agents and meeting bots.

| Integration     | README                                                                                         |
| :-------------- | :--------------------------------------------------------------------------------------------- |
| Discord         | [integrations-examples/discord/README.md](integrations-examples/discord/README.md)             |
| Google Meet bot | [integrations-examples/gmeet-bot/README.md](integrations-examples/gmeet-bot/README.md)         |
| LiveKit agent   | [integrations-examples/livekit-agent/README.md](integrations-examples/livekit-agent/README.md) |
| OBS             | [integrations-examples/OBS/README.md](integrations-examples/OBS/README.md)                     |
| Pipecat bot     | [integrations-examples/pipecat-bot/README.md](integrations-examples/pipecat-bot/README.md)     |
| Twilio          | [integrations-examples/twilio/README.md](integrations-examples/twilio/README.md)               |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for formatting and how to run checks for Python, JavaScript, and TypeScript samples.

## Something missing?

You can [contact us](https://gladiaio.typeform.com/support?typeform-source=github.com/gladiaio/gladia-samples) or open an issue in this repository.
