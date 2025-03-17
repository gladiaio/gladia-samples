import asyncio
import json
import subprocess
import sys
import signal
from datetime import time
from typing import Literal, TypedDict
from websockets.asyncio.client import ClientConnection, connect
from websockets.exceptions import ConnectionClosedOK
import requests

## Constants
GLADIA_API_URL = "https://api.gladia.io"

# Example YouTube video URL - replace with your own stream or video
EXAMPLE_YOUTUBE_URL = "https://www.youtube.com/watch?v=D0VmhHTYptk"

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
        "languages": ["en"],  # Example language - modify as needed
        "code_switching": False,
    },
    # Example custom vocabulary configuration
    "realtime_processing": {
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
    """Get Gladia API key from command line argument."""
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


async def stream_audio_from_youtube(socket: ClientConnection, youtube_url: str) -> None:
    """Stream audio from YouTube livestream to the WebSocket."""
    yt_dlp_command = [
        "yt-dlp",
        "--buffer-size", "16K",
        "-f", "bestaudio",  # Select best audio format
        "-o", "-",  # Output to stdout
        youtube_url,
    ]
    
    ffmpeg_command = [
        "ffmpeg",
        "-re",  # Read input at native framerate
        "-i", "pipe:0",  # Read from stdin
        "-ar", str(STREAMING_CONFIGURATION["sample_rate"]),
        "-ac", str(STREAMING_CONFIGURATION["channels"]),
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

    print("Started yt-dlp and FFmpeg processes")

    chunk_size = int(
        STREAMING_CONFIGURATION["sample_rate"]
        * (STREAMING_CONFIGURATION["bit_depth"] / 8)
        * STREAMING_CONFIGURATION["channels"]
        * 0.1  # 100ms chunks
    )

    while True:
        audio_chunk = ffmpeg_process.stdout.read(chunk_size)
        if not audio_chunk:
            # Optionally, check yt_dlp_process.stderr for relevant errors
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
    """Main function to transcribe a YouTube livestream or video."""
    print("\nThis script demonstrates how to transcribe audio from a YouTube stream.")
    print("Requirements:")
    print("- yt-dlp installed on your system")
    print("- FFmpeg installed on your system")
    print("- A valid YouTube URL (video or livestream)")
    print("\nExample usage: python live-from-youtube.py YOUR_GLADIA_API_KEY\n")

    # Initialize session
    response = init_live_session(STREAMING_CONFIGURATION)
    stop_signal = asyncio.Event()
    
    async with connect(response["url"]) as websocket:
        print("\n################ Begin session ################\n")
        
        # Setup signal handler for graceful shutdown
        def signal_handler():
            stop_signal.set()
            
        loop = asyncio.get_running_loop()
        loop.add_signal_handler(signal.SIGINT, signal_handler)

        try:
            tasks = [
                asyncio.create_task(
                    stream_audio_from_youtube(websocket, EXAMPLE_YOUTUBE_URL)
                ),
                asyncio.create_task(print_messages_from_socket(websocket)),
            ]
            
            # Wait for either tasks to complete or stop signal
            done, pending = await asyncio.wait(
                tasks,
                return_when=asyncio.FIRST_COMPLETED
            )

            # If we get here, either a task completed or we got a stop signal
            for task in pending:
                task.cancel()
            
            # Ensure proper cleanup
            await stop_recording(websocket)
            
            # Wait for remaining tasks to be cancelled
            await asyncio.gather(*pending, return_exceptions=True)
            
        except Exception as e:
            print(f"Error during execution: {e}")
            await stop_recording(websocket)
        finally:
            # Remove the signal handler
            loop.remove_signal_handler(signal.SIGINT)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nScript terminated by user")
