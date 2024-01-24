import requests
import os

headers = {
    "x-gladia-key": "",  # Replace with your Gladia Token
    "accept": "application/json",  # Accept json as a response, but we are sending a Multipart FormData
}

print(os.getcwd())
file_path = "../../../data/anna-and-sasha-16000.wav"  # Change with your file path

if os.path.exists(file_path):  # This is here to check if the file exists
    print("- File exists")
else:
    print("- File does not exist")

file_name, file_extension = os.path.splitext(
    file_path
)  # Get your audio file name + extension

with open(file_path, "rb") as f:  # Open the file
    files = {
        # Sending a local audio file
        "audio": (
            file_name,
            f,
            "audio/" + file_extension[1:],
        ),  # Send it. Here it represents: (filename: string, file: BufferReader, fileMimeType: string)
        # You can also send an URL for your audio file. Make sure it's the direct link and publicly accessible.
        # 'audio_url': (None, 'http://files.gladia.io/example/audio-transcription/split_infinity.wav'),
        # Then you can pass any parameters you wants. Please see: https://docs.gladia.io/reference/pre-recorded
        "toggle_diarization": (None, True),
    }
    print("- Sending request to Gladia API...")
    response = requests.post(
        "https://api.gladia.io/audio/text/audio-transcription/",
        headers=headers,
        files=files,
    )
    if response.status_code == 200:
        print("- Request successful")
        result = response.json()
        print(result)
    else:
        print("- Request failed")
        print(response.json())
    print("- End of work")
