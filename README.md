# Gladia sample repository

Sample code for the [Gladia API](https://docs.gladia.io).

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

|                  |                Python                |                  TypeScript                  |                  JavaScript                  |
| :--------------- | :----------------------------------: | :------------------------------------------: | :------------------------------------------: |
| **Pre-recorded** |                  ✅                  |                      ✅                      |                      ✅                      |
| **Live**         |                  ✅                  |                      ✅                      |                      ✅                      |
| **README**       | [python/README.md](python/README.md) | [typescript/README.md](typescript/README.md) | [javascript/README.md](javascript/README.md) |

## Integration examples

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
