# LiveKit x Gladia Integration

[Gladia](https://www.gladia.io) is available as a Speech-to-Text plugin for LiveKit Agents. \
This example demonstrates how to integrate [Gladia](https://docs.livekit.io/agents/integrations/stt/gladia/) as a Speech-to-Text (STT) plugin within [LiveKit Agents](https://docs.livekit.io/agents/).

## Getting Started
### 1. Set up a LiveKit Server

LiveKit can be deployed in two ways:
- **Self-hosted**: Use the [open-source LiveKit Server](https://github.com/livekit/livekit) on your own infrastructure.
- **Cloud**: Use [LiveKit Cloud](https://cloud.livekit.io/), the fastest and easiest option. Each project includes free monthly bandwidth and transcoding credits.

For this guide, we'll use LiveKit Cloud.  
1. Go to [cloud.livekit.io](https://cloud.livekit.io/) and create a new project.  
2. Navigate to **Settings > API Keys** and securely store your credentials — they will be required for authentication.

### 2. Set up the Frontend with LiveKit Agents Playground

LiveKit offers SDKs across multiple environments, making it simple to build custom integrations.  
For quick testing, use the **LiveKit Agents Playground**, an interactive app to prototype and validate workflows.

Open [agents-playground.livekit.io](https://agents-playground.livekit.io/) and connect it to the project you created in Step 1.

### 3. Create a LiveKit Agent with Gladia STT
LiveKit provides many agent examples here: [LiveKit Agents Examples](https://github.com/livekit/agents/tree/main?tab=readme-ov-file#examples).

For this integration, we’ve built a simple **transcriber agent** using the Gladia plugin. 
You can find it in the [transcriber](./transcriber/) folder.
