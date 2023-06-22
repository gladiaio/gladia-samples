# Gladia Sample Repository

This repo contains gladia samples for several languages. Feel free to do a PR to add yours, we will add more languages in the future.

All language aim to have 2 minimalist examples :

- [Pre-recorded](https://docs.gladia.io/reference/pre-recorded "Pre-recorded") (You have an audio file that you'd like to transcribe)
- [Live transcription](https://docs.gladia.io/reference/live-audio "Live transcription") (You'd like to have a live transcription of a file/audio stream)

All example are using `audio/text/audio-transcription` endpoint, but you can change this to `video/text/video-transcription` endpoint if you are using videos.
Keep in mind that parameters are `video` and `video_url` instead of `audio` and `audio_url` if you want to use `video/text/video-transcription` endpoint.

You can still check the full documentation [here](https://docs.gladia.io/reference/introduction "here")

## Available Samples Status

|                  |             Python              |             TypeScript              |             JavaScript              |
| :--------------: | :-----------------------------: | :---------------------------------: | :---------------------------------: |
| **Pre-recorded** |               ✅                |                 ✅                  |                 ✅                  |
|     **Live**     |               ✅                |                 ✅                  |                 ⏳                  |
|    **README**    | [Link](python/README.md "Link") | [Link](typescript/README.md "Link") | [Link](javascript/README.md "Link") |

## Something is missing ? Contact us !

You can contact us directly [here](https://gladiaio.typeform.com/support?typeform-source=github.com/gladiaio/gladia-samples) and you can also open an issue in this repository.
