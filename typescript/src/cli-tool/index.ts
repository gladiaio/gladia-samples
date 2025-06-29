#!/usr/bin/env node

import {Command, OptionValues} from 'commander';
import {getConfigInput} from "./get-config-input";
import {LiveProcessor} from "./live-mode";
import {PreRecordedProcessor} from "./pre-recorded-mode";
import {clearInterval} from "node:timers";
import {Process, ProcessResult} from "./types";
import logUpdate from "log-update";
import chalk from 'chalk';
import path from "path";
import fs from "fs";



// Define the CLI program
const program = new Command();

program
  .name('gladia-cli')
  .description('CLI tool for Gladia API')
  .version('1.0.0')
  .requiredOption('--token <token>', 'API token')
  .option('--concurrent_run', 'Run concurrently', false)
  .option('--uri <uri>', 'API URI', 'https://api.gladia.io')
  .option('--config <path>', 'Path to a JSON config file')
  .option('--output <dir>', 'Directory to save the resulting JSON files');

program.parse(process.argv);

const options: OptionValues  = program.opts();

// Main function
async function main() {
  // Create a processor manager

  const {files, command, config} = await getConfigInput(options);

  const processes: Process[] = files.map(file => {
    if (command === 'live') {
      return new LiveProcessor(
        file,
        options.token,
        options.uri,
        config,
      );
    } else if (command === 'pre-recorded') {
      return new PreRecordedProcessor(
        file,
        options.token,
        options.uri,
        config,
      );
    }
  })

  const updateDisplayInterval = setInterval(() => {
      updateDisplay(processes);
    }, 500);

  let results: (ProcessResult | undefined)[] = []
  if (options.concurrent_run) {
    results = await Promise.all(processes.map(async (processor) => {
      const result = await processor?.process();
      if (result && result.data) {
        const metadataPath = path.resolve('./conf/output-metadata.json');
        if (fs.existsSync(metadataPath)) {
          result.data["output_metadata"] = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }
      }
      return result;
    }));
  } else {
    for (const processor of processes) {
      const result = await processor?.process();
      if (result && result.data) {
        const metadataPath = path.resolve('./conf/output-metadata.json');
        if (fs.existsSync(metadataPath)) {
          result.data["output_metadata"] = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }
      }
      return result;
    }
  }

  clearInterval(updateDisplayInterval);


  printSummary(results, command, options.output);
  process.exit(0);
}



function updateDisplay(processes: Process[]) {
  let output = '';
  for (const processor of processes) {
    if (!processor) {continue;}
    output += processor.getDisplayOutput();
  }
  logUpdate(output);
}

function printSummary(results: (ProcessResult | undefined)[], command: string, outputDir?: string) {
  console.log('\n' + chalk.bold.cyan('=== Transcription Summary ===') + '\n');
    // Save results to file if output directory is specified
  if (outputDir && results) {
    const outputPath = path.join(outputDir, `${(new Date()).toISOString()}_${command}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(chalk.cyan(`Output file: ${outputPath}`));
  }

  for (const result of results) {
    if (!result) continue;

    console.log(chalk.green.bold(`File: ${result.file}`));

    // Extract metadata if available
    if (result.success && result.data) {
      let metadata;
      if (result.data.result?.metadata) {
        metadata = result.data.result.metadata;
      } else if (result.data.metadata) {
        metadata = result.data.metadata;
      }

      if (metadata) {
        const duration = metadata.audio_duration ? `${metadata.audio_duration.toFixed(2)}s` : 'N/A';
        const channels = metadata.number_of_distinct_channels || 'N/A';
        const transcriptionTime = metadata.transcription_time ? `${metadata.transcription_time.toFixed(2)}s` : 'N/A';

        console.log(chalk.cyan(`Duration: ${chalk.white(duration)} | Channels: ${chalk.white(channels)} | Transcription time: ${chalk.white(transcriptionTime)}`));
      }
    }

    console.log(chalk.cyan('----------------------------'));

    if (result.success && result.data) {
      // Extract the full transcript from the data
      let transcript = '';

      if (result.data.transcription?.full_transcript) {
        // For pre-recorded mode
        transcript = result.data.transcription.full_transcript;
      } else if (result.data.result?.transcription?.full_transcript) {
        // For pre-recorded mode (alternative structure)
        transcript = result.data.result.transcription.full_transcript;
      }

      if (transcript) {
        console.log(chalk.cyan.bold('Transcription:'));
        console.log(transcript);
      } else {
        console.log(chalk.yellow('No transcription available'));
      }
    } else {
      console.log(chalk.red(`Error: ${result.message}`));
    }

    console.log('\n');
  }
}
main();
