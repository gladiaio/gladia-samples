import os


def get_gladia_api_key() -> str:
    api_key = os.getenv("GLADIA_API_KEY")
    if not api_key:
        raise ValueError("GLADIA_API_KEY is not set")
    return api_key


def get_gladia_api_url() -> str:
    return os.getenv("GLADIA_API_URL", "https://api.gladia.io")


def get_gladia_region() -> str:
    return os.getenv("GLADIA_REGION", "eu-west")  # eu-west or us-west
