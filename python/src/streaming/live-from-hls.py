import asyncio
import json
import subprocess
from datetime import time
from typing import Literal, TypedDict
import sys
import signal
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosedOK
import requests

## Constants
GLADIA_API_URL = "https://api.gladia.io"

# Example HLS stream URL - replace with your own
EXAMPLE_HLS_STREAM_URL = "https://wl.tvrain.tv/transcode/ses_1080p/playlist.m3u8"

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
    realtime_processing: dict[str, dict[str, list[str]]] | None


## Example configuration
STREAMING_CONFIGURATION: StreamingConfiguration = {
    "encoding": "wav/pcm",
    "sample_rate": 16_000,
    "bit_depth": 16,
    "channels": 1,
    "language_config": {
        "languages": ["ru"],  # Example language - modify as needed
        "code_switching": False,
    },
    # Example custom vocabulary configuration
    "realtime_processing": {
        "words_accurate_timestamps": True,
        "custom_vocabulary": True,
        "custom_vocabulary_config": {
            "vocabulary": [
                "Example", "Custom", "Words"  # Replace with your vocabulary
            ]
        }
    }
}


## Helpers
def get_gladia_key() -> str:
    if len(sys.argv) != 2 or not sys.argv[1]:
        print("You must provide a Gladia key as the first argument.")
        exit(1)
    return sys.argv[1]


def init_live_session(config: StreamingConfiguration) -> InitiateResponse:
    """Initialize a live transcription session with Gladia API."""
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
    """Format duration in seconds to HH:MM:SS.mmm format."""
    milliseconds = int(seconds * 1_000)
    return time(
        hour=milliseconds // 3_600_000,
        minute=(milliseconds // 60_000) % 60,
        second=(milliseconds // 1_000) % 60,
        microsecond=milliseconds % 1_000 * 1_000,
    ).isoformat(timespec="milliseconds")


async def stream_audio_from_hls(socket: ClientConnection, hls_url: str) -> None:
    """Stream audio from an HLS stream to the WebSocket."""
    ffmpeg_command = [
        "ffmpeg", "-re",
        "-i", hls_url,
        "-ar", str(STREAMING_CONFIGURATION["sample_rate"]),
        "-ac", str(STREAMING_CONFIGURATION["channels"]),
        "-f", "wav",
        "-bufsize", "16K",
        "pipe:1",
    ]

    ffmpeg_process = subprocess.Popen(
        ffmpeg_command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=10**6,
    )

    print("Started FFmpeg process for HLS streaming")

    chunk_size = int(
        STREAMING_CONFIGURATION["sample_rate"]
        * (STREAMING_CONFIGURATION["bit_depth"] / 8)
        * STREAMING_CONFIGURATION["channels"]
        * 0.1  # 100ms chunks
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
    ffmpeg_process.terminate()


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


async def stop_recording(websocket: ClientConnection) -> None:
    """Send a stop recording signal to the WebSocket."""
    print(">>>>> Ending the recording...")
    await websocket.send(json.dumps({"type": "stop_recording"}))
    await asyncio.sleep(0)


async def main():
    """Main function to transcribe an HLS stream."""
    print("\nThis script demonstrates how to transcribe audio from an HLS stream.")
    print("Requirements:")
    print("- FFmpeg installed on your system")
    print("- A valid HLS stream URL")
    print("\nExample usage: python live-from-hls.py YOUR_GLADIA_API_KEY\n")

    # Initialize session
    response = init_live_session(STREAMING_CONFIGURATION)
    
    async with connect(response["url"]) as websocket:
        print("\n################ Begin session ################\n")
        
        # Setup signal handler for graceful shutdown
        loop = asyncio.get_running_loop()
        loop.add_signal_handler(
            signal.SIGINT,
            loop.create_task,
            stop_recording(websocket),
        )

        try:
            tasks = [
                asyncio.create_task(
                    stream_audio_from_hls(websocket, EXAMPLE_HLS_STREAM_URL)
                ),
                asyncio.create_task(print_messages_from_socket(websocket)),
            ]
            await asyncio.wait(tasks)
        except asyncio.exceptions.CancelledError:
            for task in tasks:
                task.cancel()
            await stop_recording(websocket)


if __name__ == "__main__":
    asyncio.run(main())