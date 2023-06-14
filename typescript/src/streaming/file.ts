const WebSocket = require('ws')
const fs = require('fs')

const ERROR_KEY = 'error'
const TYPE_KEY = 'type'
const TRANSCRIPTION_KEY = 'transcription'
const LANGUAGE_KEY = 'language'

async function sleep(delay) {
  await new Promise(f => setTimeout(f, delay)) 
}

// retrieve gladia key
const gladiaKey = process.argv[2]
if (!gladiaKey){
  console.error('You must provide a gladia key. Go to app.gladia.io')
  process.exit(1)
} else {
  console.log('using the gladia key : ' + gladiaKey)
}

// connect to api websocket
const gladiaUrl = "wss://api.gladia.io/audio/text/audio-transcription"
const socket = new WebSocket(gladiaUrl)

// get ready to receive transcriptions
socket.onmessage = (event) => {
  const utterance = JSON.parse(event.data)
  if (Object.keys(utterance).length != 0){
    if (ERROR_KEY in utterance){
      console.error(`${utterance[ERROR_KEY]}`)
      socket.close()
    } else {
      console.log(`${utterance[TYPE_KEY]}: (${utterance[LANGUAGE_KEY]}) ${utterance[TRANSCRIPTION_KEY]}`)
    }
  } else {
    console.log('empty ...')
  }
}

socket.onerror = (error) => {
  console.log(error)
}

socket.onopen = async () => {

  // Configure stream with a configuration message
  const configuration = {
    "x_gladia_key": gladiaKey
  }
  socket.send(JSON.stringify(configuration))

  // Once the initial message is sent, send audio data
  const file = '../data/anna-and-sasha-16000.wav'
  const fileSync = fs.readFileSync(file)
  const base64Frames = Buffer.from(fileSync).toString('base64')
  const partSize = 20000 // The size of each part
  const numberOfParts = Math.ceil(base64Frames.length / partSize)
  
  // Split the audio data into parts and send them sequentially
  for (let i = 0 ; i < numberOfParts ; i++) {
    const start = i * partSize
    const end = Math.min((i + 1) * partSize, base64Frames.length)
    const part = base64Frames.substring(start, end)

    // Delay between sending parts (500 mseconds in this case)
    await sleep(500) 
    const message = {
      frames: part
    }
    socket.send(JSON.stringify(message))
  }

  await sleep(2000) 
  console.log("final closing")
  socket.close()
}
