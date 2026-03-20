# pip install gladiaio-sdk
import asyncio

from gladiaio_sdk import GladiaClient


async def main() -> None:

    # Create your account and get your API key in 30 seconds ! [Click here](https://docs.gladia.io/chapters/introduction/getting-started) to get started.
    gladia_client = GladiaClient(api_key="GLADIA_API_KEY").prerecorded_async()

    transcription = await gladia_client.transcribe(
        audio_url="../../../data/anna-and-sasha-16000.wav",
        options={
            "language_config": {
                # check all the supported languages at https://docs.gladia.io/chapters/language/supported-languages#supported-languages
                "languages": ["en"],
            },
        },
    )

    print(transcription.result.transcription.full_transcript)


if __name__ == "__main__":
    asyncio.run(main())
