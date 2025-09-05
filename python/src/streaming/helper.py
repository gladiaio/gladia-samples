import json
from datetime import time
import sys
from websockets.asyncio.client import ClientConnection
from typing import Literal, TypedDict

def get_gladia_key() -> str:
    if len(sys.argv) != 2 or not sys.argv[1]:
        print("You must provide a Gladia key as the first argument.")
        exit(1)
    return sys.argv[1]

## Type definitions
class InitiateResponse(TypedDict):
    id: str
    url: str


class LanguageConfiguration(TypedDict):
    languages: list[str] | None
    code_switching: bool | None


class MessagesConfiguration(TypedDict):
    receive_partial_transcripts: bool | None
    receive_final_transcripts: bool | None


class StreamingConfiguration(TypedDict):
    # This is a reduced set of options. For a full list, see the API documentation.
    # https://docs.gladia.io/api-reference/v2/live/init
    encoding: Literal["wav/pcm", "wav/alaw", "wav/ulaw"]
    bit_depth: Literal[8, 16, 24, 32]
    sample_rate: Literal[8_000, 16_000, 32_000, 44_100, 48_000]
    channels: int
    language_config: LanguageConfiguration | None
    messages_config: MessagesConfiguration | None

def format_duration(seconds: float) -> str:
    milliseconds = int(seconds * 1_000)
    return time(
        hour=milliseconds // 3_600_000,
        minute=(milliseconds // 60_000) % 60,
        second=(milliseconds // 1_000) % 60,
        microsecond=milliseconds % 1_000 * 1_000,
    ).isoformat(timespec="milliseconds")


def print_message(content: dict) -> None:
    if content["type"] == "transcript":
        start = format_duration(content["data"]["utterance"]["start"])
        end = format_duration(content["data"]["utterance"]["end"])
        is_final = content["data"]["is_final"]
        text = content["data"]["utterance"]["text"].strip()
        
        if is_final:
            print(f"\r{start} --> {end} | {text}")
        else:
            print(f"\r{start} --> {end} | {text}", end="", flush=True)

