from gladiaio_sdk import GladiaClient
import ast

from dotenv import load_dotenv
load_dotenv()

client = GladiaClient()
transcription = client.prerecorded().transcribe(
    audio="../../../data/call-center-example.mp4",
    options={
        "language": "en",
        "sentiment_analysis": True,
        "diarization": True,
        "diarization_config": {
            "number_of_speakers":2,
            # max_speakers: 2,
            # min_speakers: 1,
        },
    }
)

sentiments = transcription.result.sentiment_analysis.results

if isinstance(sentiments, str):
    sentiments = ast.literal_eval(sentiments)
for i, r in enumerate(sentiments):
    print(f"Speaker {r['speaker']}: [{r['sentiment']}] {r['emotion']}")
    print(f"  \"{r['text']}\"")
    print(f"  {r['start']:.2f}s - {r['end']:.2f}s")
