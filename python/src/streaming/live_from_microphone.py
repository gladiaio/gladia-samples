import threading
from time import sleep
from gladiaio_sdk import (
    GladiaClient,
    LiveV2EndedMessage,
    LiveV2InitRequest,
    LiveV2InitResponse,
    LiveV2LanguageConfig,
    LiveV2MessagesConfig,
    LiveV2WebSocketMessage,
)
import pyaudio

from .helper import handle_sigint, print_message

audio_file = "anna-and-sasha-16000.wav"
sample_rate = 16_000
bit_depth = 16
channels = 1
format = pyaudio.paInt16
frames_per_buffer = 3200

config = LiveV2InitRequest(
    encoding="wav/pcm",
    sample_rate=sample_rate,
    bit_depth=bit_depth,
    channels=channels,
    language_config=LiveV2LanguageConfig(
        languages=[],
        code_switching=True,
    ),
    messages_config=LiveV2MessagesConfig(
        receive_partial_transcripts=False,  # Set to True to receive partial/intermediate transcript
        receive_final_transcripts=True,
    ),
)


def main():
    gladia_client = GladiaClient()
    live_session = gladia_client.live_v2().start_session(config)
    ended_event, stop_event = handle_sigint()

    @live_session.once("started")
    def on_started(response: LiveV2InitResponse):
        print(f"\n################ Begin session {response.id} ################\n")

    @live_session.on("message")
    def on_message(message: LiveV2WebSocketMessage):
        print_message(message)

    @live_session.on("error")
    def on_error(error: Exception):
        print(f"Error: {error}")

    @live_session.once("ended")
    def on_ended(ended: LiveV2EndedMessage):
        print(
            f"\n################ End session {live_session.session_id} ################\n"
        )
        ended_event.set()

    def _stream_microphone() -> None:
        p = pyaudio.PyAudio()
        stream = p.open(
            format=format,
            channels=channels,
            rate=sample_rate,
            input=True,
            frames_per_buffer=frames_per_buffer,
        )

        try:
            while not stop_event.is_set():
                data = stream.read(frames_per_buffer)
                live_session.send_audio(data)
                sleep(0.1)  # Send audio every 100ms
        finally:
            stream.stop_stream()
            stream.close()
            p.terminate()

        live_session.stop_recording()

    streamer = threading.Thread(target=_stream_microphone, name="live-v2-streamer", daemon=True)
    streamer.start()

    _ = ended_event.wait()


if __name__ == "__main__":
    main()
