# Pipecat Bot

[Gladia](https://www.gladia.io) is available as a Speech-to-Text service for Pipecat. \
This example demonstrates how to integrate [Gladia as an STT (Speech-to-Text)](https://docs.pipecat.ai/server/services/stt/gladia) service within a [Pipecat bot](https://docs.pipecat.ai/getting-started/introduction).

---

## 🚀 Getting Started

### Prerequisites

- A valid [Gladia API key](https://docs.gladia.io/)
- [Python uv](https://docs.astral.sh/uv/getting-started/installation/)

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/gladiaio/gladia-samples.git
cd gladia-samples/integrations-examples/pipecat-bot
uv sync
```

### Configuration

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Open the `.env` file in your text editor and add your API keys:

```ini
GLADIA_API_KEY=your_gladia_api_key
```

## Usage

Start the bot with:

```bash
uv run main.py
```

Open http://localhost:7860/client in your browser, and click on "Connect" in the upper-right corner.

You will see a live transcription of what you say into your microphone.

## Modification

The main logic for running the bot is in the **main.py** file. To help you extend or customize the bot, Pipecat offers a [quickstart guide](https://github.com/pipecat-ai/pipecat/tree/main/examples/foundational#pipecat-foundational-examples) along with [more advanced examples](https://github.com/pipecat-ai/pipecat/tree/main/examples/foundational#pipecat-foundational-examples) that you can use as inspiration.
