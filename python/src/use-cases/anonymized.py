from gladiaio_sdk import GladiaClient

client = GladiaClient(api_key="fced5616-cae6-4bfd-87c0-a02a539cff08").pre_recorded()

transcription = client.transcribe(
    file="../anna-and-sasha-16000.wav",
    options={
        "pii_redaction": True,
        "pii_redaction_config": {
            "entity_types": ["PERSON"],
            "processed_text_type": "MASK",
        },
    },
)
print(transcription.result)
