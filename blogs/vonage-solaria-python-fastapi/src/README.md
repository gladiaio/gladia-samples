# Vonage Call Transcription with Gladia

This project implements real-time transcription of Vonage calls using Gladia's Speech-to-Text API, which natively supports audio format conversion from Vonage's WebSocket streams.

## Prerequisites

- **Gladia API key** - Sign up at [app.gladia.io](https://app.gladia.io/)
- **Vonage account + voice-enabled number** 
- **Python 3.8+**
- **Public URL** - Use ngrok or a cloud VM to expose your WebSocket endpoint

## Setup

1. **Install dependencies**:
   ```bash
   # Install pyenv (if not already installed)
   # macOS (using Homebrew)
   brew install pyenv
   
   # Linux
   curl https://pyenv.run | bash
   
   # Setup pyenv
   pyenv install 3.12
   pyenv local 3.12

   pyenv virtualenv 3.12 vonage-gladia-python
   
   # Install Python dependencies
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   Create a `.env` file in the same directory as `server.py` with:
   ```
   GLADIA_API_KEY=your_gladia_api_key_here
   ```

3. **Configure Vonage**:
   - Create a new application in your Vonage dashboard at [https://dashboard.nexmo.com/applications](https://dashboard.nexmo.com/applications)
   - Create a new voice application or use an existing one
   - Link your Vonage phone number to this application
   - In your answer URL configuration, use the content of `vonage_example.xml` as your NCCO (Nexmo Call Control Object) (https://jl.gladia.dev/media)
   - Replace `jl.mydomain.com` with your actual public domain (the ngrok URL from step 2 in "Running the application" or a custom domain)

## Technical Notes

- The server uses FastAPI with native WebSocket support
- Uvicorn is used as the ASGI server
- The application is fully asynchronous
- Unlike Twilio which uses μ-law, Vonage typically sends linear PCM audio (audio/l16)

## Running the application

1. **Start the server**:
   ```bash
   # Default port (5000)
   python server.py
   
   # Or specify a custom port
   HTTP_PORT=5001 python server.py
   ```

2. **Expose your server publicly**:
   ```bash
   # Make sure the port matches HTTP_PORT from step 1
   ngrok http 5000  # you'll get a ngrok assigned random URL
   
   # If you used a custom port in step 1, use the same port here
   ngrok http 5001

   # for a custom domain
   ngrok http --domain=jl.mydomain.com 5001
   ```

3. **Update your NCCO**:
   - Update the `uri` in your NCCO to your ngrok URL (e.g., `wss://my.domain.com/media` or the random URL assigned by ngrok)

4. **Test**:
   - Call your Vonage number
   - You should see transcripts appearing in your console

## How it works

1. The server connects to Gladia's real-time STT API
2. When a call comes in, Vonage connects to your WebSocket endpoint
3. Vonage streams audio frames (typically linear PCM), which are base64-decoded
4. The audio data is forwarded to Gladia with minimal processing
5. Gladia returns real-time transcription results

## Next steps

- **Add-ons** – enable diarization, sentiment, keywords, etc.
- **Dual-channel** – Transcribe both sides of the conversation separately
- **Post-call JSON** – Get the full transcript when the call ends
- **Scale it** – Use Gunicorn as a process manager for even higher loads