import { Command } from './types';
import { createInterface } from 'readline';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask a question and get user input
function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Prompt the user to select a command (live or pre-recorded)
 */
export async function promptForCommand(): Promise<Command> {
  console.log(chalk.blue('Please select a command:'));
  console.log('1. live');
  console.log('2. pre-recorded');

  let selection = '';
  while (selection !== '1' && selection !== '2') {
    selection = await question(chalk.yellow('Enter your choice (1 or 2): '));
    if (selection !== '1' && selection !== '2') {
      console.log(chalk.red('Invalid selection. Please enter 1 or 2.'));
    }
  }

  return selection === '1' ? 'live' : 'pre-recorded';
}

/**
 * Prompt the user to select files based on the command
 */
export async function promptForFiles(command: Command): Promise<string[]> {
  // Get available files based on command
  const dataDir = path.resolve('../data');
  let availableFiles: string[] = [];

  try {
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      availableFiles = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.wav', '.mp3', '.ogg', '.flac'].includes(ext);
        })
        .map(file => path.join(dataDir, file));
    }
  } catch (error) {
    console.error(chalk.red(`Error reading data directory: ${error.message}`));
  }

  if (availableFiles.length === 0) {
    console.log(chalk.yellow('No audio files found in the data directory.'));
    const customPath = await question(chalk.yellow('Enter path to audio files (or leave empty to exit): '));

    if (!customPath) {
      return [];
    }

    try {
      if (fs.existsSync(customPath)) {
        const stats = fs.statSync(customPath);
        if (stats.isDirectory()) {
          const files = fs.readdirSync(customPath);
          availableFiles = files
            .filter(file => {
              const ext = path.extname(file).toLowerCase();
              return ['.wav', '.mp3', '.ogg', '.flac'].includes(ext);
            })
            .map(file => path.join(customPath, file));
        } else if (stats.isFile()) {
          const ext = path.extname(customPath).toLowerCase();
          if (['.wav', '.mp3', '.ogg', '.flac'].includes(ext)) {
            availableFiles = [customPath];
          }
        }
      }
    } catch (error) {
      console.error(chalk.red(`Error reading custom path: ${error.message}`));
    }

    if (availableFiles.length === 0) {
      console.log(chalk.red('No audio files found.'));
      return [];
    }
  }

  // Display available files
  console.log(chalk.blue(`\nAvailable audio files for ${command} mode:`));
  availableFiles.forEach((file, index) => {
    console.log(`${index + 1}. ${path.basename(file)}`);
  });

  // Prompt for file selection
  console.log(chalk.yellow('\nEnter the numbers of the files you want to process (comma-separated, e.g., 1,3,5):'));
  const selection = await question('> ');

  // Parse selection
  const selectedIndices = selection
    .split(',')
    .map(s => s.trim())
    .filter(s => /^\d+$/.test(s))
    .map(s => parseInt(s, 10) - 1)
    .filter(i => i >= 0 && i < availableFiles.length);

  if (selectedIndices.length === 0) {
    console.log(chalk.yellow('No valid files selected.'));
    return [];
  }

  const selectedFiles = selectedIndices.map(i => availableFiles[i]);
  console.log(chalk.green(`Selected ${selectedFiles.length} files:`));
  selectedFiles.forEach(file => {
    console.log(`- ${path.basename(file)}`);
  });

  return selectedFiles;
}

/**
 * Prompt the user for a config file path
 * @param command The selected command (live or pre-recorded)
 * @returns The path to the config file, or null if no custom config is desired
 */
export async function promptForConfig(command: Command): Promise<string | null> {
  console.log(chalk.blue(`\nDo you want to use a custom configuration file for ${command} mode?`));
  console.log('1. Yes');
  console.log('2. No (use default configuration)');
  const defaultConfig = `./conf/${command}-config.json`;

  let selection = '';
  while (selection !== '1' && selection !== '2') {
    selection = await question(chalk.yellow('Enter your choice (1 or 2): '));
    if (selection !== '1' && selection !== '2') {
      console.log(chalk.red('Invalid selection. Please enter 1 or 2.'));
    }
  }

  if (selection === '2') {
    console.log(chalk.green(`Using default configuration for ${command} mode.`));
    return defaultConfig;
  }

  const configPath = await question(chalk.yellow('Enter the path to your config file: '));
  if (!configPath.trim()) {
    console.log(chalk.yellow('No config file provided, using default configuration.'));
    return defaultConfig;
  }

  // Check if the file exists
  try {
    const resolvedPath = path.resolve(configPath);

    if (!fs.existsSync(resolvedPath)) {
      console.log(chalk.yellow(`Config file ${resolvedPath} not found, using default configuration.`));
      return defaultConfig;
    }

    return configPath;
  } catch (error) {
    console.error(chalk.red(`Error checking config file: ${error.message}`));
    return defaultConfig;
  }
}

// Close readline interface when the process exits
process.on('exit', () => {
  rl.close();
});
