import asyncio
import base64
import json
import signal

import pyaudio
import requests
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosedOK
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
P = pyaudio.PyAudio()

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


async def send_audio(socket: ClientConnection) -> None:
    stream = P.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=FRAMES_PER_BUFFER,
    )

    while True:
        data = stream.read(FRAMES_PER_BUFFER)
        data = base64.b64encode(data).decode("utf-8")
        json_data = json.dumps({"type": "audio_chunk", "data": {"chunk": str(data)}})
        try:
            await socket.send(json_data)
            await asyncio.sleep(0.1)  # Send audio every 100ms
        except ConnectionClosedOK:
            return


async def receive_messages_from_socket(socket: ClientConnection) -> None:
    async for message in socket:
        content = json.loads(message)
        print_message(content)

async def main():
    response = init_live_session(STREAMING_CONFIGURATION)
    async with connect(response["url"]) as websocket:
        print("\n################ Begin session ################\n")
        loop = asyncio.get_running_loop()
        loop.add_signal_handler(
            signal.SIGINT,
            loop.create_task,
            stop_recording(websocket),
        )

        send_audio_task = asyncio.create_task(send_audio(websocket))
        print_messages_task = asyncio.create_task(receive_messages_from_socket(websocket))
        await asyncio.wait(
            [send_audio_task, print_messages_task],
        )


if __name__ == "__main__":
    asyncio.run(main())
