from time import sleep
import subprocess
import threading

from gladiaio_sdk import (
    GladiaClient,
    LiveV2EndedMessage,
    LiveV2InitRequest,
    LiveV2InitResponse,
    LiveV2LanguageConfig,
    LiveV2MessagesConfig,
    LiveV2WebSocketMessage,
)


SAMPLE_RATE = 16_000
BIT_DEPTH = 16
CHANNELS = 1
ENDPOINTING = 0.1

gladia_client = GladiaClient(your_api_key="your_api_key").live()
audio_file = "../../../data/online-meeting-example.mp4"

# if necessary, convert the audio file to PCM
def convert_to_pcm(input_path: str) -> bytes:
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            input_path,
            "-f",
            "s16le",
            "-acodec",
            "pcm_s16le",
            "-ar",
            str(SAMPLE_RATE),
            "-ac",
            str(CHANNELS),
            "-",
        ],
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {result.stderr.decode()}")
    return result.stdout


pcm_audio = convert_to_pcm(audio_file)
print(f"Audio: {len(pcm_audio)} bytes of raw PCM")

ended_event = threading.Event()

session = gladia_client.start_session(
    LiveV2InitRequest(
        encoding="wav/pcm",
        sample_rate=SAMPLE_RATE,
        bit_depth=BIT_DEPTH,
        channels=CHANNELS,
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
        print(f"{u.start:.3f} --> {u.end:.3f} | {u.text.strip()}")


@session.on("error")
def on_error(error: Exception):
    print(f"Error: {error}")


@session.once("ended")
def on_ended(ended: LiveV2EndedMessage):
    print(f"\n################ End session {session.session_id} ################\n")
    ended_event.set()


def stream_file():
    chunk_size = int(SAMPLE_RATE * (BIT_DEPTH // 8) * CHANNELS * ENDPOINTING)
    offset = 0
    while offset < len(pcm_audio):
        session.send_audio(pcm_audio[offset : offset + chunk_size])
        offset += chunk_size
        sleep(ENDPOINTING)
    print(">>>>> Sent all audio data")
    session.stop_recording()


threading.Thread(target=stream_file, daemon=True).start()
ended_event.wait()

# import os
# # For MacOS, use certifi's CA bundle so SSL verification works 
# try:
#     import certifi
#     os.environ.setdefault("SSL_CERT_FILE", certifi.where())
#     os.environ.setdefault("REQUESTS_CA_BUNDLE", certifi.where())
# except ImportError:
#     pass  # certifi not installed; rely on system defaults
