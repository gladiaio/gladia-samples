# !pip install gladiaio-sdk
import ast

from gladiaio_sdk import GladiaClient

# Create your account and get your API key in 30 seconds at https://docs.gladia.io/chapters/introduction/getting-started
gladia_client = GladiaClient(api_key="GLADIA_API_KEY").prerecorded()

transcription = gladia_client.transcribe(
    audio_url="../data/call-center-example.mp4",
    options={
        # check all the supported languages at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
        "language_config": {
            "languages": ["en"],
        },
        # check all the sentiment/emotion supported at https://docs.gladia.io/chapters/audio-intelligence/sentiment-analysis#sentiment-and-emotion-analysis
        "sentiment_analysis": True,
        # Tip: Enabling diarization and sentiment analysis will extract, for each speaker, the sentiment and emotion of each sentence. Diarization is optional, but it is recommended to enable it when sentiment analysis is enabled.
        "diarization": True,
        # Setting the number of speakers, if known, will enhance the accuracy/stability of the diarization.
        "diarization_config": {
            "number_of_speakers": 2,
            # max_speakers: 2,
            # min_speakers: 1,
        },
    },
)
sentiments = transcription.result.sentiment_analysis.results

if isinstance(sentiments, str):
    sentiments = ast.literal_eval(sentiments)
for i, r in enumerate(sentiments):
    print(f"Speaker {r['speaker']}: [{r['sentiment']}] {r['emotion']}")
    print(f'  "{r["text"]}"')
    print(f"  {r['start']:.2f}s - {r['end']:.2f}s")
