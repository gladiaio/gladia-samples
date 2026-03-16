from gladiaio_sdk import GladiaClient

gladia_client = GladiaClient(your_api_key="your_api_key").prerecorded()

transcription = gladia_client.transcribe(
    audio="../../../data/call-center-example.mp4",
    options={
        "summarization": True,
    }
)
print(transcription.result.summarization)
