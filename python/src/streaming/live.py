import os
import asyncio
import websockets
import json
import base64

from time import time


ERROR_KEY = 'error'
TYPE_KEY = 'type'
TRANSCRIPTION_KEY = 'transcription'
LANGUAGE_KEY = 'language'

# retrieve gladia key
gladiaKey = os.getenv("GLADIA_API_KEY")  # replace with your gladia key

if not gladiaKey:
    print('You must provide a gladia key. Go to app.gladia.io')
    exit(1)
else:
    print('using the gladia key : ' + gladiaKey)

# connect to api websocket
gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription"


async def __send_configuration(socket):
    configuration = {
        "x_gladia_key": gladiaKey,
        # "model_type":"accurate" <- Less faster but more accurate model_type, useful if you need precise addresses for example.
    }

    await socket.send(json.dumps(configuration))


def __get_frames(filepath, chuck_size):

    with open(filepath, 'rb') as f:
        file_content = f.read()

    base64_frames = base64.b64encode(file_content).decode('utf-8')
    nb_chuncks = -(-len(base64_frames) // chuck_size)  # equivalent of math.ceil

    return base64_frames, nb_chuncks


async def send_audio(socket):

    histo = []

    # Configure stream with a configuration message
    await __send_configuration(socket=socket)

    # Once the initial message is sent, send audio data
    chuck_size = 20_000  # The size of each part
    base64_frames, nb_chuncks = __get_frames(
        filepath='../../../data/anna-and-sasha-16000.wav',
        chuck_size=chuck_size,
    )

    # Split the audio data into parts and send them sequentially
    for i in range(nb_chuncks):

        start = i * chuck_size
        end = min((i + 1) * chuck_size, len(base64_frames))

        frames_to_send = base64_frames[start:end]

        # Delay between sending parts (500 mseconds in this case)
        await asyncio.sleep(0.5)

        message = {'frames': frames_to_send}
        await socket.send(json.dumps(message))

        time_before = time()
        response = await socket.recv()
        histo.append(time() - time_before)

        utterance = json.loads(response)

        if utterance:
            if ERROR_KEY in utterance:
                print(f"{utterance[ERROR_KEY]}")
                break
            else:
                print(f"{int(histo[-1] * 1000)}ms\t{utterance[TYPE_KEY]}: ({utterance[LANGUAGE_KEY]}) {utterance[TRANSCRIPTION_KEY]}")
        else:
            print('empty, waiting for next utterance...')

    print(f"mean: {int(sum(histo) / len(histo) * 1000)}ms")


async def main():

    async with websockets.connect(gladiaUrl) as socket:
        await send_audio(socket=socket)

asyncio.run(main())
