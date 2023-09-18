# Discord.js v14 BOT + Gladia Live Transcription :

First, install all the required package by running:

```bash
npm install
```

Then, you will to setup the `index.js` script with your Discord keys, guild ID (Server ID), and the Voice Channel ID.

## Run :

Documentation can be found here for Gladia live transcription :

https://docs.gladia.io/reference/live-audio

Once everything is setup properly, just run

```bash
npm run start YOUR_GLADIA_TOKEN
```

Your bot should then join the channel corresponding to the channel ID you configured in the `index.js` file.

## Notes :

- Make sure your bot is invited on the server
- Make sure your bot have the voices permissions
- The current implementation is not optimized, so you might experiences inaccuracy regarding language changes & words
