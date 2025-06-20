import WebSocket from 'ws';
import * as fs from 'fs';
import chalk from 'chalk';
import { getAudioFileFormat, initFileRecorder } from '../live/helpers';
import { Config, ProcessResult } from './types';
import { StreamingConfig } from '../live/types';
import { BaseProcessor, ProcessorState } from './base-processor';

/**
 * Class to handle processing a single file in live mode
 */
export class LiveProcessor extends BaseProcessor {
  public state: {
    status: {
      initial: ProcessorState;
      streaming: ProcessorState;
      transcription: ProcessorState;
    };
    statusTitle: string;
    progress: number;
    elapsedTime: number;
    transcript: string;
    startTime: number;
  };

  constructor(filePath: string, token: string, uri: string, config: Config) {
    super(filePath, token, uri, config);
    this.state = {
      status: {
        initial: ProcessorState.NOT_STARTED,
        streaming: ProcessorState.NOT_STARTED,
        transcription: ProcessorState.NOT_STARTED,
      },
      statusTitle: 'Initializing...',
      progress: 0,
      elapsedTime: 0,
      transcript: '',
      startTime: Date.now()
    };
  }

  /**
   * Get the display output for this file
   */
  getDisplayOutput(): string {
    let result = this.getBaseDisplayOutput();
    result += `${chalk.yellow('Status:')} Setup: ${this.state.status.initial} | Streaming: ${this.state.status.streaming} | Transcription: ${this.state.status.transcription}\n`;
    result += `${chalk.yellow('Status:')} ${this.state.statusTitle}\n`;
    return result;
  }

  /**
   * Parse audio file to get format and data
   */
  private parseAudioFile(
    filePath: string
  ): { buffer: Buffer; startDataChunk: number; bit_depth: number; sample_rate: number; channels: number } {
    const textDecoder = new TextDecoder();
    const buffer = fs.readFileSync(path.resolve(filePath));

    if (
      textDecoder.decode(buffer.subarray(0, 4)) !== 'RIFF' ||
      textDecoder.decode(buffer.subarray(8, 12)) !== 'WAVE' ||
      textDecoder.decode(buffer.subarray(12, 16)) !== 'fmt '
    ) {
      throw new Error('Unsupported file format');
    }

    const fmtSize = buffer.readUInt32LE(16);
    const format = buffer.readUInt16LE(20);

    if (format !== 1 && format !== 6 && format !== 7) {
      throw new Error('Unsupported encoding');
    }

    const channels = buffer.readUInt16LE(22);
    const sample_rate = buffer.readUInt32LE(24);
    const bit_depth = buffer.readUInt16LE(34);

    let nextSubChunk = 16 + 4 + fmtSize;
    while (
      textDecoder.decode(buffer.subarray(nextSubChunk, nextSubChunk + 4)) !== 'data'
    ) {
      nextSubChunk += 8 + buffer.readUInt32LE(nextSubChunk + 4);
    }

    return {
      buffer,
      startDataChunk: nextSubChunk,
      bit_depth,
      sample_rate,
      channels
    };
  }

