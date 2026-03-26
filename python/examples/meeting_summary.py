# !pip install gladiaio-sdk
from gladiaio_sdk import GladiaClient

# Create your account and get your API key in 30 seconds at https://docs.gladia.io/chapters/introduction/getting-started
gladia_client = GladiaClient(api_key="GLADIA_API_KEY").prerecorded()

transcription = gladia_client.transcribe(
    audio_url="../../data/call-center-example.mp4",
    options={"summarization": True, "summarization_config": {"type": "bullet_points"}},
)

print(transcription.result.summarization)
