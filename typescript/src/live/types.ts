export type StreamingAudioFormat = {
  encoding: "wav/pcm" | "wav/alaw" | "wav/ulaw";
  bit_depth: 8 | 16 | 24 | 32;
  sample_rate: 8_000 | 16_000 | 32_000 | 44_100 | 48_000;
  channels: number;
};

export type StreamingConfig = {
  model?: "fast" | "accurate";
  endpointing?: number;
  maximum_duration_without_endpointing?: number;

  custom_metadata?: Record<string, any>;

  language_config?: {
    languages?: string[];
    code_switching?: boolean;
  };

  pre_processing?: {
    audio_enhancer?: boolean;
    speech_threshold?: number;
  };

  realtime_processing?: {
    words_accurate_timestamps?: boolean;
    custom_vocabulary?: boolean;
    custom_vocabulary_config?: {
      vocabulary: string[];
    };
    translation?: boolean;
    translation_config?: {
      target_languages: string[];
      model?: "base" | "enhanced";
      match_original_utterances?: boolean;
    };
    named_entity_recognition?: boolean;
    sentiment_analysis?: boolean;
  };

  post_processing?: {
    summarization?: boolean;
    summarization_config?: {
      type?: "general" | "bullet_points" | "concise";
    };
    chapterization?: boolean;
  };

  callback?: boolean;
  callback_config?: {
    url: string;
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
