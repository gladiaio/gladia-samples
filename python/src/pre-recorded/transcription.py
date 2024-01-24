import requests
import os
from time import sleep


def make_request(url, headers, method="GET", data=None, files=None):
    if method == "POST":
        response = requests.post(url, headers=headers, json=data, files=files)
    else:
        response = requests.get(url, headers=headers)
    return response.json()


print(os.getcwd())
file_path = "../../../data/anna-and-sasha-16000.wav"  # Change with your file path

if os.path.exists(file_path):  # This is here to check if the file exists
    print("- File exists")
else:
    print("- File does not exist")
    exit(0)


file_name, file_extension = os.path.splitext(
    file_path
)  # Get your audio file name + extension

with open(file_path, "rb") as f:  # Open the file
    file_content = f.read()  # Read the content of the file

headers = {
    "x-gladia-key": os.getenv("GLADIA_API_KEY", ""),  # Replace with your Gladia Token
    "accept": "application/json",
}

files = [("audio", (file_path, file_content, "audio/" + file_extension[1:]))]

print("- Uploading file to Gladia...")
upload_response = make_request(
    "https://api.gladia.io/v2/upload/", headers, "POST", files=files
)
print("Upload response with File ID:", upload_response)
audio_url = upload_response.get("audio_url")

data = {
    "audio_url": audio_url,
    "diarization": True,
}
# You can also send an URL directly without uploading it. Make sure it's the direct link and publicly accessible.
# For any parameters, please see: https://docs.gladia.io/reference/pre-recorded

headers["Content-Type"] = "application/json"

print("- Sending request to Gladia API...")
post_response = make_request(
    "https://api.gladia.io/v2/transcription/", headers, "POST", data=data
)

print("Post response with Transcription ID:", post_response)
result_url = post_response.get("result_url")

if result_url:
    while True:
        print("Polling for results...")
        poll_response = make_request(result_url, headers)

        if poll_response.get("status") == "done":
            print("- Transcription done: \n")
            print(poll_response.get("result"))
            break
        elif poll_response.get("status") == "error":
            print("- Transcription failed")
            print(poll_response)
        else:
            print("Transcription status:", poll_response.get("status"))
        sleep(1)

print("- End of work")
