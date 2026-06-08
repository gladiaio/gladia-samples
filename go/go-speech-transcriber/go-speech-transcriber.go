package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/getlantern/systray"
	"github.com/gordonklaus/portaudio"
	"github.com/gorilla/websocket"
	"github.com/micmonay/keybd_event"
	hook "github.com/robotn/gohook"
)

const (
	GLADIA_API_URL = "https://api.gladia.io"
)

// Config represents the application configuration
type Config struct {
	KeyCombination string
	DoubleCmd      bool
	Languages      []string
	MaxTime        float64
	GladiaAPIKey   string
}

// AudioTranscriptionService handles communication with the Gladia API
type AudioTranscriptionService struct {
	APIKey string
}

// Initialize a session with the Gladia API
func (s *AudioTranscriptionService) InitializeSession(language string) (map[string]interface{}, error) {

	config := map[string]interface{}{
		"encoding":    "wav/pcm",
		"sample_rate": 16000,
		"bit_depth":   16,
		"channels":    1,
		"language_config": map[string]interface{}{
			"languages":      []string{},
			"code_switching": true,
		},
	}

	if language != "" {
		config["language_config"].(map[string]interface{})["languages"] = []string{language}
	}

	jsonData, err := json.Marshal(config)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", GLADIA_API_URL+"/v2/live", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-gladia-key", s.APIKey)

	log.Printf("Sending request to Gladia API: %s", GLADIA_API_URL+"/v2/live")

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Accept both 200 OK and 201 Created as successful responses
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("error initializing Gladia API: %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	log.Printf("Successfully initialized Gladia API session with status code: %d", resp.StatusCode)
	return result, nil
}

// SpeechTranscriber handles the main transcription logic
type SpeechTranscriber struct {
	Keyboard *keybd_event.KeyBonding
}

// GladiaRecorder handles audio recording and communication with Gladia API
type GladiaRecorder struct {
	Transcriber    *SpeechTranscriber
	Recording      bool
	APIKey         string
	CurrentText    string
	WebSocket      *websocket.Conn
	TranscriptChan chan string
	Done           chan bool
	Mutex          sync.Mutex
}

func NewGladiaRecorder(transcriber *SpeechTranscriber, apiKey string) *GladiaRecorder {
	if apiKey == "" {
		apiKey = os.Getenv("GLADIA_API_KEY")
	}

	return &GladiaRecorder{
		Transcriber:    transcriber,
		Recording:      false,
		APIKey:         apiKey,
		CurrentText:    "",
		TranscriptChan: make(chan string),
		Done:           make(chan bool),
	}
}

func (r *GladiaRecorder) Start(language string) error {
	r.Mutex.Lock()
	if r.Recording {
		r.Mutex.Unlock()
		return fmt.Errorf("recording already in progress")
	}
	r.Recording = true
	r.Mutex.Unlock()

	// Initialize audio session and start recording in a goroutine
	go r.startRecording(language)
	return nil
}

func (r *GladiaRecorder) Stop() {
	r.Mutex.Lock()
	if !r.Recording {
		r.Mutex.Unlock()
		return
	}
	r.Recording = false
	r.Mutex.Unlock()

	// Signal recording to stop
	r.Done <- true

	// Add a small delay to ensure the typeText method has time to start
	time.Sleep(100 * time.Millisecond)
}

