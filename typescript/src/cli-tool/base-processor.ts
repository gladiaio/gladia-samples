import * as path from 'path';
import chalk from 'chalk';
import { Config, ProcessResult } from './types';

/**
 * Enum for processor states
 */
export enum ProcessorState {
  NOT_STARTED = "⏱️",
  PROGRESS = "🔁",
  DONE = "✅",
  ERROR = "🚨",
}

/**
 * Abstract base class for audio processors
 */
export abstract class BaseProcessor {
  protected filePath: string;
  protected fileName: string;
  protected token: string;
  protected uri: string;
  protected config: Config;

  // State will be defined by subclasses with their specific structure
  public state: {
    status: any; // Will be different for each processor
    progress: number;
    elapsedTime: number;
    transcript: string;
    startTime?: number;
    endTime?: number;
    [key: string]: any; // Allow additional properties
  } | undefined;

  constructor(filePath: string, token: string, uri: string, config: Config) {
    this.filePath = filePath;
    this.fileName = path.basename(filePath);
    this.token = token;
    this.uri = uri;
    this.config = config;
  }

  /**
   * Get the display output for this file
   */
  abstract getDisplayOutput(): string;

  /**
   * Update the state and refresh the display
   */
  protected updateState(updates: Partial<typeof this.state>) {
    Object.assign(this.state, updates);
  }

  /**
   * Process the file - main method to be implemented by subclasses
   */
  abstract process(): Promise<ProcessResult>;

  /**
   * Format elapsed time as a string
   */
  protected getElapsedTimeString(): string {
    if (!this.state.startTime) {
      return 'not started';
    }

    // Use endTime if available, otherwise use current time
    const endTime = this.state.endTime || Date.now();
    const elapsedSeconds = Math.floor((endTime - this.state.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Get basic display output that can be used by subclasses
   */
  protected getBaseDisplayOutput(): string {
    let result = `\n${chalk.bold.blue(`=== ${this.fileName} ===`)}\n`;
    result += `${chalk.yellow('Time elapsed:')} ${this.getElapsedTimeString()}\n`;
    return result;
  }
}
