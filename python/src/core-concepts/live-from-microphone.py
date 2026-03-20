# pip install gladiaio-sdk
from dataclasses_json import api
from gladiaio_sdk import (
    GladiaClient,
    LiveV2EndedMessage,
    LiveV2InitRequest,
    LiveV2InitResponse,
    LiveV2LanguageConfig,
    LiveV2MessagesConfig,
    LiveV2WebSocketMessage,
)

import signal
import threading
from time import sleep
import pyaudio

SAMPLE_RATE = 16_000
BIT_DEPTH = 16
CHANNELS = 1
FRAMES_PER_BUFFER = 3200


# Create your account and get your API key in 30 seconds ! [Click here](https://docs.gladia.io/chapters/introduction/getting-started) to get started.
gladia_client = GladiaClient(api_key="GLADIA_API_KEY").live()

ended_event = threading.Event()
stop_event = threading.Event()

signal.signal(signal.SIGINT, lambda s, f: stop_event.set())

session = gladia_client.start_session(
    LiveV2InitRequest(
        # Check the encoding, bit depth, sample rate and channels supported at https://docs.gladia.io/api-reference/v2/live/init
        encoding="wav/pcm",
        sample_rate=SAMPLE_RATE,
        bit_depth=BIT_DEPTH,
        channels=CHANNELS,
        # Check the language code supported at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
        language_config=LiveV2LanguageConfig(languages=["en"], code_switching=False),
        messages_config=LiveV2MessagesConfig(
            receive_partial_transcripts=False,
            receive_final_transcripts=True,
        ),
    )
)

@session.once("started")
def on_started(response: LiveV2InitResponse):
    print(f"\n################ Begin session {response.id} ################\n")


@session.on("message")
def on_message(message: LiveV2WebSocketMessage):
    if message.type != "transcript":
        return
    u = message.data.utterance
    if message.data.is_final:
        print(f"\r{u.start:.3f} --> {u.end:.3f} | {u.text.strip()}")
    else:
        print(f"\r{u.start:.3f} --> {u.end:.3f} | {u.text.strip()}", end="", flush=True)


@session.on("error")
def on_error(error: Exception):
    print(f"Error: {error}")


@session.once("ended")
def on_ended(ended: LiveV2EndedMessage):
    print(f"\n################ End session {session.session_id} ################\n")
    ended_event.set()


def stream_microphone():
    p = pyaudio.PyAudio()
    stream = p.open(
        format=pyaudio.paInt16,
        channels=CHANNELS,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=FRAMES_PER_BUFFER,
    )
    try:
        while not stop_event.is_set():
            data = stream.read(FRAMES_PER_BUFFER)
            session.send_audio(data)
            sleep(0.1)
    finally:
        stream.stop_stream()
        stream.close()
        p.terminate()
    session.stop_recording()


threading.Thread(target=stream_microphone, daemon=True).start()
ended_event.wait()


# # For MacOS, use certifi's CA bundle so SSL verification works

# import os
# try:
#     import certifi
#     os.environ.setdefault("SSL_CERT_FILE", certifi.where())
#     os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
# except ImportError:
#     pass  # certifi not installed; rely on system defaults
