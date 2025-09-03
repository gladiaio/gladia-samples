import asyncio
import base64
import json

import pyaudio
import requests
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import (
    ConnectionClosed,
    ConnectionClosedError,
)
from helper import (
    print_message,
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
CHANNELS = 1
FORMAT = pyaudio.paInt16
FRAMES_PER_BUFFER = 3200
SAMPLE_RATE = 16_000

STREAMING_CONFIGURATION: StreamingConfiguration = {
    "encoding": "wav/pcm",
    "sample_rate": SAMPLE_RATE,
    "bit_depth": 16,  # It should match the FORMAT value
    "channels": CHANNELS,
    "language_config": {
        "languages": [],
        "code_switching": True,
    },
    "messages_config": {
        "receive_partial_transcripts": False, # Set to True to receive partial/intermediate transcript
        "receive_final_transcripts": True
    }
}

BUFFER = {"data": b"", "bytes_sent": 0}
P = pyaudio.PyAudio()


async def send_audio(stream: pyaudio.Stream, socket: ClientConnection) -> None:
    while True:
        chunk = stream.read(FRAMES_PER_BUFFER)
        BUFFER["data"] += chunk
        data = base64.b64encode(chunk).decode("utf-8")
        json_data = json.dumps({"type": "audio_chunk", "data": {"chunk": str(data)}})
        try:
            await socket.send(json_data)
            await asyncio.sleep(0)
        except ConnectionClosed:
            return


async def receive_messages_from_socket(socket: ClientConnection) -> None:
    try:
        async for message in socket:
            content = json.loads(message)
            if content["type"] == "audio_chunk" and content["acknowledged"]:
                # Use acknowledgement to know when to send the next chunk
                BUFFER["data"] = BUFFER["data"][
                    content["data"]["byte_range"][1] - BUFFER["bytes_sent"] :
                ]
                BUFFER["bytes_sent"] = content["data"]["byte_range"][1]
            print_message(content)
            
    except ConnectionClosedError:
        return


async def force_stop(socket: ClientConnection) -> None:
    await asyncio.sleep(5)
    print(">>>>> Forcibly closing the websocket connection…")
    await socket.close(4500)


async def main():
    response = init_live_session(STREAMING_CONFIGURATION)
    already_stopped = False
    print("\n################ Begin session ################\n")
    stream = P.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=FRAMES_PER_BUFFER,
    )
    print(">>>>> Starting the recording…")
    async for websocket in connect(response["url"]):
        # Sends the buffered audio data if available on resume
        if len(BUFFER["data"]):
            print(
                f">>>>> Resuming the recording with {len(BUFFER['data'])/1024}KiB in cache…"
            )
            await websocket.send(BUFFER["data"])
            BUFFER["data"] = b""

        tasks = []

        if not already_stopped:
            tasks.append(asyncio.create_task(force_stop(websocket)))
            already_stopped = True

        tasks.append(asyncio.create_task(send_audio(stream, websocket)))
        tasks.append(asyncio.create_task(receive_messages_from_socket(websocket)))
        try:
            await asyncio.wait(tasks)
        except asyncio.exceptions.CancelledError:
            for task in tasks:
                task.cancel()
            await stop_recording(websocket)
            await receive_messages_from_socket(websocket)
            break


if __name__ == "__main__":
    asyncio.run(main())
