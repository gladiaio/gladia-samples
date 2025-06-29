import path from "path";
import fs from "fs";
import chalk from "chalk";
import {promptForCommand, promptForConfig, promptForFiles} from "./interactive";
import {Config} from "./types";
import {OptionValues} from "commander";

export async function getConfigInput(options: OptionValues) {
    // Create output directory if specified and doesn't exist
    if (options.output) {
      const outputDir = path.resolve(options.output);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(chalk.green(`Created output directory: ${outputDir}`));
      }
    }

    // Prompt user to select a command
    const command = await promptForCommand();

    // Prompt user for a config file
    let config: Config = {};

    try {
    // Resolve the config path
    const resolvedConfigPath = path.resolve(options.config || await promptForConfig(command));

    if (fs.existsSync(resolvedConfigPath)) {
      const userConfigContent = fs.readFileSync(resolvedConfigPath, 'utf8');
      config = JSON.parse(userConfigContent);
      console.log(chalk.green(`Loaded ${command} mode config from ${resolvedConfigPath}`));
    } else {
      console.log(chalk.yellow(`Config file not found at ${resolvedConfigPath}`));
      throw new Error('Config file not found');
    }
    } catch (error) {
    console.error(chalk.red(`Error loading config file: ${error.message}`));
    }

    // Prompt user to select files
    const files = await promptForFiles(command);

    if (files.length === 0) {
      console.log(chalk.yellow('No files selected. Exiting.'));
      process.exit(0);
    }

    console.log(chalk.blue(`Processing ${files.length} files in ${command} mode...`));
    return {files, command, config};
}
