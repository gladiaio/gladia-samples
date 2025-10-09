import asyncio
import json
from time import sleep
from typing import Any

import httpx

from env import get_gladia_api_key, get_gladia_api_url

file_url = "http://files.gladia.io/example/audio-transcription/split_infinity.wav"
config = {
    "language_config": {
        "languages": [],
        "code_switching": False,
    },
}

async def run():
    data = {
        "audio_url": file_url,
        **config,
    }

    headers = {
        "x-gladia-key": get_gladia_api_key(),  # Replace with your Gladia Token
        "Content-Type": "application/json",
    }

    print("- Sending request to Gladia API...")
    post_response: dict[str, Any] = httpx.post(
        url=f"{get_gladia_api_url()}/v2/pre-recorded/", headers=headers, json=data
    ).json()

    print("Post response with Transcription ID:", post_response)
    result_url = post_response.get("result_url")

    if not result_url:
        print(f"No result URL found in post response: {post_response}")
        return  

    
    while True:
        print("Polling for results...")
        poll_response: dict[str, Any] = httpx.get(
            url=result_url, headers=headers
        ).json()

        if poll_response.get("status") == "done":
            print("- Transcription done: \n")
            print(
                json.dumps(
                    poll_response.get("result"), indent=2, ensure_ascii=False
                )
            )
            break
        elif poll_response.get("status") == "error":
            print("- Transcription failed")
            print(poll_response)
        else:
            print("Transcription status:", poll_response.get("status"))
        sleep(1)

    print("- End of work")


def main():
    asyncio.run(run())


if __name__ == "__main__":
    main()