func (r *GladiaRecorder) startRecording(language string) {
	log.Printf("Starting recording with Gladia API for language: %s", language)

	audioService := AudioTranscriptionService{APIKey: r.APIKey}
	sessionInfo, err := audioService.InitializeSession(language)
	if err != nil {
		log.Printf("Error initializing Gladia session: %v", err)
		return
	}

	wsURL, ok := sessionInfo["url"].(string)
	if !ok {
		log.Printf("Missing WebSocket URL in session info. Response: %v", sessionInfo)
		return
	}

	log.Printf("Got WebSocket URL: %s", wsURL)

	// Connect to WebSocket
	log.Printf("Connecting to Gladia WebSocket...")
	conn, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		log.Printf("WebSocket connection error: %v", err)
		if resp != nil {
			log.Printf("WebSocket response status: %s", resp.Status)
		}
		return
	}
	log.Printf("Successfully connected to Gladia WebSocket")

	r.WebSocket = conn
	defer conn.Close()

	// Start audio processing and transcription handling
	var wg sync.WaitGroup
	wg.Add(2)

	// Process incoming transcriptions
	go func() {
		defer wg.Done()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if r.Recording {
					log.Printf("WebSocket read error: %v", err)
				}
				return
			}

			var content map[string]interface{}
			if err := json.Unmarshal(message, &content); err != nil {
				log.Printf("Error parsing message: %v", err)
				continue
			}

			// Handle transcript messages
			if contentType, ok := content["type"].(string); ok && contentType == "transcript" {
				data, ok := content["data"].(map[string]interface{})
				if !ok {
					continue
				}

				isFinal, ok := data["is_final"].(bool)
				if !ok || !isFinal {
					continue
				}

				utterance, ok := data["utterance"].(map[string]interface{})
				if !ok {
					continue
				}

				text, ok := utterance["text"].(string)
				if !ok {
					continue
				}

				text = strings.TrimSpace(text)

				r.Mutex.Lock()
				if r.CurrentText != "" {
					r.CurrentText += " " + text
				} else {
					r.CurrentText = text
				}
				log.Printf("Current transcription: %s", r.CurrentText)
				r.Mutex.Unlock()
			}
		}
	}()

	// Send audio data
	go func() {
		defer wg.Done()

		// Initialize PortAudio
		if err := portaudio.Initialize(); err != nil {
			log.Printf("Error initializing audio: %v", err)
			return
		}
		defer portaudio.Terminate()

		// Set up audio parameters
		framesPerBuffer := 3200
		sampleRate := 16000
		channels := 1

		// Buffer for audio data
		buffer := make([]int16, framesPerBuffer)

		// Create audio input stream - Pass the buffer here instead of nil
		stream, err := portaudio.OpenDefaultStream(channels, 0, float64(sampleRate), framesPerBuffer, buffer)
		if err != nil {
			log.Printf("Error opening audio stream: %v", err)
			return
		}
		defer stream.Close()

		if err := stream.Start(); err != nil {
			log.Printf("Error starting audio stream: %v", err)
			return
		}
		defer stream.Stop()

		// Send audio data until recording is stopped
		for r.Recording {
			if err := stream.Read(); err != nil {
				log.Printf("Error reading from audio stream: %v", err)
				return
			}

			// Convert buffer to bytes - FIX THE BYTE CONVERSION
			audioBytes := make([]byte, len(buffer)*2)
			for i, sample := range buffer {
				// Use little-endian byte order (LSB first)
				audioBytes[i*2] = byte(sample & 0xFF)          // Low byte
				audioBytes[i*2+1] = byte((sample >> 8) & 0xFF) // High byte
			}

			encodedData := base64.StdEncoding.EncodeToString(audioBytes)

			// Create message with audio chunk
			message := map[string]interface{}{
				"type": "audio_chunk",
				"data": map[string]interface{}{
					"chunk": encodedData,
				},
			}

			messageJSON, err := json.Marshal(message)
			if err != nil {
				log.Printf("Error encoding audio message: %v", err)
				continue
			}

			if err := conn.WriteMessage(websocket.TextMessage, messageJSON); err != nil {
				log.Printf("Error sending audio chunk: %v", err)
				return
			}

			time.Sleep(100 * time.Millisecond)
		}

		// Send stop recording message
		stopMsg := map[string]interface{}{
			"type": "stop_recording",
		}
		stopMsgJSON, _ := json.Marshal(stopMsg)
		conn.WriteMessage(websocket.TextMessage, stopMsgJSON)

		// Type the final text after processing
		go r.typeText()
	}()

	// Wait for done signal or completion
	select {
	case <-r.Done:
		r.Recording = false
	}

	wg.Wait()
}

