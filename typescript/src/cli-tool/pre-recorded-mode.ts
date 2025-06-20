import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import FormData from 'form-data';
import { Config, ProcessResult } from './types';
import { BaseProcessor, ProcessorState } from './base-processor';

/**
 * Class to handle processing a single file in pre-recorded mode
 */
export class PreRecordedProcessor extends BaseProcessor {
  public state: {
    status: {
        initial: ProcessorState;
        uploading: ProcessorState;
        transcription: ProcessorState;
        polling: ProcessorState;
    };
    statusTitle: string;
    progress: number;
    elapsedTime: number;
    transcript: string;
    startTime?: number;
    attempts?: number;
    maxAttempts?: number;
  };

  constructor(filePath: string, token: string, uri: string, config: Config) {
    super(filePath, token, uri, config);
    this.state = {
      status: {
        initial: ProcessorState.NOT_STARTED,
        uploading: ProcessorState.NOT_STARTED,
        transcription: ProcessorState.NOT_STARTED,
        polling: ProcessorState.NOT_STARTED,
      },
      statusTitle: 'Setup',
      progress: 0,
      elapsedTime: 0,
      transcript: '',
    };
  }

  /**
   * Get the display output for this file
   */
  getDisplayOutput(): string {
    let result = this.getBaseDisplayOutput();
    result += `${chalk.yellow('Status:')} Setup: ${this.state.status.initial} | Uploading: ${this.state.status.uploading} | POST: ${this.state.status.transcription} | Polling: ${this.state.status.polling}${this.state.attempts ? ` ${this.state.attempts} Attempts` : ''}\n`;
    result += `${chalk.yellow('Status:')} ${this.state.statusTitle}\n`;
    return result;
  }

  /**
   * Process the file
   */
  async process(): Promise<ProcessResult> {
    try {
      // Update status
      this.state.statusTitle= 'Preparing to upload file...';
      this.state.startTime= Date.now();
      this.state.status.initial= ProcessorState.PROGRESS;


      const form = new FormData();
      const stream = fs.createReadStream(this.filePath);

      // Explicitly set filename and mimeType
      const mimeType = getMimeType(this.filePath);
      form.append('audio', stream, {
        filename: this.fileName,
        contentType: mimeType,
      });

      const headers: Record<string, string> = {
        'x-gladia-key': this.token,
      };

      // Upload file
      this.state.statusTitle= 'Uploading file to Gladia...';
      this.state.status.initial= ProcessorState.DONE;
      this.state.status.uploading= ProcessorState.PROGRESS;

      const uploadResponse = (
        await axios.post(`${this.uri}/v2/upload/`, form, {
          headers: { ...form.getHeaders(), ...headers },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round((progressEvent.loaded / progressEvent.total) * 100);
              this.updateState({ statusTitle: `Uploading file: ${percentCompleted}% complete` });
            }
          },
        })
      ).data;

      this.state.statusTitle= 'Upload complete! Sending transcription request...';
      this.state.status.uploading= ProcessorState.DONE;
      this.state.status.transcription= ProcessorState.PROGRESS;

      // Prepare transcription request
      headers['Content-Type'] = 'application/json';

      const requestData = {
        ...this.config,
        audio_url: uploadResponse.audio_url,
      };


      // Send transcription request
      const transcriptionResponse = (
        await axios.post(`${this.uri}/v2/transcription/`, requestData, {
          headers,
        })
      ).data;

      this.state.statusTitle= 'Transcription request sent successfully! Waiting for results...';
      this.state.status.transcription= ProcessorState.DONE;
      this.state.status.polling= ProcessorState.PROGRESS;

      // Poll for results
      let result = null;
      if (transcriptionResponse.result_url) {
        result = await this.pollForResult(transcriptionResponse.result_url, headers);
      }

      return {
        file: this.fileName,
        success: true,
        message: 'Transcription completed successfully',
        data: result
      };
    } catch (error) {
      console.error(chalk.red(`Error processing ${this.fileName}: ${error.message}`), JSON.stringify(error, null, 2));
      this.state.statusTitle= 'Failed to save result: ${error.message}';
      this.state.status.initial= ProcessorState.ERROR;
      this.state.status.uploading= ProcessorState.ERROR;
      this.state.status.transcription= ProcessorState.ERROR;
      this.state.status.polling= ProcessorState.ERROR;
      return {
        file: this.fileName,
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }

  /**
   * Poll for transcription result
   */
  private async pollForResult(resultUrl: string, headers: Record<string, string>): Promise<any> {
    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite polling

    // Update state with polling info
    this.updateState({ 
      attempts: attempts,
      maxAttempts: maxAttempts
    });

    try {
      while (attempts < maxAttempts) {
        attempts++;

        // Update polling attempts
        this.updateState({ 
          attempts: attempts,
          statusTitle: 'Polling for results...'
        });

        const pollResponse = (await axios.get(resultUrl, { headers })).data;

        if (pollResponse.status === 'done') {

          // Store the full transcript
          let transcript = '';
          if (pollResponse.result?.transcription?.full_transcript) {
            transcript = pollResponse.result.transcription.full_transcript;
          }

          this.updateState({ 
            statusTitle: `Transcription completed!`,
            transcript: transcript,
            endTime: Date.now(),
            status: {
              ...this.state.status,
              polling: ProcessorState.DONE
            }
          });

          return pollResponse;
        } else if (pollResponse.status === 'error') {
          this.updateState({ 
            statusTitle: `Transcription failed: ${pollResponse.error || 'Unknown error'}`,
            status: {
              ...this.state.status,
              polling: ProcessorState.ERROR
            }
          });
          throw new Error(`Transcription failed: ${pollResponse.error || 'Unknown error'}`);
        } else {
          // Update status based on polling status
          if (pollResponse.status === 'processing') {
            this.updateState({ statusTitle: 'Processing transcription...' });
          } else if (pollResponse.status === 'queued') {
            this.updateState({ statusTitle: 'Transcription queued...' });
          }

          // Wait before polling again
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      this.updateState({ 
        statusTitle: `Polling timeout: Maximum number of attempts (${maxAttempts}) reached`,
        status: {
          ...this.state.status,
          polling: ProcessorState.ERROR
        }
      });
      throw new Error('Polling timeout: Maximum number of attempts reached');
    } catch (error) {
      this.updateState({ 
        statusTitle: `Error during polling: ${error.message}`,
        status: {
          ...this.state.status,
          polling: ProcessorState.ERROR
        }
      });
      throw error;
    }
  }
}

/**
 * Get MIME type based on file extension
 * @param filePath Path to the file
 * @returns MIME type
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.wav':
      return 'audio/wav';
    case '.mp3':
      return 'audio/mpeg';
    case '.ogg':
      return 'audio/ogg';
    case '.flac':
      return 'audio/flac';
    default:
      return 'application/octet-stream';
  }
}
