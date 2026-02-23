# Twilio Call Transcription with Gladia (Go Version)

This project implements real-time transcription of Twilio calls using Gladia's Speech-to-Text API and Go, which natively supports Twilio's μ-law audio format.

## Prerequisites

- **Gladia API key** - Sign up at [app.gladia.io](https://app.gladia.io/)
- **Twilio account + voice-enabled number** 
- **Go 1.21+**
- **Public URL** - Use ngrok or a cloud VM to expose your WebSocket endpoint

## Setup

1. **Install Go dependencies**:
   ```bash
   # install go if needed
   sudo apt-get update && sudo apt-get -y install golang-go 
   # Download dependencies
   go mod download
   ```

2. **Set up environment variables**:
   Create a `.env` file in the same directory as `main.go` with:
   ```
   GLADIA_API_KEY=your_gladia_api_key_here
   # Optional: HTTP_PORT=5001
   ```

3. **Configure Twilio**:
   - Create a TwiML Bin or webhook in your Twilio account at [https://console.twilio.com/us1/develop/twiml-bins](https://console.twilio.com/us1/develop/twiml-bins)
   - Use the contents of `twiml_example.xml` as your TwiML
   - Replace `YOUR_PUBLIC_DOMAIN` with your actual public domain (the ngrok URL from step 2 in "Running the application" or a custom domain)
   - Assign this TwiML Bin to your Twilio phone number at [https://console.twilio.com/us1/develop/phone-numbers/manage/incoming](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)

## Technical Notes

- The server uses standard Go HTTP server with gorilla/websocket for WebSocket support
- The application uses goroutines for concurrent processing
- Error handling follows Go idiomatic patterns

## Running the application

1. **Build and start the server**:
   ```bash
   # Build the application
   go build -o twilio-gladia-server
   
   # Run with default port (5000)
   ./twilio-gladia-server
   
   # Or specify a custom port
   HTTP_PORT=5001 ./twilio-gladia-server
   
   # Alternatively, run without building
   go run main.go
   ```

2. **Expose your server publicly**:
   ```bash
   # Make sure the port matches HTTP_PORT from step 1
   ngrok http $HTTP_PORT  # you'll get a random ngrok URL
   
   # If you used a custom port in step 1, use the same port here
   ngrok http 5001

   # For a custom domain
   ngrok http --domain=your.domain.com 5001
   ```

3. **Update your TwiML**:
   - Update the `url` in your TwiML to your ngrok URL (e.g., `wss://your.domain.com/media` or the random ngrok URL)

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

- **Add-ons** – Enable sentiment, keywords, etc.
- **Dual-channel** – Transcribe both sides of the conversation separately
- **Post-call JSON** – Get the full transcript when the call ends
- **Scale it** – Deploy to cloud services with load balancers for high availability 