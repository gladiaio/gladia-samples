## How to use it:

### Create and parametrize your Twilio account

- Get your public ip address and choose a port to use for your app
- Create an account on https://www.twilio.com/try-twilio
- Get a phone number, following first step of main page after to connect to your Twilio account
- On the left panel Develop > United States (US1) > Phone Numbers > Manage > Active numbers > Click on the phone number you just created
- In 'Configure' panel, 'Voice Configuration' section, 'A call comes in' field, choose 'Webhook' with URL = 'http://[your-id-address]:[your-app-port-number]' and HTTP = 'HTTP POST'

### Set up ngrok

The app uses [ngrok](https://ngrok.com/) to expose your local server over a secure tunnel so Twilio can reach it.

- Create a free account at https://ngrok.com/
- Copy your **Authtoken** from the [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken)
- Claim a free static domain from the [ngrok Domains page](https://dashboard.ngrok.com/domains) (e.g. `your-name.ngrok-free.app`)

Both values go in your `.env` file (see next section).

### Configure your server and install dependencies

- Copy `.env.example` to `.env` and fill in the following variables:
  - `GLADIA_API_KEY` – your API key from the [Gladia dashboard](https://app.gladia.io/signin)
  - `NGROK_AUTHTOKEN` – your ngrok authtoken
  - `NGROK_DOMAIN` – your ngrok static domain (e.g. `your-name.ngrok-free.app`)
  - `PORT` – the port your server listens on (default `8080`)
- Install dependencies:

```bash
npm i
```

### Make it work

- launch the websocket server:

```bash
npm run start
```

- start a phone call using the phone number obtained in [Create and parametrize your Twilio account](#create-and-parametrize-your-twilio-account) section
- wait until automatic disclaimer finish
- press any key on your phone to launch the stream
- talk

The transcription should appear in the server logs.

## Under the hood

Twilio requires a secure WebSocket endpoint to stream call audio. The app uses the official ngrok Node.js SDK (`@ngrok/ngrok`) to create an HTTPS tunnel at startup, which is then converted to a `wss://` URL for the Twilio stream. In production you would replace ngrok with your own publicly reachable endpoint.
