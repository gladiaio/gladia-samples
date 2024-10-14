export type StreamingConfig = {
  encoding: "wav/pcm" | "wav/alaw" | "wav/ulaw";
  bit_depth: 8 | 16 | 24 | 32;
  sample_rate: 8_000 | 16_000 | 32_000 | 44_100 | 48_000;
  channels: number;

  language_config?: {
    languages?: string[];
    code_switching?: boolean;
  };
};

export type Recorder = {
  start(): void;
  stop(): void;
};

export type InitiateResponse = {
  id: string;
  url: string;
};
