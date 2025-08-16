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


def create_session():
    """Initialize a Gladia real-time transcription session."""
    payload = {
        "encoding": "wav/ulaw",  # μ-law!
        "bit_depth": 8,  # 8-bit μ-law
        "sample_rate": 8000,  # matches Twilio
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
@app.route("/health")
def health_check():
    return jsonify({"status": "ok", "service": "twilio-gladia-transcription"})


# Keep the specific route for /media
@sock.route("/media")
def media(ws):
    """Handle incoming WebSocket connections from Twilio."""
    client_info = f"{request.remote_addr}:{request.environ.get('REMOTE_PORT', '?')}"
    logger.info(f"🔌 Twilio WebSocket connected from {client_info}")
    logger.info(f"WebSocket headers: {request.headers}")

    handle_websocket(ws)


# Add a catch-all route for flexibility
@sock.route("/<path:remaining_path>")
def catch_all_websocket(ws, remaining_path):
    """Catch-all handler for WebSocket connections."""
    logger.info(f"🔌 Catch-all WebSocket connected to /{remaining_path}")
    logger.info(f"WebSocket headers: {request.headers}")

    handle_websocket(ws)


async def process_message(ws_message, gladia_ws):
    """Process a message asynchronously."""
    try:
        data = json.loads(ws_message)
        if data.get("event") != "media":
            logger.debug(f"Non-media event: {data.get('event')}")
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
            pass  # No transcript available yet, continue
    except Exception as e:
        logger.error(f"Error processing message: {e}")


async def handle_connection(ws):
    """Handle a WebSocket connection asynchronously."""
    # Connect to Gladia for this connection
    try:
        gladia_ws = await websockets.connect(gladia_session["url"])
        logger.info(f"Connected to Gladia session {gladia_session['id']}")

        while True:
            message = ws.receive()
            if message is None:
                break

            await process_message(message, gladia_ws)

    except websockets.exceptions.ConnectionClosed:
        logger.info("Gladia WebSocket connection closed")
    finally:
        # Close the Gladia connection
        try:
            await gladia_ws.close()
        except:
            pass


def handle_websocket(ws):
    """Common WebSocket handling logic."""
    try:
        # Create a new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # Run the connection handler in this loop
        loop.run_until_complete(handle_connection(ws))
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        # Clean up
        try:
            loop.close()
        except:
            pass


if __name__ == "__main__":
    if not GLADIA_KEY:
        logger.error("GLADIA_API_KEY environment variable is required")
        exit(1)

    # flask_sock works with the Flask development server
    logger.info(f"🚀 Listening on ws://0.0.0.0:{HTTP_PORT}/media")
    app.run(host="0.0.0.0", port=HTTP_PORT, debug=True)
