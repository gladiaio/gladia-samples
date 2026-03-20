# !pip install gladiaio-sdk
from gladiaio_sdk import GladiaClient

#### debug
from dotenv import load_dotenv
load_dotenv()
gladia_client = GladiaClient().pre_recorded()
### end debug

# Create your account and get your API key in 30 seconds ! [Click here](https://docs.gladia.io/chapters/introduction/getting-started) to get started.
# gladia_client = GladiaClient(api_key='GLADIA_API_KEY').prerecorded()

transcription = gladia_client.transcribe(
    audio_url="../../../data/call-center-example.mp4",
    options={
        "pii_redaction": True,
        "pii_redaction_config": {
            # Check all the supported entity types at https://docs.gladia.io/chapters/audio-intelligence/pii-redaction
            "entity_types": ["GDPR"],
            "processed_text_type": "MASK",
        },
    },
)

print(transcription.result.transcription.full_transcript)
