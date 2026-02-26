from gladiaio_sdk import GladiaClient

client = GladiaClient(api_key="fced5616-cae6-4bfd-87c0-a02a539cff08").pre_recorded()

transcription = client.transcribe(
    file="https://www.youtube.com/watch?v=NhAwCo2wX38",
)
print(transcription.result)
