import asyncio
import json
from typing import Any

import httpx
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosedOK

from env import get_gladia_api_key, get_gladia_region, get_gladia_api_url
from file import get_data_file_path

from .helper import print_message

audio_file = "anna-and-sasha-16000.wav"
sample_rate = 16_000
bit_depth = 16
channels = 1

STREAMING_CONFIGURATION = {
    "encoding": "wav/pcm",
    "sample_rate": sample_rate,
    "bit_depth": bit_depth,
    "channels": channels,
    "language_config": {
        "languages": ["es", "ru", "en", "fr"],
        "code_switching": True,
    },
    "messages_config": {
        "receive_partial_transcripts": False,  # Set to True to receive partial/intermediate transcript
        "receive_final_transcripts": True,
    },
}


async def run():
    response = init_live_session(STREAMING_CONFIGURATION)
    async with connect(response["url"]) as websocket:
        tasks: list[asyncio.Task[Any]] = []
        try:
            print(f"\n################ Begin session {response['id']} ################\n")
            tasks.append(asyncio.create_task(send_audio(websocket)))
            tasks.append(asyncio.create_task(receive_messages_from_socket(websocket)))

            _ = await asyncio.wait(tasks)
        except asyncio.exceptions.CancelledError:
            for task in tasks:
                _ = task.cancel()
    print(
        f"\n################ End session {response['id']} ################\n"
    )


async def receive_messages_from_socket(socket: ClientConnection) -> None:
    async for message in socket:
        print_message(str(message))


def init_live_session(config: dict[str, Any]) -> dict[str, Any]:
    gladia_key = get_gladia_api_key()
    return httpx.post(
        f"{get_gladia_api_url()}/v2/live",
        params={"region": get_gladia_region()},
        headers={"X-Gladia-Key": gladia_key},
        json=config,
        timeout=3,
    ).json()


async def send_audio(socket: ClientConnection) -> None:
    file_path = get_data_file_path(audio_file)
    with open(file_path, "rb") as f:
        file_content = f.read()
    file_content = file_content[44:]  # Skip the WAV header

    chunk_duration = 0.1
    chunk_size = int(
        sample_rate * (bit_depth / 8) * channels * chunk_duration
    )

    # Send the audio file in chunks
    offset = 0
    while offset < len(file_content):
        try:
            await socket.send(file_content[offset : offset + chunk_size])
            offset += chunk_size
            await asyncio.sleep(chunk_duration)
        except ConnectionClosedOK:
            return
    print(">>>>> Sent all audio data")
    await socket.send(json.dumps({"type": "stop_recording"}))


def main():
    asyncio.run(run())


if __name__ == "__main__":
    main()
