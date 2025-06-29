import {LiveProcessor} from "./live-mode";
import {PreRecordedProcessor} from "./pre-recorded-mode";
import {terminalDisplay} from "./terminal-display";
import {Config, ProcessResult} from "./types";

/**
 * Class to manage processors and handle display updates
 */
export class ProcessorManager {
  private processors: Map<string, LiveProcessor | PreRecordedProcessor> = new Map();
  private outputCache: Map<string, string> = new Map(); // Cache for the latest output of each file
  private completedFiles: Set<string> = new Set(); // Set to track completed files
  private displayInterval: NodeJS.Timeout | null = null;

  /**
   * Add a processor to the manager
   */
  addProcessor(filePath: string, processor: LiveProcessor | PreRecordedProcessor): void {
    this.processors.set(filePath, processor);

    // Start the display update loop if it's not already running
    if (!this.displayInterval) {
      this.startDisplayLoop();
    }
  }

  /**
   * Mark a processor as completed and store its final output
   */
  removeProcessor(filePath: string): void {
    // Get the final output before removing the processor
    const processor = this.processors.get(filePath);
    if (processor) {
      this.outputCache.set(filePath, processor.getDisplayOutput());
      this.completedFiles.add(filePath);
    }

    this.processors.delete(filePath);

    // Stop the display loop if there are no more processors
    if (this.processors.size === 0 && this.displayInterval) {
      this.stopDisplayLoop();
    }
  }

  /**
   * Start the display update loop
   */
  private startDisplayLoop(): void {
    this.displayInterval = setInterval(() => {
      this.updateDisplay();
    }, 500); // Update every 500ms to reduce flickering
  }

  /**
   * Stop the display update loop
   */
  private stopDisplayLoop(): void {
    if (this.displayInterval) {
      clearInterval(this.displayInterval);
      this.displayInterval = null;
    }
  }

  /**
   * Update the display for all processors
   */
  updateDisplay(): void {
    // If there are no active processors and no completed files, return
    if (this.processors.size === 0 && this.completedFiles.size === 0) {
      return;
    }

    // Update the output cache with the latest output from active processors
    for (const [filePath, processor] of this.processors.entries()) {
      this.outputCache.set(filePath, processor.getDisplayOutput());
    }

    // Combine all outputs from the cache
    const output = Array.from(this.outputCache.values()).join('\n');

    // Update the display with the new output
    terminalDisplay.update(output);
  }

  /**
   * Process files in live mode
   */
  async processLiveMode(
    files: string[],
    token: string,
    uri: string,
    config: Config,
    outputDir?: string
  ): Promise<ProcessResult[]> {
    // Process files in parallel
    const processingPromises = files.map(file =>
      processLiveMode(file, token, uri, config, outputDir, this)
    );

    // Wait for all files to be processed
    return await Promise.all(processingPromises);
  }

  /**
   * Process files in pre-recorded mode
   */
  async processPreRecordedMode(
    files: string[],
    token: string,
    uri: string,
    config: Config,
    outputDir?: string
  ): Promise<ProcessResult[]> {
    // Process files in parallel
    const processingPromises = files.map(file =>
      processPreRecordedMode(file, token, uri, config, outputDir, this)
    );

    // Wait for all files to be processed
    return await Promise.all(processingPromises);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.stopDisplayLoop();

    // Make sure we display the final state
    if (this.outputCache.size > 0) {
      const finalOutput = Array.from(this.outputCache.values()).join('\n');
      // Update the display with the final output
      terminalDisplay.update(finalOutput);
    }

    // Ensure the terminal is restored to its original state
    terminalDisplay.done();
  }
}