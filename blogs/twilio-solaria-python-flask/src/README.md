# Twilio Call Transcription with Gladia

This project implements real-time transcription of Twilio calls using Gladia's Speech-to-Text API, which now natively supports Twilio's μ-law audio format.

## Prerequisites

- **Gladia API key** - Sign up at [app.gladia.io](https://app.gladia.io/)
- **Twilio account + voice-enabled number** 
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

   pyenv virtualenv 3.12 twilio-gladia-python
   
   # Install Python dependencies
   pip install -r requirements.txt
   ```

2. **Set up environment variables**:
   Create a `.env` file in the same directory as `server.py` with:
   ```
   GLADIA_API_KEY=your_gladia_api_key_here
   ```

3. **Configure Twilio**:
   - Create a TwiML Bin or webhook in your Twilio account at [https://console.twilio.com/us1/develop/twiml-bins](https://console.twilio.com/us1/develop/twiml-bins)
   - Use the contents of `twiml_example.xml` as your TwiML
   - Replace `YOUR_PUBLIC_DOMAIN` with your actual public domain (the ngrok URL from step 2 in "Running the application" or a custom domain https://ngrok.com/docs/guides/other-guides/how-to-set-up-a-custom-domain/)
   - Assign this TwiML Bin to your Twilio phone number at [https://console.twilio.com/us1/develop/phone-numbers/manage/incoming](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)

## Technical Notes

- The server uses `flask-sock` for WebSocket support, which works with Flask's built-in development server
- No gevent or external server is needed for development purposes
- For production, consider using a WSGI server that supports WebSockets, like uWSGI or Gunicorn with gevent worker

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
   ngrok http 5000  # you'll get a ngrok assign random url
   
   # If you used a custom port in step 1, use the same port here
   ngrok http 5001

   # for a custom domain
   ngrok http --domain=jl.mydomain.com 5001
   ```

3. **Update your TwiML**:
   - Update the `url` in your TwiML to your ngrok URL (e.g., `wss://jl.mydomain.com/media` or the ngrok random url previously attributed by ngrok)

4. **Test**:
   - Call your Twilio number
   - You should see transcripts appearing in your console

## How it works

1. The server connects to Gladia's real-time STT API
2. When a call comes in, Twilio connects to your WebSocket endpoint
3. Twilio streams 20ms μ-law frames, which are base64-decoded
4. The raw μ-law bytes are forwarded to Gladia without any conversion
5. Gladia returns real-time transcription results

## Next steps

- **Add-ons** – enable diarization, sentiment, keywords, etc.
- **Dual-channel** – Transcribe both sides of the conversation separately
- **Post-call JSON** – Get the full transcript when the call ends
- **Scale it** – Containerize for production use 