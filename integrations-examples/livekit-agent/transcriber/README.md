# LiveKit Transcriber agent + Gladia Plugin

This example project will connect to a LiveKit Server and run realtime transcription from voice to text. It's adapted from the LiveKit transcription example: https://github.com/livekit/agents/tree/main/examples/other/transcription

If you don't have a LiveKit Server yet, please follow the instructions in the [parent README](../README.md)

## Setup

### Create your environment file

```bash
cp env.example .env
```

Open the .env file in your text editor and add your API keys:
```ini
GLADIA_API_KEY=your_gladia_api_key
LIVEKIT_URL=your_livekit_server_wss
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

Replace each placeholder with your actual API key from the respective service.

### Install dependencies

Install uv: https://docs.astral.sh/uv/getting-started/installation/

Install the dependencies:
```bash
uv sync
```

## Run the agent

Open the [agent playground](https://agents-playground.livekit.io/) and connect it to your LiveKit Server. 

In the right column under **STATUS**, you should see that the room is connected, but the agent is still loading.

To start the agent in development mode, run:
```bash
uv run main.py dev
```

In the right column, you should see that the agent is now connected. \
You can start talking, and transcriptions will appear in the chat column of the playground.
