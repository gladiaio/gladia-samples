# Gladia Sample Repository

This repo contains Gladia samples for several languages. Feel free to do a PR to add yours, we will add more languages in the future.

All languages aim to have 2 minimalist examples:

- [Pre-recorded](https://docs.gladia.io/reference/pre-recorded) (You have an audio file that you'd like to transcribe)
- [Live transcription](https://docs.gladia.io/reference/live-audio) (You'd like to have a live transcription of a file/audio stream)

All examples are using the `audio/text/audio-transcription` endpoint, but you can change this to `video/text/video-transcription` endpoint if you are using videos.
Keep in mind that parameters are `video` and `video_url` instead of `audio` and `audio_url` if you want to use `video/text/video-transcription` endpoint.

You can still check the full documentation [here](https://docs.gladia.io/reference/introduction)

## Available Samples Status

|                  |          Python          |          TypeScript          |          JavaScript          |               Browser                |
| :--------------: | :----------------------: | :--------------------------: | :--------------------------: | :----------------------------------: |
| **Pre-recorded** |            ✅            |              ✅              |              ✅              |                  ✅                  |
|     **Live**     |            ✅            |              ✅              |              ✅              |                  ✅                  |
|    **README**    | [Link](python/README.md) | [Link](typescript/README.md) | [Link](javascript/README.md) | [Link](javascript-browser/README.md) |

## Something is missing? Contact us!

You can contact us directly [here](https://gladiaio.typeform.com/support?typeform-source=github.com/gladiaio/gladia-samples) and you can also open an issue in this repository.

## Git LFS

To retrieve data files, you need to run the following commands:

```
brew install git-lfs
git lfs install
git lfs pull
```
