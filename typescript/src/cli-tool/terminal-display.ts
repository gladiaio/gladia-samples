import ansiEscapes from 'ansi-escapes';
import { stdout } from 'process';

/**
 * A helper class for terminal display management using ansi-escapes
 * Replaces log-update functionality with more direct control
 */
export class TerminalDisplay {
  private initialCursorPosition: { x: number, y: number } | null = null;
  private lastOutputHeight: number = 0;
  private isActive: boolean = false;

  /**
   * Initialize the terminal display
   * Saves the current cursor position for future reference
   */
  constructor() {
    this.initialize();
  }

  /**
   * Initialize or reinitialize the terminal display
   * Saves the current cursor position
   */
  initialize(): void {
    // Write the cursor position request sequence
    stdout.write(ansiEscapes.cursorSavePosition);
    this.isActive = true;
  }

  /**
   * Update the terminal display with new content
   * Erases previous content and writes new content
   * @param content The content to display
   */
  update(content: string): void {
    if (!this.isActive) {
      this.initialize();
    }

    // Restore cursor to saved position
    stdout.write(ansiEscapes.cursorRestorePosition);
    
    // Erase from cursor to end of screen
    stdout.write(ansiEscapes.eraseDown);
    stdout.write(ansiEscapes.cursorRestorePosition);

    stdout.write(ansiEscapes.eraseDown);
    stdout.write(ansiEscapes.cursorRestorePosition);

    stdout.write(ansiEscapes.eraseDown);

    // Write the new content
    stdout.write(content);
    
    // Calculate the number of lines in the output
    this.lastOutputHeight = (content.match(/\n/g) || []).length + 1;
  }

  /**
   * Clean up the terminal display
   * Should be called when done with the display
   */
  done(): void {
    if (!this.isActive) {
      return;
    }

    // Restore cursor to saved position
    stdout.write(ansiEscapes.cursorRestorePosition);
    
    // Erase from cursor to end of screen
    stdout.write(ansiEscapes.eraseDown);
    
    // Move cursor to the end of where the content was
    stdout.write(ansiEscapes.cursorDown(this.lastOutputHeight));
    
    this.isActive = false;
  }

  /**
   * Clear the terminal display
   */
  clear(): void {
    if (!this.isActive) {
      return;
    }

    // Restore cursor to saved position
    stdout.write(ansiEscapes.cursorRestorePosition);
    
    // Erase from cursor to end of screen
    stdout.write(ansiEscapes.eraseDown);
  }
}