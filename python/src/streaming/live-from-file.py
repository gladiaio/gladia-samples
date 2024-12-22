import asyncio
import json
import os
import sys
from datetime import time
from typing import Literal, TypedDict

import requests
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosedOK

## Constants
GLADIA_API_URL = "https://api.gladia.io"


## Type definitions
class InitiateResponse(TypedDict):
    id: str
    url: str


class LanguageConfiguration(TypedDict):
    languages: list[str] | None
    code_switching: bool | None


class StreamingConfiguration(TypedDict):
    # This is a reduced set of options. For a full list, see the API documentation.
    # https://docs.gladia.io/api-reference/v2/live/init
    encoding: Literal["wav/pcm", "wav/alaw", "wav/ulaw"]
    bit_depth: Literal[8, 16, 24, 32]
    sample_rate: Literal[8_000, 16_000, 32_000, 44_100, 48_000]
    channels: int
    language_config: LanguageConfiguration | None


## Helpers
def get_gladia_key() -> str:
    if len(sys.argv) != 2 or not sys.argv[1]:
        print("You must provide a Gladia key as the first argument.")
        exit(1)
    return sys.argv[1]


def init_live_session(config: StreamingConfiguration) -> InitiateResponse:
    gladia_key = get_gladia_key()
    response = requests.post(
        f"{GLADIA_API_URL}/v2/live",
        headers={"X-Gladia-Key": gladia_key},
        json=config,
        timeout=3,
    )
    if not response.ok:
        print(f"{response.status_code}: {response.text or response.reason}")
        exit(response.status_code)
    return response.json()


def format_duration(seconds: float) -> str:
    milliseconds = int(seconds * 1_000)
    return time(
        hour=milliseconds // 3_600_000,
        minute=(milliseconds // 60_000) % 60,
        second=(milliseconds // 1_000) % 60,
        microsecond=milliseconds % 1_000 * 1_000,
    ).isoformat(timespec="milliseconds")


async def print_messages_from_socket(socket: ClientConnection) -> None:
    async for message in socket:
        content = json.loads(message)
        if content["type"] == "transcript" and content["data"]["is_final"]:
            start = format_duration(content["data"]["utterance"]["start"])
            end = format_duration(content["data"]["utterance"]["end"])
            text = content["data"]["utterance"]["text"].strip()
            print(f"{start} --> {end} | {text}")
        if content["type"] == "post_final_transcript":
            print("\n################ End of session ################\n")
            print(json.dumps(content, indent=2, ensure_ascii=False))


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
        "languages": ["en"],
        "code_switching": False,
    },
}


async def send_audio(socket: ClientConnection) -> None:
    file = "../../../data/test.wav"
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
