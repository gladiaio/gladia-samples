import asyncio
from datetime import time
import os
import signal
import threading
from gladiaio_sdk import LiveV2WebSocketMessage, create_live_v2_web_socket_message_from_json


def format_duration(seconds: float) -> str:
    milliseconds = int(seconds * 1_000)
    return time(
        hour=milliseconds // 3_600_000,
        minute=(milliseconds // 60_000) % 60,
        second=(milliseconds // 1_000) % 60,
        microsecond=milliseconds % 1_000 * 1_000,
    ).isoformat(timespec="milliseconds")


def print_message(message: LiveV2WebSocketMessage | str) -> None:
    if isinstance(message, str):
        message = create_live_v2_web_socket_message_from_json(message)
    if message.type == "transcript":
        start = format_duration(message.data.utterance.start)
        end = format_duration(message.data.utterance.end)
        is_final = message.data.is_final
        text = message.data.utterance.text.strip()

        if is_final:
            print(f"\r{start} --> {end} | {text}")
        else:
            print(f"\r{start} --> {end} | {text}", end="", flush=True)

def handle_sigint()  -> tuple[threading.Event, threading.Event]:
    ended_event = threading.Event()
    stop_event = threading.Event()

    ctrl_c_count = 0

    def handle_sigint() -> None:
        nonlocal ctrl_c_count
        ctrl_c_count += 1
        if ctrl_c_count == 1:
            print("\nStopping… (press Ctrl+C again to force exit)")
            stop_event.set()
        else:
            os._exit(130)

    _ = signal.signal(signal.SIGINT, lambda s, f: handle_sigint())

    return ended_event, stop_event

def handle_asyncio_sigint() -> tuple[asyncio.Event, asyncio.Event]:
    ended_event = asyncio.Event()
    stop_event = asyncio.Event()

    ctrl_c_count = 0

    def handle_sigint() -> None:
        nonlocal ctrl_c_count
        ctrl_c_count += 1
        if ctrl_c_count == 1:
            print("\nStopping… (press Ctrl+C again to force exit)")
            stop_event.set()
        else:
            os._exit(130)

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGINT, handle_sigint)

    return ended_event, stop_event