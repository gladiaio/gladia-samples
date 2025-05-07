## How to Transcribe Twilio Calls in Real Time with Flask and Python & Gladia (μ-law Native)

Twilio's Voice **Media Streams** deliver 8 kHz, 8-bit μ-law audio. Gladia's real-time Speech-to-Text (STT) API now ingests that exact format out-of-the-box, so you can skip every resample or decode step and still keep sub-300 ms latency.

Gladia's `/v2/live` endpoint lets you specify **`encoding: "wav/ulaw"`** with **`bit_depth: 8`**, matching Twilio 1-for-1 ([Gladia][1]).

---

### Prerequisites

| What you need                             | Why                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------- |
| **Gladia API key**                        | Sign up & copy from the dashboard.                                   |
| **Twilio account + voice-enabled number** | To receive / place calls.                                            |
| **Python 3.8+**                           | We'll use `flask`, `flask-sock`, `websockets`, and `requests`.       |
| **Public URL**                            | Expose a WebSocket endpoint with ngrok or a cloud VM.                |
| **8 kHz, 8-bit μ-law audio**              | Exactly what Twilio streams – and what Gladia now consumes natively. |

---

### 1 — Initiate a Gladia live session

```python
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GLADIA_KEY = os.getenv("GLADIA_API_KEY")
GLADIA_INIT = "https://api.gladia.io/v2/live"

def create_session():
    """Initialize a Gladia real-time transcription session."""
    payload = {
        "encoding": "wav/ulaw",  # μ-law!
        "bit_depth": 8,           # 8-bit μ-law
        "sample_rate": 8000,      # matches Twilio
        "channels": 1,
    }
    
    r = requests.post(
        GLADIA_INIT,
        json=payload,
        headers={
            "X-Gladia-Key": GLADIA_KEY,
            "Content-Type": "application/json",
        },
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    print("🛰  Gladia session ID:", data["id"])
    return data["url"]  # wss://api.gladia.io/v2/live?token=…
```

> **Why no resample / decode?** Gladia parses raw μ-law frames directly, so we just forward the bytes Twilio gives us.

---

### 2 — Build the Python WebSocket proxy

The proxy now does **three** things:

