import { readFileSync } from "fs";
import { Recorder, StreamingConfig } from "./types";
import mic from "mic";
import { resolve } from "path";

export function readGladiaKey(): string {
  const gladiaKey = process.argv[2];
  if (!gladiaKey) {
    console.error(
      "You must provide a Gladia key. Go to https://app.gladia.io to get yours."
    );
    process.exit(1);
  }
  return gladiaKey;
}

export function printMessage(message: {
  type: "transcript" | "post_final_transcript";
  data: any;
}) {
  if (message.type === "transcript" && message.data.is_final) {
    const { text, start, end } = message.data.utterance;
    console.log(
      `${formatSeconds(start)} --> ${formatSeconds(end)} | ${text.trim()}`
    );
  } else if (message.type === "post_final_transcript") {
    console.log();
    console.log("################ End of session ################");
    console.log();
    console.log(JSON.stringify(message.data, null, 2));
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

  return {
    hours,
    minutes,
    seconds,
    milliseconds,
  };
}

function formatSeconds(duration: number | null | undefined) {
  if (
    duration == null ||
    Number.isNaN(duration) ||
    !Number.isFinite(duration)
  ) {
    return "--:--.---";
  }
  const { hours, minutes, seconds, milliseconds } =
    extractDurationFromDurationInMs(duration * 1000);
  const fractions: number[] = [minutes, seconds];
  if (hours) fractions.unshift(hours);
  return [
    fractions.map((number) => number.toString().padStart(2, "0")).join(":"),
    milliseconds.toString().padStart(3, "0"),
  ].join(".");
}

export function initMicrophoneRecorder(
  config: StreamingConfig,
  onAudioChunk: (chunk: Buffer) => void,
  onEnd: () => void
): Recorder {
  const microphone = mic({
    rate: config.sample_rate,
    channels: config.channels,
  });

  const microphoneInputStream = microphone.getAudioStream();
  microphoneInputStream.on("data", function (data) {
    onAudioChunk(data);
  });

  microphoneInputStream.on("error", function (err) {
    console.error("Error in Input Stream:", err);
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

      console.log(">>>>> Ending the recording…");
      onEnd();
    },
  };

  // When hitting CTRL+C, we want to stop the recording and get the final result
  process.on("SIGINT", () => recorder.stop());

  return recorder;
}

export function initFileRecorder(
  config: StreamingConfig,
  onAudioChunk: (chunk: Buffer) => void,
  onEnd: () => void,
  filePath = "../data/anna-and-sasha-16000.wav"
): Recorder {
  const chunkDuration = 0.1; // 100 ms
  const bytesPerSample = config.bit_depth / 8;
  const bytesPerSecond = config.sample_rate * config.channels * bytesPerSample;
  const chunkSize = chunkDuration * bytesPerSecond;

  const buffer = readFileSync(resolve(filePath))
    // remove wav header
    .subarray(44);

  const recorder = {
    interval: null as NodeJS.Timeout | null,
    start() {
      let offset = 0;
      this.interval = setInterval(() => {
        onAudioChunk(buffer.subarray(offset, (offset += chunkSize)));

        if (offset >= buffer.length) {
          console.log(">>>>> Sent all audio data");
          this.stop();
        }
      }, chunkDuration * 1000);
    },
    stop() {
      if (!this.interval) return;

      // Ending the recording

      clearInterval(this.interval);
      this.interval = null;

      console.log(">>>>> Ending the recording…");
      onEnd();
    },
  };

  // When hitting CTRL+C, we want to stop the recording and get the final result
  process.on("SIGINT", () => recorder.stop());

  return recorder;
}
