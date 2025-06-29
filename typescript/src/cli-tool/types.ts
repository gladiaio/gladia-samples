// Type definitions for the CLI tool

// Configuration type
import {LiveProcessor} from "./live-mode";
import {PreRecordedProcessor} from "./pre-recorded-mode";

export interface Config {
  [key: string]: any;
}

// Result of processing a file
export interface ProcessResult {
  file: string;
  success: boolean;
  message: string;
  data?: any;
}

// Command type
export type Command = 'live' | 'pre-recorded';

export type Process = LiveProcessor | PreRecordedProcessor | undefined;