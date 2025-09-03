import asyncio
import json
import os

import requests
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosedOK
from helper import (
    print_messages_from_socket, 
    InitiateResponse, 
    StreamingConfiguration, 
    get_gladia_key
)

## Constants
GLADIA_API_URL = "https://api.gladia.io"
REGION = "eu-west" # "us-west"

def init_live_session(config: StreamingConfiguration) -> InitiateResponse:
    gladia_key = get_gladia_key()
    response = requests.post(
        f"{GLADIA_API_URL}/v2/live",
        params={"region": REGION},
        headers={"X-Gladia-Key": gladia_key},
        json=config,
        timeout=3,
    )
    if not response.ok:
        print(f"{response.status_code}: {response.text or response.reason}")
        exit(response.status_code)
    return response.json()


async def stop_recording(websocket: ClientConnection) -> None:
    print(">>>>> Ending the recording…")
    await websocket.send(json.dumps({"type": "stop_recording"}))
    await asyncio.sleep(0)


## Sample code
STREAMING_CONFIGURATION: StreamingConfiguration = {
    # This configuration is for a 16kHz, 16-bit, mono PCM WAV file
    "encoding": "wav/pcm",
    "sample_rate": 16_000,
    "bit_depth": 16,
    "channels": 1,
    "language_config": {
        "languages": ["es", "ru", "en", "fr"],
        "code_switching": True,
    },
    "messages_config": {
        "receive_partial_transcripts": False, # Set to True to receive partial/intermediate transcript
        "receive_final_transcripts": True
    }
}


async def send_audio(socket: ClientConnection) -> None:
    file = "../../../data/anna-and-sasha-16000.wav"
    with open(os.path.join(os.path.dirname(__file__), file), "rb") as f:
        file_content = f.read()
    file_content = file_content[44:]  # Skip the WAV header

    audio_duration_in_seconds = 0.1
    chunk_size = int(
        STREAMING_CONFIGURATION["sample_rate"]
        * (STREAMING_CONFIGURATION["bit_depth"] / 8)
        * STREAMING_CONFIGURATION["channels"]
        * audio_duration_in_seconds
    )

    # Send the audio file in chunks
    offset = 0
    while offset < len(file_content):
        try:
            await socket.send(file_content[offset : offset + chunk_size])
            offset += chunk_size
            await asyncio.sleep(audio_duration_in_seconds)
        except ConnectionClosedOK:
            return
    print(">>>>> Sent all audio data")
    await stop_recording(socket)


async def main():
    response = init_live_session(STREAMING_CONFIGURATION)
    async with connect(response["url"]) as websocket:
        try:
            print("\n################ Begin session ################\n")
            tasks = []
            tasks.append(asyncio.create_task(send_audio(websocket)))
            tasks.append(asyncio.create_task(print_messages_from_socket(websocket)))

            await asyncio.wait(tasks)
        except asyncio.exceptions.CancelledError:
            for task in tasks:
                task.cancel()
            await stop_recording(websocket)
            await print_messages_from_socket(websocket)


if __name__ == "__main__":
    asyncio.run(main())
