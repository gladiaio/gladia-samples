import { readFileSync } from 'fs';
import Mic from 'node-mic';
import { resolve } from 'path';
export function printMessage(message) {
  if (message.type === 'transcript') {
    const is_final = message.data.is_final;
    const { text, start, end, language } = message.data.utterance;
    const line = `${formatSeconds(start)} --> ${formatSeconds(end)} | ${language} | ${text.trim()}`;
    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
    }
    if (is_final) {
      console.log(line);
    } else {
      process.stdout.write(line);
    }
  }
}
function extractDurationFromDurationInMs(durationInMs) {
  if (!Number.isFinite(durationInMs) || durationInMs < 0) {
    throw new Error(`${durationInMs} isn't a valid duration`);
  }
  const milliseconds = Math.floor(durationInMs % 1000);
  let seconds = Math.floor(durationInMs / 1000);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  seconds = seconds % 60;
  minutes = minutes % 60;
  return {
    hours,
    minutes,
    seconds,
    milliseconds,
  };
}
function formatSeconds(duration) {
  if (
    duration == null ||
    Number.isNaN(duration) ||
    !Number.isFinite(duration)
  ) {
    return '--:--.---';
  }
  const { hours, minutes, seconds, milliseconds } =
    extractDurationFromDurationInMs(duration * 1000);
  const fractions = [minutes, seconds];
  if (hours) fractions.unshift(hours);
  return [
    fractions.map((number) => number.toString().padStart(2, '0')).join(':'),
    milliseconds.toString().padStart(3, '0'),
  ].join('.');
}
export function getMicrophoneAudioFormat() {
  return {
    encoding: 'wav/pcm',
    bit_depth: 16,
    sample_rate: 16_000,
    channels: 1,
  };
}
export function initMicrophoneRecorder(onAudioChunk, onEnd) {
  const config = getMicrophoneAudioFormat();
  const microphone = new Mic({
    rate: config.sample_rate,
    channels: config.channels,
    bitwidth: config.bit_depth,
  });
  const microphoneInputStream = microphone.getAudioStream();
  microphoneInputStream.on('data', function (data) {
    onAudioChunk(data);
  });
  microphoneInputStream.on('error', function (err) {
    console.error('Error in Input Stream:', err);
    process.exit(1);
  });
  const recorder = {
    ...microphone,
    started: false,
    start() {
      this.started = true;
      microphone.start();
    },
    stop() {
      if (!this.started) return;
      // Ending the recording
      this.started = false;
      microphone.stop();
      console.log('>>>>> Ending the recording…');
      onEnd();
    },
  };
  // When hitting CTRL+C, we want to stop the recording and get the final result
  process.on('SIGINT', () => recorder.stop());
  return recorder;
}
function parseAudioFile(filePath) {
  const textDecoder = new TextDecoder();
  const buffer = readFileSync(resolve(filePath));
  if (
    textDecoder.decode(buffer.subarray(0, 4)) !== 'RIFF' ||
    textDecoder.decode(buffer.subarray(8, 12)) !== 'WAVE' ||
    textDecoder.decode(buffer.subarray(12, 16)) !== 'fmt '
  ) {
    throw new Error('Unsupported file format');
  }
  const fmtSize = buffer.readUInt32LE(16);
  let encoding;
  const format = buffer.readUInt16LE(20);
  if (format === 1) {
    encoding = 'wav/pcm';
  } else if (format === 6) {
    encoding = 'wav/alaw';
  } else if (format === 7) {
    encoding = 'wav/ulaw';
  } else {
    throw new Error('Unsupported encoding');
  }
  const channels = buffer.readUInt16LE(22);
  const sample_rate = buffer.readUInt32LE(24);
  const bit_depth = buffer.readUInt16LE(34);
  let nextSubChunk = 16 + 4 + fmtSize;
  while (
    textDecoder.decode(buffer.subarray(nextSubChunk, nextSubChunk + 4)) !==
    'data'
  ) {
    nextSubChunk += 8 + buffer.readUInt32LE(nextSubChunk + 4);
  }
  return {
    encoding,
    sample_rate,
    channels,
    bit_depth,
    startDataChunk: nextSubChunk,
    buffer,
  };
}
export function getAudioFileFormat(filePath) {
  const { startDataChunk, buffer, ...format } = parseAudioFile(filePath);
  return format;
}
export function initFileRecorder(onAudioChunk, onEnd, filePath) {
  const { startDataChunk, buffer, bit_depth, sample_rate, channels } =
    parseAudioFile(filePath);
  const audioData = buffer.subarray(
    startDataChunk + 8,
    buffer.readUInt32LE(startDataChunk + 4),
  );
  const chunkDuration = 0.1; // 100 ms
  const bytesPerSample = bit_depth / 8;
  const bytesPerSecond = sample_rate * channels * bytesPerSample;
  const chunkSize = chunkDuration * bytesPerSecond;
  const recorder = {
    interval: null,
    start() {
      let offset = 0;
      this.interval = setInterval(() => {
        onAudioChunk(audioData.subarray(offset, (offset += chunkSize)));
        if (offset >= audioData.length) {
          console.log('>>>>> Sent all audio data');
          this.stop();
        }
      }, chunkDuration * 1000);
    },
    stop() {
      if (!this.interval) return;
      // Ending the recording
      clearInterval(this.interval);
      this.interval = null;
      console.log('>>>>> Ending the recording…');
      onEnd();
    },
  };
  // When hitting CTRL+C, we want to stop the recording and get the final result
  process.on('SIGINT', () => recorder.stop());
  return recorder;
}
