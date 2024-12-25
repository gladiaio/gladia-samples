import asyncio
import json
import subprocess
from typing import Literal, TypedDict
from datetime import timedelta

import requests
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosedOK

# Constants
GLADIA_API_KEY = "key"  # Replace with your Gladia API key
YOUTUBE_LIVESTREAM_URL = "https://www.youtube.com/watch?v=ueS2keSdPWA"  # Replace with your YouTube livestream or video URL
GLADIA_API_URL = "https://api.gladia.io"

# Type definitions
class InitiateResponse(TypedDict):
    id: str
    url: str


class LanguageConfiguration(TypedDict):
    languages: list[str] | None
    code_switching: bool | None


class StreamingConfiguration(TypedDict):
    encoding: Literal["wav/pcm", "wav/alaw", "wav/ulaw"]
    bit_depth: Literal[8, 16, 24, 32]
    sample_rate: Literal[8_000, 16_000, 32_000, 44_100, 48_000]
    channels: int
    language_config: LanguageConfiguration | None
    realtime_processing: dict[str, dict[str, list[str]]] | None


STREAMING_CONFIGURATION: StreamingConfiguration = {
    "encoding": "wav/pcm",
    "sample_rate": 16_000,
    "bit_depth": 16,
    "channels": 1,
    "language_config": {
        "languages": ["ru"],  # Default to Russian transcription
        "code_switching": False,
    },
    "realtime_processing": {
        "custom_vocabulary": True,
        "custom_vocabulary_config": {
            "vocabulary": ["поджоги", "взрывы", "МВД", "мошенники", "Фицо", "Москва", "Путин", "Вологда", "губернатор", "Сталин", "дельфины", "мазут", "Черное море"]
        }
    }
}


def init_live_session(config: StreamingConfiguration) -> InitiateResponse:
    """Initialize a live transcription session."""
    if not GLADIA_API_KEY:
        raise ValueError("GLADIA_API_KEY is not set.")

    response = requests.post(
        f"{GLADIA_API_URL}/v2/live",
        headers={"X-Gladia-Key": GLADIA_API_KEY},
        json=config,
        timeout=15,
    )
    if not response.ok:
        raise ValueError(f"API Error: {response.status_code}: {response.text}")
    return response.json()


async def stream_audio_from_youtube(socket: ClientConnection, youtube_url: str) -> None:
    """Stream audio from YouTube livestream to the WebSocket."""
    yt_dlp_command = [
        "yt-dlp", "--buffer-size", "16K",
        "-f", "233",
        "-o", "-",
        youtube_url,
    ]
    ffmpeg_command = [
        "ffmpeg", "-re",
        "-i", "pipe:0",
        "-ar", "16000",
        "-ac", "1",
        "-f", "wav",
        "-bufsize", "16K",
        "pipe:1",
    ]

    yt_dlp_process = subprocess.Popen(
        yt_dlp_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=10**6,
    )

    ffmpeg_process = subprocess.Popen(
        ffmpeg_command,
        stdin=yt_dlp_process.stdout,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=10**6,
    )

    print("Started yt-dlp and ffmpeg processes")

    chunk_size = int(
        STREAMING_CONFIGURATION["sample_rate"]
        * (STREAMING_CONFIGURATION["bit_depth"] / 8)
        * STREAMING_CONFIGURATION["channels"]
        * 0.1
    )

    while True:
        audio_chunk = ffmpeg_process.stdout.read(chunk_size)
        if not audio_chunk:
            break

        try:
            await socket.send(audio_chunk)
            await asyncio.sleep(0.1)
        except ConnectionClosedOK:
            print("WebSocket connection closed")
            break

    print("Finished sending audio data")
    await stop_recording(socket)

    yt_dlp_process.terminate()
    ffmpeg_process.terminate()


async def stop_recording(websocket: ClientConnection) -> None:
    """Send a stop recording signal."""
    print("Ending the recording session...")
    await websocket.send(json.dumps({"type": "stop_recording"}))
    await asyncio.sleep(0)


async def print_messages_from_socket(socket: ClientConnection) -> None:
    """Print transcription messages received from the WebSocket."""
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


def format_duration(seconds: float) -> str:
    """Format a duration in seconds into HH:MM:SS.mmm."""
    td = timedelta(seconds=seconds)
    return str(td).split('.')[0] + f".{td.microseconds // 1000:03d}"


async def main():
    """Main function to transcribe a YouTube livestream."""
    # Allow dynamic input for custom vocabulary
    custom_vocab_input = input("Enter custom vocabulary (comma-separated, or press Enter to use default): ").strip()
    if custom_vocab_input:
        STREAMING_CONFIGURATION["realtime_processing"] = {
            "custom_vocabulary": True,
            "custom_vocabulary_config": {
                "vocabulary": [word.strip() for word in custom_vocab_input.split(",")[:100]]  # Limit to 100 entries
            }
        }

    print("Initializing live transcription session...")
    response = init_live_session(STREAMING_CONFIGURATION)
    print(f"WebSocket URL: {response['url']}")

    async with connect(response["url"]) as websocket:
        print("Connected to WebSocket")
        try:
            tasks = [
                asyncio.create_task(stream_audio_from_youtube(websocket, YOUTUBE_LIVESTREAM_URL)),
                asyncio.create_task(print_messages_from_socket(websocket)),
            ]
            await asyncio.wait(tasks)
        except asyncio.exceptions.CancelledError:
            for task in tasks:
                task.cancel()
            await stop_recording(websocket)


if __name__ == "__main__":
    asyncio.run(main())