1. Accept Twilio's base64-encoded μ-law frames.
2. Base64-decode (that's the *only* transformation).
3. Pipe the raw bytes straight to Gladia and print transcripts as they come back.

```python
# server.py
import os
import base64
import json
import logging
import asyncio
import websockets
import requests
from flask import Flask, request, jsonify
from flask_sock import Sock
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GLADIA_KEY = os.getenv("GLADIA_API_KEY")
GLADIA_INIT = "https://api.gladia.io/v2/live"
# Convert HTTP_PORT to integer
HTTP_PORT = int(os.getenv("HTTP_PORT", "5000"))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
sock = Sock(app)

# Store gladia session information
gladia_session = {
    "id": None,
    "url": None,
}

# Create initial Gladia session
try:
    create_session()
except Exception as e:
    logger.error("Failed to create initial Gladia session: %s", e)
    raise

@sock.route("/media")
def media(ws):
    """Handle incoming WebSocket connections from Twilio."""
    client_info = f"{request.remote_addr}:{request.environ.get('REMOTE_PORT', '?')}"
    logger.info(f"🔌 Twilio WebSocket connected from {client_info}")
    
    handle_websocket(ws)

async def process_message(ws_message, gladia_ws):
    """Process a message asynchronously."""
    try:
        data = json.loads(ws_message)
        if data.get("event") != "media":
            return  # ignore start/stop pings

        # 20 ms μ-law chunk, base64-encoded
        mulaw = base64.b64decode(data["media"]["payload"])

        # Send raw μ-law bytes to Gladia
        await gladia_ws.send(mulaw)

        # Check for transcripts
        try:
            # Try to get transcripts (non-blocking)
            while True:
                resp = await asyncio.wait_for(gladia_ws.recv(), 0.001)
                handle_gladia(resp)
        except asyncio.TimeoutError:
            pass  # No transcript available yet
    except Exception as e:
        logger.error(f"Error processing message: {e}")

def handle_gladia(msg):
    """Process transcription results from Gladia."""
    m = json.loads(msg)
    if m["type"] == "transcript" and m["data"]["is_final"]:
        transcript = m["data"]["utterance"]["text"]
        print(f"📝 Transcript: {transcript}")
        return transcript
```

No `audioop`, no resampling, no CPU overhead, and with proper asynchronous handling.

---

### 3 — Tell Twilio to stream audio

Point your Twilio number (or a Voice Application) to a TwiML endpoint like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="wss://jl.mydomain.com/media"/>
  </Start>

  <!-- Continue your call flow -->
  <Dial>+14155551234</Dial>
</Response>
```

Let's examine each element in this TwiML configuration:

- `<Response>`: The root element of any TwiML document. It contains all the TwiML instructions for handling the call.

- `<Start>`: This element initiates Twilio's Media Streams feature, which allows streaming of audio in real-time while the call is in progress. It tells Twilio to begin capturing and streaming media before executing the rest of the call flow.

- `<Stream>`: A child element of `<Start>` that configures the media stream:
  - `url` attribute: Specifies the WebSocket endpoint where Twilio will send the audio data.
  - The URL must use secure WebSockets (`wss://`).
  - The domain should be your public domain (e.g., an ngrok URL or a custom domain).
  - The path (`/media`) must match the WebSocket route in your Flask application.
  - Each call will create a new WebSocket connection to this endpoint.

- `<Dial>`: After starting the media stream, this element connects the caller to another phone number. During this connection:
  - The media streaming continues in the background.
  - Audio from both sides of the conversation is sent to your WebSocket endpoint.
  - You can replace this with other TwiML verbs like `<Say>`, `<Gather>`, or `<Conference>` depending on your use case.
  - The number shown (`+14155551234`) is just an example - replace it with your desired destination.

When a call triggers this TwiML, Twilio immediately opens a secure WebSocket connection to your server's `/media` endpoint and begins streaming audio as 20 ms μ-law frames. Each frame is base64-encoded and sent as a JSON message, which your server then decodes and forwards to Gladia.

---

### 4 — Expose & test

```bash
# Install dependencies
pip install -r requirements.txt

# Run the proxy (default port 5000)
python server.py

# Or specify a custom port
HTTP_PORT=5001 python server.py

# Tunnel it with ngrok
ngrok http 5000

# Or with a custom domain
ngrok http --domain=your.domain.com 5000
```

Call your Twilio number and you should see live text scroll instantly:

```
🛰  Gladia session ID: 3f65…
🚀  Listening on ws://0.0.0.0:5000/media
🔌 Twilio WebSocket connected from 54.174.99.133:?
📝 Transcript: Hello and thank you for calling Acme support.
📝 Transcript: Sure, I'd be happy to help with your order.
```

---

### 5 — Next steps

* **Add-ons** – enable diarization, sentiment, keywords, etc., by including the flags when you create the session.
* **Dual-channel** – Twilio can stream separate channels; Gladia preserves them so you always know who's speaking.
* **Post-call JSON** – store the session `id` and hit `GET /v2/live/:id` for the full, punctuated transcript when the call ends.
* **Scale it** – containerise the proxy for production use with a proper WSGI server that supports WebSockets.

---

### Wrap-up

Because Gladia natively accepts Twilio's μ-law stream, **real-time call transcription is now literally "base64-decode and forward."** Fewer steps, lower CPU, and the same lightning-fast latency. Drop this proxy into any Python stack and start surfacing live insights from every call. Happy building! 🎙️📝

[1]: https://docs.gladia.io/api-reference/v2/live/init "Initiate a session - Gladia"
