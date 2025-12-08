# Go Speech Transcriber

A desktop application that transcribes speech to text in real-time and types it into your active window. Perfect for dictating emails, messages, or documents hands-free.

## Features

- **Real-time speech-to-text** using Gladia's API
- **Multi-language support** with language selection in system tray
- **System tray controls** for easy access
- **Keyboard shortcuts** to start/stop recording
- **Automatic typing** of transcribed text into the active application

## Installation

### Prerequisites

- Go 1.18 or higher
- Audio input device
- Gladia API key

### Install from source

```bash
# Clone the repository
git clone https://github.com/gladiaio/go-speech-transcriber
cd go-speech-transcriber

# Install dependencies
go mod download

# Build the application
go build -o speech-transcriber
```

### Compilation Guide

#### Build for Different Platforms

**Windows:**
```bash
GOOS=windows GOARCH=amd64 go build -o speech-transcriber.exe
```

**macOS:**
```bash
GOOS=darwin GOARCH=amd64 go build -o speech-transcriber-amd64
GOOS=darwin GOARCH=arm64 go build -o speech-transcriber-arm64

# Create a universal binary (for both Intel and M1/M2 Macs)
lipo -create -output speech-transcriber speech-transcriber-amd64 speech-transcriber-arm64
```

**Linux:**
```bash
GOOS=linux GOARCH=amd64 go build -o speech-transcriber
```

#### Release Builds

For optimized release builds with smaller binary size:

```bash
go build -ldflags="-s -w" -o speech-transcriber
```

## Configuration

You can provide your Gladia API key in a `.env` file:

```
GLADIA_API_KEY=your_gladia_api_key
```

Or pass it as a command-line argument (see Usage section).

## Key Components

- **SpeechTranscriber**: Handles transcription and keyboard input
- **GladiaRecorder**: Manages audio recording and communication with Gladia API
- **StatusBarApp**: Implements system tray functionality
- **KeyListener**: Handles keyboard shortcuts

## Usage

### Basic usage

```bash
./speech-transcriber
```

### Command line options

```bash
# Use custom key combination (default: cmd_l+alt)
./speech-transcriber -key=ctrl+shift+r

# Use double right Command key press to toggle recording
./speech-transcriber -double_cmd

# Set maximum recording time (default: 30 seconds)
./speech-transcriber -max_time=60

# Specify supported languages
./speech-transcriber -language=en -language=fr

# Provide Gladia API key via command line
./speech-transcriber -gladia_api_key=your_api_key
```

## API Keys

- **Gladia API**: Required for speech transcription. Get your key at [https://gladia.io](https://gladia.io)

## Keyboard Controls

- Press the configured key combination (default: Left Command+Option on macOS) to start/stop recording
- If using double_cmd option, press Right Command key twice quickly to toggle recording
- Alternatively, use the system tray menu to control recording

## How It Works

1. Start recording using the keyboard shortcut or system tray
2. Speak clearly into your microphone
3. Stop recording using the same shortcut or system tray
4. The transcribed text will automatically be typed into your active window

## Dependencies

The application uses these key libraries:
- github.com/getlantern/systray - System tray functionality
- github.com/gordonklaus/portaudio - Audio capture
- github.com/gorilla/websocket - WebSocket communication with Gladia API
- github.com/micmonay/keybd_event - Keyboard simulation
- github.com/robotn/gohook - Global keyboard hooks

## Troubleshooting

### MacOS Build Warnings

When building on macOS, you might see warnings about duplicate libraries. These can be safely ignored.

### Windows Build Issues

On Windows, you might need to install MinGW-w64 for GCC and ensure it's in your PATH.

### Linux Build Dependencies

On Linux, install these dependencies first:

```bash
# Ubuntu/Debian
sudo apt-get install libx11-dev xorg-dev libxtst-dev libpng++-dev libasound2-dev

# Fedora/CentOS
sudo dnf install libX11-devel xorg-x11-devel libXtst-devel libpng-devel alsa-lib-devel
```

### Keyboard Shortcut Issues

If the default keyboard shortcut doesn't work:
1. Try using the `-key` flag to set a different key combination
2. Use the `-double_cmd` flag to use double Right Command key press instead
3. Check the system tray menu to manually start/stop recording 
