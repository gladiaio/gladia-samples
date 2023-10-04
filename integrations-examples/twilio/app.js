require("dotenv").config();
const express = require("express");
const twilio = require("twilio");
const WebSocket = require("ws");
const cors = require("cors");
const bodyParser = require("body-parser");
const ngrok = require("ngrok");
const app = express();
const http = require("http");
const server = http.createServer(app);

const gladiaApiKey = process.env.GLADIA_API_KEY;
if (!gladiaApiKey) {
  throw new Error(
    "Required variable GLADIA_API_KEY is not defined in the .env file."
  );
}

const port = process.env.PORT || 8080;

let fisrtGladiaMessage = false;

const corsOptions = {
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
};
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));

const wss = new WebSocket.Server({ server });

let gladiaSocket;

app.get("/", (_, res) => res.send("Twilio Live Stream App"));

app.post("/", async (req, res) => {
  callerNumber = req.body.From; // Get caller's number
  console.log(`Incoming call from: ${callerNumber}`);
  const gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription";
  gladiaSocket = new WebSocket(gladiaUrl);
  gladiaSocket.on("open", async () => {
    console.log("Connecting to gladia socket");
    const configuration = {
      "x-gladia-key": gladiaApiKey,
      language_behaviour: "automatic multiple languages",
      sample_rate: 8000,
      encoding: "wav/ulaw",
      bit_depth: 16,
    };
    gladiaSocket.send(JSON.stringify(configuration));
  });

  gladiaSocket.on("message", async (event) => {
    const gladiaMsg = JSON.parse(event.toString());
    if (!fisrtGladiaMessage) {
      console.log(`Gladia web socket connection id: ${gladiaMsg.apiCallId}`);
      fisrtGladiaMessage = true;
    } else if (
      gladiaMsg.hasOwnProperty("transcription") &&
      gladiaMsg.type === "final"
    ) {
      console.log(
        `${callerNumber}: ${gladiaMsg.transcription} (${gladiaMsg.language}) [confidence: ${gladiaMsg.confidence}]`
      );
    }
  });

  gladiaSocket.on("error", (error) => {
    console.error(`error from gladia: ${error.message}`);
  });

  res.set("Content-Type", "text/xml");
  const voiceResponse = new twilio.twiml.VoiceResponse();
  const secureWsUrl = (await ngrok.connect(port)).replace("https", "wss");
  voiceResponse.start().stream({
    url: secureWsUrl,
  });
  voiceResponse.say("Call started");
  voiceResponse.pause({ length: 500 });
  res.send(voiceResponse.toString());
});

// Set up WebSocket connection
wss.on("connection", (ws) => {
  console.log("A user connected");

  ws.on("error", (error) => {
    console.warn(error);
  });

  ws.on("message", async (userEvent) => {
    const msg = JSON.parse(userEvent);
    switch (msg.event) {
      case "connected":
        console.log(`A new call has started`);
        break;
      case "start":
        console.log("Starting media stream...");
        break;

      case "media":
        const twilioData = msg.media.payload;
        gladiaSocket.send(JSON.stringify({ frames: twilioData }));

        break;
    }
  });

  ws.on("close", () => {
    console.log("User disconnected");
  });
});

console.log(`Listening on Port ${port}`);
server.listen(port);