func (r *GladiaRecorder) typeText() {
	// Add a small delay to ensure the recording has fully stopped
	time.Sleep(500 * time.Millisecond)

	r.Mutex.Lock()
	text := r.CurrentText
	r.CurrentText = "" // Reset for next recording
	r.Mutex.Unlock()

	if text == "" {
		log.Println("No text to type")
		return
	}

	log.Printf("Typing text: %s", text)

	// Try using clipboard instead of direct typing
	// This is more reliable for longer text
	if err := copyToClipboard(text); err != nil {
		log.Printf("Error copying to clipboard: %v", err)
		// Fall back to character-by-character typing
		typeCharByChar(text)
	} else {
		// Paste from clipboard (Cmd+V)
		kb, err := keybd_event.NewKeyBonding()
		if err != nil {
			log.Printf("Error creating keyboard controller: %v", err)
			return
		}

		// Press Cmd+V to paste
		kb.SetKeys(keybd_event.VK_V)
		kb.HasCTRL(runtime.GOOS == "windows") // Use Ctrl on Windows
		// Use HasSuper instead of HasMETA for Command key on macOS
		kb.HasSuper(runtime.GOOS == "darwin") // Use Cmd on macOS

		if err := kb.Launching(); err != nil {
			log.Printf("Error pasting from clipboard: %v", err)
			// Fall back to character-by-character typing
			typeCharByChar(text)
		}
	}

	log.Println("Finished typing text")
}

// Helper function to copy text to clipboard
func copyToClipboard(text string) error {
	// Use exec.Command to run pbcopy on macOS or clip on Windows
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("pbcopy")
	case "windows":
		cmd = exec.Command("clip")
	default:
		return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
	}

	cmd.Stdin = strings.NewReader(text)
	return cmd.Run()
}

// Helper function to type character by character with improved reliability
func typeCharByChar(text string) {
	// Create a new keyboard controller
	kb, err := keybd_event.NewKeyBonding()
	if err != nil {
		log.Printf("Error creating keyboard controller: %v", err)
		return
	}

	// Type each character with a longer delay
	for _, char := range text {
		// Reset the keyboard state for each character
		kb.Clear()
		kb.SetKeys(int(char))

		// Try launching with retry
		for i := 0; i < 3; i++ {
			if err := kb.Launching(); err != nil {
				log.Printf("Error typing character (attempt %d): %v", i+1, err)
				time.Sleep(10 * time.Millisecond)
			} else {
				break
			}
		}

		// Add a longer delay between characters
		time.Sleep(20 * time.Millisecond)
	}
}

// StatusBarApp represents the system tray application
type StatusBarApp struct {
	Recorder        *GladiaRecorder
	Languages       []string
	CurrentLanguage string
	MaxTime         float64
	Started         bool
	Timer           *time.Timer
	StartTime       time.Time
}

func NewStatusBarApp(recorder *GladiaRecorder, languages []string, maxTime float64) *StatusBarApp {
	currentLang := ""
	if len(languages) > 0 {
		currentLang = languages[0]
	}

	return &StatusBarApp{
		Recorder:        recorder,
		Languages:       languages,
		CurrentLanguage: currentLang,
		MaxTime:         maxTime,
		Started:         false,
	}
}

func (app *StatusBarApp) Run() {
	systray.Run(app.onReady, app.onExit)
}

func (app *StatusBarApp) onReady() {
	systray.SetTitle("Whisper")
	systray.SetTooltip("Speech Transcriber")

	mStartRecord := systray.AddMenuItem("Start Recording", "Start recording and transcribing")
	mStopRecord := systray.AddMenuItem("Stop Recording", "Stop recording and transcribing")
	mStopRecord.Disable()

	systray.AddSeparator()

	// Add language menu items if provided
	langMenuItems := make(map[string]*systray.MenuItem)
	if len(app.Languages) > 0 {
		for _, lang := range app.Languages {
			langMenuItem := systray.AddMenuItem(lang, "Switch to "+lang)
			langMenuItems[lang] = langMenuItem

			if lang == app.CurrentLanguage {
				langMenuItem.Disable()
			}
		}
	}

	systray.AddSeparator()
	mQuit := systray.AddMenuItem("Quit", "Quit the application")

	// Handle menu events in a goroutine
	go func() {
		for {
			select {
			case <-mStartRecord.ClickedCh:
				if !app.Started {
					app.Start()
					mStartRecord.Disable()
					mStopRecord.Enable()
				}

			case <-mStopRecord.ClickedCh:
				if app.Started {
					app.Stop()
					mStopRecord.Disable()
					mStartRecord.Enable()
				}

			case <-mQuit.ClickedCh:
				if app.Started {
					app.Stop()
				}
				systray.Quit()
				return

			default:
				// Check if any language menu item was clicked
				for lang, menuItem := range langMenuItems {
					select {
					case <-menuItem.ClickedCh:
						app.CurrentLanguage = lang

						// Update enabled/disabled state
						for l, mi := range langMenuItems {
							if l == lang {
								mi.Disable()
							} else {
								mi.Enable()
							}
						}

					default:
						// No click for this language
					}
				}

				time.Sleep(100 * time.Millisecond)
			}
		}
	}()
}

