from gladiaio_sdk import GladiaClient

gladia_client = GladiaClient(your_api_key="your_api_key")
transcription = gladia_client.transcribe(
    audio="https://www.youtube.com/watch?v=hbhTVIa9arE",
    options={
    "language_config": {
    "languages": ["en", "ko", "zh", "mn","ru", "ja"],
    "code_switching": True,
    },
    "custom_vocabulary_config": {
    "vocabulary": [
      "aaruul",
      {"value": "mutton"},
      {
        "value": "Misha",
        "pronunciations": ["micha, misha, mi cha, mi sha"],
        "intensity": 0.4,
        "language": "de"
      }
    ],
    "default_intensity": 0.6
  },
   "translation": True,
  "translation_config": {
    "target_languages": [
      "en"
    ],
  }
}
)
print("Transcription: ", transcription.result.transcription.full_transcript)
print("--------------------------------")
print("Translation: ", transcription.result.translation.results[0].full_transcript)

