## How to use it:

### Create and parametrize your Twilio account

- Get your public ip address and choose a port to use for your app
- Create an account on https://www.twilio.com/try-twilio
- Get a phone number, following first step of main page after to connect to your Twilio account
- On the left panel Develop > United States (US1) > Phone Numbers > Manage > Active numbers > Click on the phone number you just created
- In 'Configure' panel, 'Voice Configuration' section, 'A call comes in' field, choose 'Webhook' with URL = 'http://[your-id-address]:[your-app-port-number]' and HTTP = 'HTTP POST'

### Configure your server and install depandancies

- in .env file, add `GLADIA_API_KEY` var with your api key obtained from gladia website (https://app.gladia.io/auth/signin) and `PORT` var, the port you used to configure your phone number in above section (default is 8080)
- install dependancies:

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

To make it works, Twilio needs a secure websocket endpoint. This wss url is obtained using Ngrok. This have to be removed in order to be used in production.
