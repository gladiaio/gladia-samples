// Type definitions

export interface GladiaSession {
  id: string;
  url: string;
}

export interface TwilioMessage {
  event: string;
  media?: {
    payload: string;
  };
}

export interface GladiaMessage {
  type: string;
  data?: {
    is_final: boolean;
    utterance: {
      text: string;
    };
  };
}