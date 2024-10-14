import asyncio
import base64
import json
import os

import pyaudio
import websockets
from dotenv import load_dotenv

load_dotenv()

GLADIA_KEY = os.environ["GLADIA_KEY"]

GLADIA_URL = "wss://api.gladia.io/audio/text/audio-transcription"


ERROR_KEY = "error"
TYPE_KEY = "type"
TRANSCRIPTION_KEY = "transcription"
LANGUAGE_KEY = "language"

LANGUAGE_BEHAVIOUR = "automatic single language"

FRAMES_PER_BUFFER = 3200
FORMAT = pyaudio.paInt16
CHANNELS = 1
RATE = 16000

FINISH_COMMAND_TRESHOLD = 3

P = pyaudio.PyAudio()


async def send_audio(socket):
    print("Connected!")
    config = {
        "x-gladia-key": GLADIA_KEY,
        "language_behaviour": LANGUAGE_BEHAVIOUR,
        "reinject_context": "true",
    }
    await socket.send(json.dumps(config))

    stream = P.open(
        format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=FRAMES_PER_BUFFER,
    )

    while socket.open:
        try:
            data = stream.read(FRAMES_PER_BUFFER)
            data = base64.b64encode(data).decode("utf-8")
            json_data = json.dumps({"frames": str(data)})
            await socket.send(json_data)
        except websockets.exceptions.ConnectionClosedError as e:
            print(e)
            assert e.code == 4008
            break
        except Exception:
            assert False, "Not a websocket 4008 error"
        await asyncio.sleep(0.01)


# get ready to receive transcriptions
async def receive_transcription(socket):
    finish_command_counter = 1
    while True:
        response = await socket.recv()
        utterance = json.loads(response)

        if utterance:
            if ERROR_KEY in utterance:
                print(f"{utterance[ERROR_KEY]}")
                break
            else:
                if TYPE_KEY in utterance:
                    print(
                        f"{utterance[TYPE_KEY]}: ({utterance[LANGUAGE_KEY]}) {utterance[TRANSCRIPTION_KEY]}"
                    )
                    finish_command_counter = 1
                # lets wait for the threshold to simulate a command termination.
                elif finish_command_counter <= FINISH_COMMAND_TRESHOLD:
                    print(
                        f"Empty, waiting for next utterance {finish_command_counter} / {FINISH_COMMAND_TRESHOLD}..."
                    )
                    finish_command_counter += 1
                else:
                    print("Stopping...")
                    await socket.close()
                    break
        else:
            print("Empty, waiting for next utterance...")


async def main():
    async with websockets.connect(GLADIA_URL) as socket:
        send_task = asyncio.create_task(send_audio(socket))
        receive_task = asyncio.create_task(receive_transcription(socket))
        await asyncio.gather(send_task, receive_task)


if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    try:
        loop.run_until_complete(main())
    finally:
        loop.close()
