import os
import base64
import json
import logging
import asyncio
import websockets
import requests
import time
import random
from fastapi import FastAPI, WebSocket, Response, HTTPException, Request
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

GLADIA_KEY = os.getenv("GLADIA_API_KEY")
GLADIA_INIT = "https://api.gladia.io/v2/live"
# Convert HTTP_PORT to integer
HTTP_PORT = int(os.getenv("HTTP_PORT", "5000"))

# Configure logging
logging.basicConfig(
    level=logging.WARNING,  # Change to WARNING to reduce standard logs
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create a special logger just for transcription output
transcript_logger = logging.getLogger("transcription")
transcript_logger.setLevel(logging.INFO)
transcript_handler = logging.StreamHandler()
transcript_handler.setFormatter(logging.Formatter('📝 TRANSCRIPTION: %(message)s'))
transcript_logger.addHandler(transcript_handler)

# Silence uvicorn access logs
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.ERROR)

app = FastAPI()

# Store gladia session information
gladia_session = {
    "id": None,
    "url": None,
    "last_init_attempt": 0,
    "retry_count": 0
}

# Maximum number of retries
MAX_RETRIES = 5
# Initial delay in seconds
INITIAL_RETRY_DELAY = 1
# Maximum delay in seconds
MAX_RETRY_DELAY = 60

