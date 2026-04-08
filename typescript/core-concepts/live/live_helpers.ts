import type {
  LiveV2BitDepth,
  LiveV2SampleRate,
  LiveV2WebSocketMessage,
} from '@gladiaio/sdk';
import { readFileSync } from 'fs';
import Mic from 'node-mic';
import { resolve } from 'path';

export function printMessage(message: LiveV2WebSocketMessage) {
  if (message.type !== 'transcript') return;
  const { is_final, utterance } = message.data;
  const { text, start, end, language } = utterance;
  const line = `${formatSeconds(start)} --> ${formatSeconds(end)} | ${language ?? ''} | ${text.trim()}`;
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

function extractDurationFromDurationInMs(durationInMs: number) {
  if (!Number.isFinite(durationInMs) || durationInMs < 0) {
    throw new Error(`${durationInMs} isn't a valid duration`);
  }
  const milliseconds = Math.floor(durationInMs % 1000);
  let seconds = Math.floor(durationInMs / 1000);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  seconds = seconds % 60;
  minutes = minutes % 60;
  return { hours, minutes, seconds, milliseconds };
}

function formatSeconds(duration: number) {
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
    fractions.map((n) => n.toString().padStart(2, '0')).join(':'),
    milliseconds.toString().padStart(3, '0'),
  ].join('.');
}

export function getMicrophoneAudioFormat(): {
  encoding: 'wav/pcm';
  bit_depth: LiveV2BitDepth;
  sample_rate: LiveV2SampleRate;
  channels: number;
} {
  return {
    encoding: 'wav/pcm',
    bit_depth: 16,
    sample_rate: 16_000,
    channels: 1,
  };
}

export function initMicrophoneRecorder(
  onAudioChunk: (data: Buffer) => void,
  onEnd: () => void,
) {
  const config = getMicrophoneAudioFormat();
  const microphone = new Mic({
    rate: config.sample_rate,
    channels: config.channels,
    bitwidth: config.bit_depth,
  });
  const microphoneInputStream = microphone.getAudioStream();
  microphoneInputStream.on('data', (data: Buffer) => onAudioChunk(data));
  microphoneInputStream.on('error', (err: Error) => {
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
      this.started = false;
      microphone.stop();
      console.log('>>>>> Ending the recording…');
      onEnd();
    },
  };
  process.on('SIGINT', () => recorder.stop());
  return recorder;
}

function parseAudioFile(filePath: string) {
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
  const format = buffer.readUInt16LE(20);
  let encoding: 'wav/pcm' | 'wav/alaw' | 'wav/ulaw';
  if (format === 1) encoding = 'wav/pcm';
  else if (format === 6) encoding = 'wav/alaw';
  else if (format === 7) encoding = 'wav/ulaw';
  else throw new Error('Unsupported encoding');
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

export function getAudioFileFormat(filePath: string): {
  encoding: 'wav/pcm' | 'wav/alaw' | 'wav/ulaw';
  sample_rate: LiveV2SampleRate;
  channels: number;
  bit_depth: LiveV2BitDepth;
} {
  const { startDataChunk, buffer, ...format } = parseAudioFile(filePath);
  return {
    ...format,
    sample_rate: format.sample_rate as LiveV2SampleRate,
    bit_depth: format.bit_depth as LiveV2BitDepth,
  };
}

export function initFileRecorder(
  onAudioChunk: (chunk: Buffer) => void,
  onEnd: () => void,
  filePath: string,
) {
  const { startDataChunk, buffer, bit_depth, sample_rate, channels } =
    parseAudioFile(filePath);
  const dataSize = buffer.readUInt32LE(startDataChunk + 4);
  const audioData = buffer.subarray(
    startDataChunk + 8,
    startDataChunk + 8 + dataSize,
  );
  const chunkDuration = 0.1;
  const bytesPerSample = bit_depth / 8;
  const bytesPerSecond = sample_rate * channels * bytesPerSample;
  const chunkSize = chunkDuration * bytesPerSecond;
  const recorder = {
    interval: null as ReturnType<typeof setInterval> | null,
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
      clearInterval(this.interval);
      this.interval = null;
      console.log('>>>>> Ending the recording…');
      onEnd();
    },
  };
  process.on('SIGINT', () => recorder.stop());
  return recorder;
}
