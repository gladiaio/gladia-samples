export type StreamingAudioFormat = {
  encoding: "wav/pcm" | "wav/alaw" | "wav/ulaw";
  bit_depth: 8 | 16 | 24 | 32;
  sample_rate: 8_000 | 16_000 | 32_000 | 44_100 | 48_000;
  channels: number;
};

export type StreamingConfig = {
  model?: "solaria-1";
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
      vocabulary: (Vocab | string)[];
      default_intensity?: number;
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

  messages_config?: {
    receive_final_transcripts?: boolean;
    receive_speech_events?: boolean;
    receive_pre_processing_events?: boolean;
    receive_realtime_processing_events?: boolean;
    receive_post_processing_events?: boolean;
    receive_acknowledgments?: boolean;
    receive_errors?: boolean;
    receive_lifecycle_events?: boolean;
  };

  callback?: boolean;
  callback_config?: {
    url: string;
    receive_final_transcripts?: boolean;
    receive_speech_events?: boolean;
    receive_pre_processing_events?: boolean;
    receive_realtime_processing_events?: boolean;
    receive_post_processing_events?: boolean;
    receive_acknowledgments?: boolean;
    receive_errors?: boolean;
    receive_lifecycle_events?: boolean;
  };
};

export type Vocab = {
  value: string;
  intensity?: number;
  pronunciations?: string[];
  language?: string;
}

export type Recorder = {
  start(): void;
  stop(): void;
};

export type InitiateResponse = {
  id: string;
  url: string;
};