def create_session(force=False):
    """Initialize a Gladia real-time transcription session with exponential backoff retry."""
    # If we already have a session and not forcing a new one, return it
    if gladia_session["url"] and not force:
        return gladia_session["url"]
    
    # Rate limiting - wait at least 2 seconds between attempts
    current_time = time.time()
    time_since_last_attempt = current_time - gladia_session["last_init_attempt"]
    if time_since_last_attempt < 2 and gladia_session["last_init_attempt"] > 0:
        logger.debug(f"Rate limiting: waiting before retrying Gladia session creation")
        time.sleep(2 - time_since_last_attempt)
    
    gladia_session["last_init_attempt"] = time.time()
    
    # If we've tried too many times recently, back off
    if gladia_session["retry_count"] >= MAX_RETRIES:
        delay = min(MAX_RETRY_DELAY, INITIAL_RETRY_DELAY * (2 ** (gladia_session["retry_count"] - MAX_RETRIES)))
        # Add jitter
        delay = delay * (0.5 + random.random())
        logger.warning(f"Too many Gladia session creation attempts. Backing off for {delay:.2f} seconds")
        time.sleep(delay)
    
    # Try all possible API formats that might work with Gladia
    # Format 1: Current v2 API format
    payload = {
        "sample_rate": 8000,
        "encoding": "wav/pcm",
        "sample_rate": 8000,
        "bit_depth": 16,
        "channels": 1,

    }

    logger.debug(f"Gladia API payload: {json.dumps(payload)}")
    print(f"Gladia API payload: {json.dumps(payload)}")
    
    try:
        logger.debug("Attempting to create Gladia session...")
        r = requests.post(
            GLADIA_INIT,
            json=payload,
            headers={
                "X-Gladia-Key": GLADIA_KEY,
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        
        # If the request fails, try alternate format
        if r.status_code >= 400:
            print(f"First attempt failed with status {r.status_code}, trying alternate format {r.text}")
            logger.warning(f"First attempt failed with status {r.status_code}, trying alternate format")
            # Format 2: Legacy format
            payload = {
                "encoding": "wav/pcm",
                "sample_rate": 8000,
                "bit_depth": 16,
                "channels": 1
            }
            
            logger.debug(f"Trying alternate payload: {json.dumps(payload)}")
            
            r = requests.post(
                GLADIA_INIT,
                json=payload,
                headers={
                    "X-Gladia-Key": GLADIA_KEY,
                    "Content-Type": "application/json",
                },
                timeout=10,
            )
        
        # Log the response for debugging
        logger.debug(f"Gladia API response status: {r.status_code}")
        
        try:
            resp_json = r.json()
            logger.debug(f"Gladia API response: {json.dumps(resp_json)}")
        except:
            logger.warning(f"Could not parse Gladia API response as JSON: {r.text[:200]}")
        
        r.raise_for_status()
        data = r.json()
        session_id = data["id"]
        logger.debug(f"Created Gladia session ID: {session_id}")
        gladia_session["id"] = session_id
        gladia_session["url"] = data["url"]
        gladia_session["retry_count"] = 0  # Reset retry count on success
        return data["url"]  # wss://api.gladia.io/v2/live?token=…
    except requests.exceptions.RequestException as e:
        gladia_session["retry_count"] += 1
        logger.error(f"Failed to create Gladia session (attempt {gladia_session['retry_count']}): {e}")
        # Return None to indicate failure
        return None


# Try to create initial Gladia session, but don't fail if it doesn't work
try:
    create_session()
except Exception as e:
    logger.error(f"Failed to create initial Gladia session: {e}")
    print("Server will continue to run and attempt to create session when needed.")


def handle_gladia(msg):
    """Process transcription results from Gladia."""
    try:
        m = json.loads(msg)
        if m["type"] == "transcript":
            is_final = m["data"].get("is_final", False)
            transcript = m["data"]["utterance"]["text"]
            
            if is_final and transcript.strip():
                # Only log final transcriptions with content
                transcript_logger.info(f"{transcript}")
                return transcript
        return None
    except Exception as e:
        logger.error(f"Error handling Gladia response: {e}")
        return None


# Add a health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "vonage-gladia-transcription"}


# Add a route to serve the NCCO XML
@app.get("/answer")
async def answer():
    try:
        with open("vonage_example.xml", "r") as file:
            ncco_content = file.read()
        logger.debug("Serving NCCO XML")
        return Response(content=ncco_content, media_type="application/xml")
    except Exception as e:
        logger.error(f"Error serving NCCO XML: {e}")
        return Response(content="Error serving NCCO", status_code=500)


# Add a JSON format NCCO endpoint which might be more reliable
@app.get("/answer.json")
async def answer_json():
    try:
        # Create NCCO in JSON format - proper Vonage format
        ncco = [
            {
                "action": "talk",
                "text": "You are now being connected for transcription."
            },
            {
                "action": "connect",
                "from": "12013775364",
                "endpoint": [
                    {
                        "type": "websocket",
                        "uri": "wss://jl.gladia.dev/media",
                        "content-type": "audio/l16;rate=8000"
                    }
                ],
                "eventUrl": ["https://jl.gladia.dev/events"]
            }
        ]
        logger.debug(f"Serving NCCO JSON")
        return ncco
    except Exception as e:
        logger.error(f"Error serving NCCO JSON: {e}")
        return {"error": "Error serving NCCO"}, 500


# Event webhook to receive Vonage call events
@app.post("/events")
async def events(request: Request):
    try:
        data = await request.json()
        logger.debug(f"Received Vonage event: {json.dumps(data)}")
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Error processing Vonage event: {e}")
        return {"error": "Error processing event"}, 500


@app.websocket("/media")
async def media(websocket: WebSocket):
    """Handle incoming WebSocket connections from Vonage."""
    await websocket.accept()
    client = websocket.client
    client_info = f"{client.host}:{client.port}"
    logger.info(f"🔌 Vonage WebSocket connected from {client_info}")
    
    # Tell the caller we've connected
    try:
        await websocket.send_text(json.dumps({
            "action": "text",
            "text": "WebSocket connection established. Starting transcription."
        }))
    except Exception as e:
        logger.error(f"Failed to send initial message: {e}")

    await handle_websocket(websocket)


@app.websocket("/{remaining_path:path}")
async def catch_all_websocket(websocket: WebSocket, remaining_path: str):
    """Catch-all handler for WebSocket connections."""
    await websocket.accept()
    logger.info(f"🔌 Catch-all WebSocket connected to /{remaining_path}")

    await handle_websocket(websocket)


async def process_message(ws_message, gladia_ws, websocket):
    """Process a message asynchronously."""
    try:
        # Parse the message
        data = json.loads(ws_message)
        msg_type = data.get("event", "unknown")
        logger.debug(f"Received Vonage WebSocket message: {msg_type}")
        
        # Debug the raw message structure
        logger.debug(f"Message structure keys: {list(data.keys())}")
        
        # Handle different message types
        if msg_type == "websocket:connected":
            # Connection confirmation message
            logger.debug("WebSocket connection established with Vonage")
            
            # Send a response to confirm the connection
            await websocket.send_text(json.dumps({
                "action": "speech",
                "text": "Connection established. You can start speaking."
            }))
            return
            
        elif "content" in data and "data" in data.get("content", {}):
            # This is audio data - extract and send to Gladia
            encoding = data.get("content", {}).get("encoding", "")
            logger.debug(f"Received audio data with encoding: {encoding}")
            logger.debug(f"Content structure: {list(data['content'].keys())}")
            
            # Debug the base64 data (first 20 chars)
            b64_data = data["content"]["data"]
            logger.debug(f"Base64 data (first 20 chars): {b64_data[:20]}")
            logger.debug(f"Base64 data length: {len(b64_data)}")
            
            try:
                # Decode the base64 data
                audio_payload = base64.b64decode(b64_data)
                logger.debug(f"Decoded audio length: {len(audio_payload)} bytes")
                
                # Send to Gladia and log the result
                logger.debug(f"Sending {len(audio_payload)} bytes to Gladia WebSocket")
                await gladia_ws.send(audio_payload)
                logger.debug("Successfully sent audio data to Gladia")
            except Exception as e:
                logger.error(f"Error sending audio to Gladia: {e}")
                
            # Always send acknowledgment back
            try:
                await websocket.send_text(json.dumps({"event": "ack"}))
            except Exception as e:
                logger.error(f"Error sending ack: {e}")
        else:
            # Log other message types for debugging
            logger.debug(f"Received non-audio message: {json.dumps(data)[:200]}...")
        
    except Exception as e:
        logger.error(f"Error processing message: {e}")
    
    # Check for transcripts from Gladia - this should happen after each message is processed
    try:
        for _ in range(10):  # Try up to 10 times to get transcripts
            try:
                resp = await asyncio.wait_for(gladia_ws.recv(), 0.05)  # Increase timeout slightly
                logger.debug(f"Got response from Gladia: {resp[:200]}")
                transcript = handle_gladia(resp)
                if transcript:
                    # Send transcript back to Vonage
                    logger.debug(f"Sending transcript to caller: {transcript}")
                    await websocket.send_text(json.dumps({
                        "action": "speech",
                        "text": f"I heard: {transcript}"
                    }))
            except asyncio.TimeoutError:
                break  # No more transcripts available
    except Exception as e:
        logger.error(f"Error handling transcripts: {e}")


async def handle_websocket(websocket: WebSocket):
    """Handle a WebSocket connection asynchronously."""
    gladia_ws = None
    
    # Try to create or get a Gladia session
    for attempt in range(3):  # Try up to 3 times for this connection
        session_url = create_session()
        if session_url:
            break
        logger.warning(f"Failed to get Gladia session on attempt {attempt+1}/3, retrying...")
        await asyncio.sleep(2 * (attempt + 1))  # Incremental backoff
    
    if not session_url:
        logger.error("Could not establish Gladia session after multiple attempts")
        await websocket.close(1011, "Could not establish Gladia session")
        return
    
    try:
        logger.debug("Connecting to Gladia session...")
        logger.debug(f"Gladia WebSocket URL: {session_url}")
        gladia_ws = await websockets.connect(session_url)
        logger.debug(f"Connected to Gladia session {gladia_session['id']}")
        
        # Send initial message to let Vonage know we're ready
        await websocket.send_text(json.dumps({
            "event": "connected", 
            "status": "ready"
        }))
        logger.debug("Sent ready message to Vonage")

        while True:
            try:
                logger.debug("Waiting for incoming WebSocket message from Vonage...")
                # Handle both text and binary messages
                message = await websocket.receive()
                logger.debug(f"Received message type: {message.get('type', 'unknown')}")
                
                if "text" in message:
                    # Process text message
                    text_data = message["text"]
                    logger.debug(f"Received text message of length {len(text_data)}")
                    await process_message(text_data, gladia_ws, websocket)
                    
                elif "bytes" in message:
                    # Process binary message - this is likely audio data
                    binary_data = message["bytes"]
                    logger.debug(f"Received binary message of length {len(binary_data)}")
                    
                    # Send directly to Gladia
                    logger.debug(f"Sending {len(binary_data)} bytes directly to Gladia")
                    await gladia_ws.send(binary_data)
                    
                    # Check for transcripts from Gladia
                    try:
                        for _ in range(3):  # Try a few times to get transcripts
                            try:
                                resp = await asyncio.wait_for(gladia_ws.recv(), 0.05)
                                logger.debug(f"Got response from Gladia: {resp[:100]}")
                                transcript = handle_gladia(resp)
                                if transcript:
                                    logger.debug(f"Sending transcript to caller: {transcript}")
                                    await websocket.send_text(json.dumps({
                                        "action": "speech",
                                        "text": f"I heard: {transcript}"
                                    }))
                            except asyncio.TimeoutError:
                                break  # No more transcripts available
                    except Exception as e:
                        logger.error(f"Error handling transcripts: {e}")
                
                else:
                    logger.debug(f"Received message with unknown format: {message}")
                    
            except websockets.exceptions.ConnectionClosed as e:
                logger.warning(f"Vonage WebSocket connection closed: {e}")
                break
            except Exception as e:
                logger.error(f"Error receiving message: {e}")
                break

    except websockets.exceptions.ConnectionClosed as e:
        logger.warning(f"Gladia WebSocket connection closed: {e}")
    except Exception as e:
        logger.error(f"Error connecting to Gladia: {e}")
    finally:
        # Close the Gladia connection
        if gladia_ws:
            try:
                logger.debug("Closing Gladia WebSocket connection")
                await gladia_ws.close()
            except Exception as e:
                logger.error(f"Error closing Gladia connection: {e}")


if __name__ == "__main__":
    if not GLADIA_KEY:
        logger.error("GLADIA_API_KEY environment variable is required")
        exit(1)

    print(f"🚀 Starting server on 0.0.0.0:{HTTP_PORT}")
    print("📝 Transcriptions will appear below:")
    uvicorn.run(app, host="0.0.0.0", port=HTTP_PORT, log_level="error")