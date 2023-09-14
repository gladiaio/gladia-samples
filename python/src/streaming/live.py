import asyncio
import websockets
import json
import base64

ERROR_KEY = 'error'
TYPE_KEY = 'type'
TRANSCRIPTION_KEY = 'transcription'
LANGUAGE_KEY = 'language'

# retrieve gladia key
gladiaKey = ''  # replace with your gladia key
if not gladiaKey:
    print('You must provide a gladia key. Go to app.gladia.io')
    exit(1)
else:
    print('Using the gladia key : ' + gladiaKey)

# connect to api websocket
gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription"

async def send_audio(socket):

    # Configure stream with a configuration message
    configuration = {
        "x_gladia_key": gladiaKey,
        # "model_type":"accurate" <- Less faster but more accurate model_type, useful if you need precise addresses for example.
    }
    await socket.send(json.dumps(configuration))

    # Once the initial message is sent, send audio data
    file = '../../../data/anna-and-sasha-16000.wav'
    with open(file, 'rb') as f:
        fileSync = f.read()
    base64Frames = base64.b64encode(fileSync).decode('utf-8')
    partSize = 20000  # The size of each part
    numberOfParts = -(-len(base64Frames) // partSize)  # equivalent of math.ceil

    # Split the audio data into parts and send them sequentially
    for i in range(numberOfParts):
        start = i * partSize
        end = min((i + 1) * partSize, len(base64Frames))
        part = base64Frames[start:end]

        # Delay between sending parts (500 mseconds in this case)
        await asyncio.sleep(0.5)
        message = {
            'frames': part
        }
        await socket.send(json.dumps(message))

    await asyncio.sleep(2)
    print("Final closing")


# get ready to receive transcriptions
async def receive_transcription(socket):
    while True:
        response = await socket.recv()
        utterance = json.loads(response)
        if utterance:
            if ERROR_KEY in utterance:
                print(f"{utterance[ERROR_KEY]}")
                break
            else:
                if (TYPE_KEY in utterance):
                    print(f"{utterance[TYPE_KEY]}: ({utterance[LANGUAGE_KEY]}) {utterance[TRANSCRIPTION_KEY]}")
                else:
                    print('Empty, waiting for next utterance...')
        else:
            print('Empty, waiting for next utterance...')


# run both tasks concurrently
async def main():
    async with websockets.connect(gladiaUrl) as socket:
        send_task = asyncio.create_task(send_audio(socket))
        receive_task = asyncio.create_task(receive_transcription(socket))
        await asyncio.gather(send_task, receive_task)

asyncio.run(main())
