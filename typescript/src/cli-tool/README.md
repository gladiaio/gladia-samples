# Gladia CLI Tool

A command-line interface tool for processing audio files with the Gladia API.

## Installation

Make sure you have Node.js and npm installed, then install the dependencies:

```bash
cd typescript
npm install
```

## Usage

Run the CLI tool with:

```bash
npm run cli -- --token <your-api-token> [--uri <api-uri>] [options]
```

### Required Options

- `--token <token>`: Your Gladia API token (required)

### Optional Options

- `--uri <uri>`: Gladia API URI (defaults to https://api.gladia.io)
- `--config <path>`: Path to a JSON config file (if not provided, you'll be prompted to provide one interactively)
- `--output <dir>`: Directory to save the resulting JSON files

### Examples

```bash
# Using only the required token (URI defaults to https://api.gladia.io)
# You'll be prompted to select a mode, configuration, and files interactively
npm run cli -- --token your-api-token --output ./results

# Specifying a custom URI
npm run cli -- --token your-api-token --uri https://custom-api.example.com --output ./results

# Providing a custom configuration file directly (skips the configuration prompt)
npm run cli -- --token your-api-token --config ./my-custom-config.json --output ./results
```

## Interactive Commands

The CLI tool provides an interactive interface to:

1. Select a processing mode:
   - `live`: Process files in live streaming mode
   - `pre-recorded`: Process files in pre-recorded mode

2. Choose a configuration:
   - Use the default mode-specific configuration
   - Provide a path to a custom configuration file

3. Select audio files to process:
   - The tool will scan the `../data` directory for audio files
   - You can select multiple files to process
   - If no files are found, you can provide a custom path

## Configuration

The CLI tool uses mode-specific configuration files based on the selected processing mode:

- `conf/live-config.json`: Default configuration for live streaming mode
- `conf/pre-recorded-config.json`: Default configuration for pre-recorded mode

These configuration files contain the default settings for each mode according to the Gladia API specifications.

After selecting a processing mode, the tool will prompt you to specify whether you want to use a custom configuration file. You have two options:

1. Use the default mode-specific configuration
2. Provide a path to your custom configuration file

You can also provide a custom configuration file directly using the `--config` option when running the tool.

When a custom configuration is provided (either interactively or via the `--config` option), it will be merged with the mode-specific configuration, with your custom settings taking precedence.

### Configuration Hierarchy

1. Mode-specific default configuration (live-config.json or pre-recorded-config.json)
2. User-provided custom configuration (via --config option or interactive prompt)

The final configuration used for processing will be a combination of these, with user-provided settings overriding the defaults.

### Example Custom Configuration

The default `conf/config.json` contains minimal settings:

```json
{
  "language_config": {
    "languages": ["en"],
    "code_switching": false
  },
  "custom_metadata": {
    "user": "Custom User",
    "application": "Gladia CLI Tool"
  }
}
```

You can create your own custom configuration to override specific settings:

```json
{
  "language_config": {
    "languages": ["en", "fr"],
    "code_switching": true
  },
  "custom_metadata": {
    "user": "John Smith",
    "project": "Interview Transcription"
  },
  "diarization": true,
  "diarization_config": {
    "number_of_speakers": 2
  }
}
```

With this custom configuration, only the specified settings will override the defaults, while all other settings will be preserved from the mode-specific configuration.

## Output

For each processed file, the tool will:

1. Display progress with a progress bar
2. Show success/failure status and messages
3. Save the full JSON response to the specified output directory (if provided)

## Features

- Interactive command selection
- Multi-file selection and processing
- Progress tracking with progress bars
- Colored console output for better readability
- Error handling and user feedback
- JSON output saving
