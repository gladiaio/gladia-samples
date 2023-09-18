import { Client, Events, GatewayIntentBits } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus, EndBehaviorType } from '@discordjs/voice';
import { sendDataToGladia, initGladiaConnection } from './gladia.js'; // import the initialization function
import * as prism from 'prism-media';

const config = {
  // Your bot secret token
  token: '',
  // Your server ID (known as guild id)
  guildId: '',
  // The Voice channel ID you want to bot to connect to
  voiceChannelId: ''
};

const { token, guildId, voiceChannelId } = config;
const users = {};
const userSockets = {}; // Store user WebSocket connections here

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages] });

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  const guild = client.guilds.cache.get(guildId);
  const voiceChannel = guild.channels.cache.get(voiceChannelId);

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: true,
  });

  connection.on(VoiceConnectionStatus.Ready, () => {
    console.log('The connection has entered the Ready state - ready to listen to audios!');

    connection.receiver.speaking.on("start", async userId => { 
      if (!users[userId]) {
        const userInfos = await client.users.fetch(userId);
        users[userId] = userInfos;
      }
      const userName = users[userId].globalName ?? 'Unknown User';

      if (!userSockets[userId]) {
        console.log(`Init new websocket connection for : ${userName}`);
        userSockets[userId] = initGladiaConnection(userName);
      }

      const opusDecoder = new prism.opus.Decoder({
        frameSize: 50960,
        channels: 1,
        rate: 48000,
      });

      let subscription = connection.receiver.subscribe(userId, { end: { 
        behavior: EndBehaviorType.AfterSilence,
        duration: 300,
      }});

      subscription.pipe(opusDecoder);

      let audioBuffer = []
      opusDecoder.on('data', (chunk) => {
        audioBuffer.push(chunk);
      });

      subscription.once("end", async () => { 
        // Get the last 9 elements of audioBuffer that should be silence
        // since Discord doesn't pad the audio with silence
        const lastNineElements = audioBuffer.slice(-9);

        // Get more silences for a better end of speech detection
        const repeatedElements = [];
        for (let i = 0; i < 10; i++) {
            repeatedElements.push(...lastNineElements);
        }

        // Pad the audio buffer with silence
        audioBuffer.push(...repeatedElements);
        audioBuffer.unshift(...repeatedElements);


        // Concatenate all the Buffers in audioBuffer
        const concatenated = Buffer.concat(audioBuffer);        
        sendDataToGladia(concatenated, userSockets[userId]); // Pass the user's WebSocket connection
        audioBuffer = [];
      }); 
    });
  });

  connection.on(VoiceConnectionStatus.Connecting, () => {
    console.log('Connecting to voice channel...');
  });
});

client.login(token);
