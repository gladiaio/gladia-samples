from gladiaio_sdk import GladiaClient

client = GladiaClient(api_key="your_api_key").pre_recorded()

options = {
    "custom_metadata": {"test": "yes"},
}
transcription = client.transcribe(
    file="../anna-and-sasha-16000.wav",
)
print(transcription.result)