func (app *StatusBarApp) onExit() {
	// Cleanup
}

func (app *StatusBarApp) Start() {
	log.Println("Listening with Gladia API...")
	app.Started = true
	systray.SetTitle("🔴 Recording")

	// Start recording
	err := app.Recorder.Start(app.CurrentLanguage)
	if err != nil {
		log.Printf("Error starting recording: %v", err)
		app.Stop()
		return
	}

	app.StartTime = time.Now()

	// Start the timer for max recording time if specified
	if app.MaxTime > 0 {
		app.Timer = time.AfterFunc(time.Duration(app.MaxTime*float64(time.Second)), func() {
			app.Stop()
		})
	}

	// Start the timer update goroutine
	go app.updateTitle()
}

func (app *StatusBarApp) Stop() {
	if !app.Started {
		return
	}

	// Cancel the timer if it's running
	if app.Timer != nil {
		app.Timer.Stop()
	}

	log.Println("Performing Gladia's transcription...")
	systray.SetTitle("⏯")
	app.Started = false

	// Stop recording
	app.Recorder.Stop()
}

func (app *StatusBarApp) updateTitle() {
	for app.Started {
		elapsed := time.Since(app.StartTime)
		minutes := int(elapsed.Minutes())
		seconds := int(elapsed.Seconds()) % 60

		systray.SetTitle(fmt.Sprintf("(%02d:%02d) 🔴", minutes, seconds))
		time.Sleep(1 * time.Second)
	}
}

func (app *StatusBarApp) Toggle() {
	if app.Started {
		app.Stop()
	} else {
		app.Start()
	}
}

// KeyListener handles global keyboard shortcuts
type KeyListener struct {
	App             *StatusBarApp
	KeyCombination  []int
	KeysPressed     map[int]bool
	DoubleCmd       bool
	LastPressTime   time.Time
	LastReleasedKey int
	LastReleaseTime time.Time
}

func NewKeyListener(app *StatusBarApp, keyCombination string, doubleCmd bool) *KeyListener {
	keys := parseKeyCombination(keyCombination)

	return &KeyListener{
		App:             app,
		KeyCombination:  keys,
		KeysPressed:     make(map[int]bool),
		DoubleCmd:       doubleCmd,
		LastPressTime:   time.Time{},
		LastReleasedKey: 0,
		LastReleaseTime: time.Time{},
	}
}

func parseKeyCombination(combination string) []int {
	parts := strings.Split(combination, "+")
	keys := make([]int, 0, len(parts))

	// Updated key codes based on your system's actual values
	keyMap := map[string]int{
		"cmd_l": 56,   // Left Command on your system (was 55)
		"cmd_r": 54,   // Right Command
		"alt":   3675, // Option/Alt on your system (was 58)
		"ctrl":  59,   // Control
		"shift": 56,   // Shift
	}

	for _, part := range parts {
		if key, ok := keyMap[part]; ok {
			keys = append(keys, key)
		} else if len(part) == 1 {
			keys = append(keys, int(part[0]))
		}
	}

	return keys
}

func (l *KeyListener) Start() {
	// Replace the generic message with a more helpful one
	if l.DoubleCmd {
		log.Println("Ready! Press Right Command key twice quickly to start/stop transcription")
	} else {
		// Create a user-friendly description of the key combination
		// Specify that it's the Left Command key
		keyDesc := "Left Command+Option"

		// Log the instruction
		log.Println("Ready! Press " + keyDesc + " to start/stop transcription")
	}

	// Use hook package for keyboard events
	events := hook.Start()
	defer hook.End()

	for ev := range events {
		if ev.Kind == hook.KeyDown {
			l.handleKeyDown(int(ev.Keycode))
		} else if ev.Kind == hook.KeyUp {
			l.handleKeyUp(int(ev.Keycode))
		}
	}
}

