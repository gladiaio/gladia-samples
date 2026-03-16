from gladiaio_sdk import GladiaClient

gladia_client = GladiaClient(api_key='your_api_key').prerecorded()

transcription = gladia_client.transcribe(
    audio="../../../data/call-center-example.mp4",
    options={
        "pii_redaction": True,
        "pii_redaction_config": {
            "entity_types": ["GDPR"],
            "processed_text_type": "MASK",
        },
    },
)
print(transcription.result.transcription.full_transcript)
