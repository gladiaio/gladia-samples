# !pip install gladiaio-sdk
from gladiaio_sdk import GladiaClient

# Create your account and get your API key in 30 seconds at https://docs.gladia.io/chapters/introduction/getting-started
gladia_client = GladiaClient(api_key="GLADIA_API_KEY").prerecorded()

transcription = gladia_client.transcribe(
    audio_url="https://www.youtube.com/watch?v=hbhTVIa9arE",
    options={
        # check all the supported languages at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
        "language_config": {
            "languages": ["en", "ko", "zh", "mn", "ru", "ja"],
            "code_switching": True,
        },
        # Want to know more about custom vocabulary? check https://docs.gladia.io/chapters/audio-intelligence/custom-vocabulary
        "custom_vocabulary_config": {
            "vocabulary": [
                "aaruul",
                {"value": "mutton"},
                {
                    "value": "Misha",
                    "pronunciations": ["micha", "misha", "mi cha", "mi sha"],
                    "intensity": 0.4,
                    "language": "ko",
                },
            ],
            "default_intensity": 0.6,
        },
        # Want to know more about translation and subtitles ? Check https://docs.gladia.io/chapters/audio-intelligence/translation
        "translation": True,
        # check all the supported languages for translation at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
        "translation_config": {
            "target_languages": ["en"],
        },
    },
)

print("Transcription: ", transcription.result.transcription.full_transcript)
print("--------------------------------")
print("Translation: ", transcription.result.translation.results[0].full_transcript)