func (l *KeyListener) handleKeyDown(keyCode int) {
	// Remove or comment out this log message
	// log.Printf("Key pressed: %d", keyCode)

	if l.DoubleCmd {
		if keyCode == 54 { // Mac right command key code
			now := time.Now()
			if !l.App.Started && now.Sub(l.LastPressTime) < 500*time.Millisecond {
				// Double press detected
				l.App.Toggle()
			} else if l.App.Started {
				// Single press while recording
				l.App.Toggle()
			}
			l.LastPressTime = now
		}
	} else {
		// Handle key combination
		l.KeysPressed[keyCode] = true

		// Remove or comment out these verbose log messages
		// log.Printf("Currently pressed keys: %v", l.KeysPressed)
		// log.Printf("Looking for combination: %v", l.KeyCombination)

		// Check specifically for cmd_l+alt combination using your system's key codes
		if l.KeysPressed[56] && l.KeysPressed[3675] {
			// Force toggle the recording when these specific keys are detected
			l.App.Toggle()
		}

		// Keep the original logic as a fallback
		allPressed := true
		for _, key := range l.KeyCombination {
			if !l.KeysPressed[key] {
				allPressed = false
				break
			}
		}

		if allPressed {
			l.App.Toggle()
		}
	}
}

func (l *KeyListener) handleKeyUp(keyCode int) {
	// Remove or comment out this log message
	// log.Printf("Key released: %d", keyCode)

	// Check if we're releasing one of our target keys (56 or 3675)
	if keyCode == 56 || keyCode == 3675 {
		now := time.Now()

		// Check if this is the second key release in our sequence
		if l.LastReleasedKey != 0 && l.LastReleasedKey != keyCode {
			// Check if the previous key was released recently (within 500ms)
			if now.Sub(l.LastReleaseTime) < 500*time.Millisecond {
				// Check if we have the correct sequence (56 then 3675 OR 3675 then 56)
				if (l.LastReleasedKey == 56 && keyCode == 3675) ||
					(l.LastReleasedKey == 3675 && keyCode == 56) {
					l.App.Toggle()
				}
			}
		}

		// Update the last released key info
		l.LastReleasedKey = keyCode
		l.LastReleaseTime = now
	}

	// Remove the key from pressed keys map
	delete(l.KeysPressed, keyCode)
}

func main() {
	// Parse command line arguments
	keyCombination := flag.String("key", "cmd_l+alt", "Key combination to toggle recording")
	doubleCmd := flag.Bool("double_cmd", false, "Use double Right Command key press to toggle")
	maxTime := flag.Float64("max_time", 30.0, "Maximum recording time in seconds")
	gladiaAPIKey := flag.String("gladia_api_key", "", "Gladia API key")

	// Language flags
	var languages stringSliceFlag
	flag.Var(&languages, "language", "Language code (can be specified multiple times)")

	flag.Parse()

	// Initialize portaudio
	if err := portaudio.Initialize(); err != nil {
		log.Fatalf("Error initializing PortAudio: %v", err)
	}
	defer portaudio.Terminate()

	// Create the keyboard controller
	kb, err := keybd_event.NewKeyBonding()
	if err != nil {
		log.Fatalf("Error creating keyboard controller: %v", err)
	}

	// Create transcriber (without rephrasing fields)
	transcriber := &SpeechTranscriber{
		Keyboard: &kb,
	}

	// Create recorder
	apiKey := *gladiaAPIKey
	if apiKey == "" {
		apiKey = os.Getenv("GLADIA_API_KEY")
	}

	recorder := NewGladiaRecorder(transcriber, apiKey)

	// Create status bar app
	app := NewStatusBarApp(recorder, languages, *maxTime)

	// Create and start key listener in a goroutine
	keyListener := NewKeyListener(app, *keyCombination, *doubleCmd)
	go keyListener.Start()

	// Run the app
	app.Run()
}

// stringSliceFlag is a custom flag type for handling multiple string flags
type stringSliceFlag []string

func (s *stringSliceFlag) String() string {
	return strings.Join(*s, ", ")
}

func (s *stringSliceFlag) Set(value string) error {
	*s = append(*s, value)
	return nil
}
