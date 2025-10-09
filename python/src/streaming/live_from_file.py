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

from file import get_data_file_path

from .helper import handle_sigint, print_message

audio_file = "anna-and-sasha-16000.wav"
sample_rate = 16_000
bit_depth = 16
channels = 1

config = LiveV2InitRequest(
    encoding="wav/pcm",
    sample_rate=sample_rate,
    bit_depth=bit_depth,
    channels=channels,
    language_config=LiveV2LanguageConfig(
        languages=["es", "ru", "en", "fr"],
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


    def _stream_file() -> None:
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
        while offset < len(file_content) and not stop_event.is_set():
            live_session.send_audio(file_content[offset : offset + chunk_size])
            offset += chunk_size
            sleep(chunk_duration)

        if not stop_event.is_set():
            print(">>>>> Sent all audio data")

        live_session.stop_recording()

    streamer = threading.Thread(target=_stream_file, name="live-v2-streamer", daemon=True)
    streamer.start()

    _ = ended_event.wait()


if __name__ == "__main__":
    main()
