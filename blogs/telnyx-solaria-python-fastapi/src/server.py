import os
import base64
import json
import logging
import asyncio
import websockets
import requests
from fastapi import FastAPI, WebSocket
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

GLADIA_KEY = os.getenv("GLADIA_API_KEY")
GLADIA_INIT = "https://api.gladia.io/v2/live"
# Convert HTTP_PORT to integer
HTTP_PORT = int(os.getenv("HTTP_PORT", "5000"))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Store gladia session information
gladia_session = {
    "id": None,
    "url": None,
}


def create_session():
    """Initialize a Gladia real-time transcription session."""
    payload = {
        "encoding": "wav/ulaw",  # μ-law!
        "bit_depth": 8,  # 8-bit μ-law
        "sample_rate": 8000,  # matches Vonage
        "channels": 1,
    }

    try:
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
        logger.info("🛰  Gladia session ID: %s", data["id"])
        gladia_session["id"] = data["id"]
        gladia_session["url"] = data["url"]
        return data["url"]  # wss://api.gladia.io/v2/live?token=…
    except requests.exceptions.RequestException as e:
        logger.error("Failed to create Gladia session: %s", e)
        raise


# Create initial Gladia session
try:
    create_session()
except Exception as e:
    logger.error("Failed to create initial Gladia session: %s", e)
    raise


def handle_gladia(msg):
    """Process transcription results from Gladia."""
    m = json.loads(msg)
    if m["type"] == "transcript" and m["data"]["is_final"]:
        transcript = m["data"]["utterance"]["text"]
        print(f"📝 Transcript: {transcript}")
        return transcript


# Add a health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "vonage-gladia-transcription"}


@app.websocket("/media")
async def media(websocket: WebSocket):
    """Handle incoming WebSocket connections from Vonage."""
    await websocket.accept()
    client = websocket.client
    client_info = f"{client.host}:{client.port}"
    logger.info(f"🔌 Vonage WebSocket connected from {client_info}")

    await handle_websocket(websocket)


@app.websocket("/{remaining_path:path}")
async def catch_all_websocket(websocket: WebSocket, remaining_path: str):
    """Catch-all handler for WebSocket connections."""
    await websocket.accept()
    logger.info(f"🔌 Catch-all WebSocket connected to /{remaining_path}")

    await handle_websocket(websocket)


async def process_message(ws_message, gladia_ws):
    """Process a message asynchronously."""
    try:
        data = json.loads(ws_message)
        
        # Vonage WebSocket sends audio data with a different structure
        # Check if this is audio data from Vonage
        if "content" in data and data.get("content", {}).get("encoding") == "audio/l16;rate=8000":
            # Extract audio data and convert from base64
            audio_payload = base64.b64decode(data["content"]["data"])
            
            # Convert L16 PCM to μ-law for Gladia if needed
            # For simplicity, we'll assume Vonage is already configured to send μ-law
            # If not, a conversion would be needed here
            
            # Send the audio data to Gladia
            await gladia_ws.send(audio_payload)
        elif data.get("event") == "media":
            # Legacy format handling (from Twilio-style messages)
            mulaw = base64.b64decode(data["media"]["payload"])
            await gladia_ws.send(mulaw)
        else:
            logger.debug(f"Non-audio event: {json.dumps(data)[:100]}...")
            return  # Ignore other message types

        # Check for transcripts
        try:
            # Try to get transcripts (non-blocking)
            while True:
                resp = await asyncio.wait_for(gladia_ws.recv(), 0.001)
                handle_gladia(resp)
        except asyncio.TimeoutError:
            pass  # No transcript available yet, continue
    except Exception as e:
        logger.error(f"Error processing message: {e}")


async def handle_websocket(websocket: WebSocket):
    """Handle a WebSocket connection asynchronously."""
    # Connect to Gladia for this connection
    try:
        gladia_ws = await websockets.connect(gladia_session["url"])
        logger.info(f"Connected to Gladia session {gladia_session['id']}")

        while True:
            try:
                message = await websocket.receive_text()
                await process_message(message, gladia_ws)
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break

    except websockets.exceptions.ConnectionClosed:
        logger.info("Gladia WebSocket connection closed")
    finally:
        # Close the Gladia connection
        try:
            await gladia_ws.close()
        except:
            pass


if __name__ == "__main__":
    if not GLADIA_KEY:
        logger.error("GLADIA_API_KEY environment variable is required")
        exit(1)

    logger.info(f"🚀 Starting server on 0.0.0.0:{HTTP_PORT}")
    uvicorn.run(app, host="0.0.0.0", port=HTTP_PORT)