  /**
   * Process the file
   */
  async process(): Promise<ProcessResult> {
    try {
      // Parse audio file
      const { buffer, startDataChunk, bit_depth, sample_rate, channels } = this.parseAudioFile(this.filePath);
      const audioData = buffer.subarray(
        startDataChunk + 8,
        startDataChunk + 8 + buffer.readUInt32LE(startDataChunk + 4)
      );

      const chunkDuration = 0.1; // 100 ms
      const bytesPerSample = bit_depth / 8;
      const bytesPerSecond = sample_rate * channels * bytesPerSample;
      const chunkSize = chunkDuration * bytesPerSecond;

      // Update status
      this.updateState({ 
        statusTitle: 'Initializing live session...',
        status: {
          ...this.state.status,
          initial: ProcessorState.PROGRESS
        }
      });

      // Initialize live session
      const initiateResponse = await this.initLiveSession();

      // Update status
      this.updateState({ 
        statusTitle: 'Connecting to WebSocket...',
        status: {
          ...this.state.status,
          initial: ProcessorState.DONE
        }
      });

      // Create a promise that will be resolved when the transcription is complete
      let resolveTranscription: (value: any) => void;
      let rejectTranscription: (reason: any) => void;
      const transcriptionPromise = new Promise<any>((resolve, reject) => {
        resolveTranscription = resolve;
        rejectTranscription = reject;
      });

      // Initialize WebSocket
      let socket: WebSocket | null = null;
      let finalTranscription: any = null;

      socket = this.initWebSocket(
        initiateResponse.url,
        // On open
        () => {
          this.updateState({ 
            statusTitle: 'Streaming audio...',
            status: {
              ...this.state.status,
              streaming: ProcessorState.PROGRESS
            }
          });

          // Start sending audio chunks
          let offset = 0;
          const interval = setInterval(() => {
            if (offset >= audioData.length || !socket) {
              clearInterval(interval);
              if (socket) {
                this.updateState({ 
                  statusTitle: 'Waiting for final transcription...',
                  status: {
                    ...this.state.status,
                    streaming: ProcessorState.DONE,
                    transcription: ProcessorState.PROGRESS
                  }
                });
                socket.send(JSON.stringify({ type: 'stop_recording' }));
              }
              return;
            }

            // Calculate progress percentage
            const progressPercent = Math.round((offset / audioData.length) * 100);
            this.updateState({ 
              statusTitle: `Streaming audio: ${progressPercent}% complete`,
              progress: progressPercent
            });

            const chunk = audioData.subarray(offset, (offset += chunkSize));
            socket?.send(chunk);
          }, chunkDuration * 1000);
        },
        // On message
        (message) => {
          if (message.type === 'transcript' && message.data.is_final) {
            // Update with intermediate transcripts
            const { text } = message.data.utterance;
            this.updateState({ statusTitle: `Received transcript: "${text.trim()}"` });
          } else if (message.type === 'post_final_transcript') {
            // Store the full transcript
            let transcript = '';
            if (message.data?.transcription?.full_transcript) {
              transcript = message.data.transcription.full_transcript;
            }

            // Update status with completion
            this.updateState({
              statusTitle: `Transcription completed!`,
              transcript: transcript,
              endTime: Date.now(),
              status: {
                ...this.state.status,
                transcription: ProcessorState.DONE
              }
            });

            finalTranscription = message.data;
            resolveTranscription(message.data);
          }
        },
        // On error
        (error) => {
          this.updateState({ 
            statusTitle: `Error: ${error.message}`,
            status: {
              ...this.state.status,
              transcription: ProcessorState.ERROR
            }
          });
          rejectTranscription(error);
        },
        // On close
        (code, reason) => {
          if (code !== 1000) {
            this.updateState({ 
              statusTitle: `WebSocket closed unexpectedly with code ${code}: ${reason}`,
              status: {
                ...this.state.status,
                streaming: ProcessorState.ERROR
              }
            });
            rejectTranscription(new Error(`WebSocket closed with code ${code}: ${reason}`));
          }
        }
      );

      // Wait for transcription to complete
      const transcriptionResult = await transcriptionPromise;

      return {
        file: this.fileName,
        success: true,
        message: 'Transcription completed successfully',
        data: finalTranscription
      };
    } catch (error) {
      console.error(chalk.red(`Error processing ${this.fileName}: ${error.message}`));
      return {
        file: this.fileName,
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Initialize a live session
   */
  private async initLiveSession(): Promise<{ id: string; url: string }> {
    const response = await fetch(`${this.uri}/v2/live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GLADIA-KEY': this.token,
      },
      body: JSON.stringify({
        ...getAudioFileFormat(this.filePath),
        ...(this.config as StreamingConfig)
      }),
    });

    if (!response.ok) {
      throw new Error(`${response.status}: ${await response.text() || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Initialize WebSocket connection
   */
  private initWebSocket(
    url: string,
    onOpen: () => void,
    onMessage: (message: any) => void,
    onError: (error: Error) => void,
    onClose: (code: number, reason: string) => void
  ): WebSocket {
    const socket = new WebSocket(url);

    socket.addEventListener('open', function () {
      onOpen();
    });

    socket.addEventListener('error', function (error) {
      onError(error as Error);
    });

    socket.addEventListener('close', function ({ code, reason }) {
      onClose(code, reason.toString());
    });

    socket.addEventListener('message', function (event) {
      try {
        const message = JSON.parse(event.data.toString());
        onMessage(message);
      } catch (error) {
        onError(error as Error);
      }
    });

    return socket;
  }
}
