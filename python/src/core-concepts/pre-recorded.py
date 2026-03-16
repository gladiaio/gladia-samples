from gladiaio_sdk import GladiaClient

client = GladiaClient(api_key='your_api_key').prerecorded()

transcription = client.transcribe(
    audio="../../../data/online-meeting-example.mp4")

print(transcription.result.transcription.full_transcript)

