package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

const (
	gladiaInitURL = "https://api.gladia.io/v2/live"
)

// GladiaSession stores session information
type GladiaSession struct {
	ID  string
	URL string
}

var (
	gladiaAPIKey string
	session      GladiaSession
)

// createSession initializes a Gladia real-time transcription session and returns the WebSocket URL.
func createSession() (GladiaSession, error) {
	payload := map[string]interface{}{ // μ-law, 8-bit, 8 kHz, mono
		"encoding":    "wav/ulaw",
		"bit_depth":   8,
		"sample_rate": 8000,
		"channels":    1,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return GladiaSession{}, fmt.Errorf("failed to marshal payload: %w", err)
	}
	req, err := http.NewRequest("POST", gladiaInitURL, bytes.NewReader(body))
	if err != nil {
		return GladiaSession{}, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("X-Gladia-Key", gladiaAPIKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return GladiaSession{}, fmt.Errorf("session init request failed: %w", err)
	}
	defer resp.Body.Close()
	
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return GladiaSession{}, fmt.Errorf("bad status code: %d - %s", resp.StatusCode, string(bodyBytes))
	}
	
	var data GladiaSession
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return GladiaSession{}, fmt.Errorf("failed to decode response: %w", err)
	}
	log.Printf("🛰  Gladia session ID: %s", data.ID)
	return data, nil
}

// healthCheck returns a simple health status.
func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok","service":"twilio-gladia-transcription"}`))
}

// TwilioMessage represents the structure of messages from Twilio
type TwilioMessage struct {
	Event string `json:"event"`
	Media struct {
		Payload string `json:"payload"`
	} `json:"media"`
}

// GladiaMessage represents the structure of messages from Gladia
type GladiaMessage struct {
	Type string `json:"type"`
	Data struct {
		IsFinal   bool `json:"is_final"`
		Utterance struct {
			Text string `json:"text"`
		} `json:"utterance"`
	} `json:"data"`
}

// processMessage decodes Twilio media payload and forwards raw μ-law bytes to Gladia.
func processMessage(message []byte, gladiaConn *websocket.Conn) {
	var msg TwilioMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Error parsing Twilio message: %v", err)
		return
	}
	if msg.Event != "media" {
		log.Printf("Ignoring non-media event: %s", msg.Event)
		return // ignore non-media events
	}
	mulaw, err := base64.StdEncoding.DecodeString(msg.Media.Payload)
	if err != nil {
		log.Printf("Error decoding payload: %v", err)
		return
	}
	if err := gladiaConn.WriteMessage(websocket.BinaryMessage, mulaw); err != nil {
		log.Printf("Error sending to Gladia: %v", err)
	}
}

// handleGladia processes incoming messages from Gladia and logs final transcripts.
func handleGladia(message []byte) string {
	var msg GladiaMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		log.Printf("Error parsing Gladia message: %v", err)
		return ""
	}
	if msg.Type == "transcript" && msg.Data.IsFinal {
		transcript := msg.Data.Utterance.Text
		log.Printf("📝 Transcript: %s", transcript)
		return transcript
	}
	return ""
}

// handleWebSocket manages a WebSocket connection between Twilio and Gladia.
func handleWebSocket(twilioConn *websocket.Conn) {
	clientInfo := twilioConn.RemoteAddr().String()
	log.Printf("🔌 Twilio WebSocket connected from %s", clientInfo)
	
	defer twilioConn.Close()
	
	// Connect to Gladia
	dialer := websocket.DefaultDialer
	gladiaConn, _, err := dialer.Dial(session.URL, nil)
	if err != nil {
		log.Printf("Failed to connect to Gladia: %v", err)
		return
	}
	defer gladiaConn.Close()
	log.Printf("Connected to Gladia session %s", session.ID)

	var wg sync.WaitGroup
	wg.Add(2)

	// Twilio -> Gladia
	go func() {
		defer wg.Done()
		for {
			_, msg, err := twilioConn.ReadMessage()
			if err != nil {
				log.Printf("Error reading from Twilio: %v", err)
				return
			}
			processMessage(msg, gladiaConn)
		}
	}()

	// Gladia -> transcripts
	go func() {
		defer wg.Done()
		for {
			_, msg, err := gladiaConn.ReadMessage()
			if err != nil {
				log.Printf("Error reading from Gladia: %v", err)
				return
			}
			handleGladia(msg)
		}
	}()

	wg.Wait()
}

func main() {
	// Configure logging
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	
	// Load environment variables from .env (optional)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found. Using environment variables.")
	}
	
	gladiaAPIKey = os.Getenv("GLADIA_API_KEY")
	if gladiaAPIKey == "" {
		log.Fatal("GLADIA_API_KEY environment variable is required")
	}
	
	port := os.Getenv("HTTP_PORT")
	if port == "" {
		port = "5000"
	}
	
	var err error
	session, err = createSession()
	if err != nil {
		log.Fatalf("Failed to create initial Gladia session: %v", err)
	}

	// Set up HTTP routes
	http.HandleFunc("/health", healthCheck)
	
	// Configure WebSocket upgrader
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	
	// Media endpoint
	http.HandleFunc("/media", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("WebSocket upgrade failed: %v", err)
			return
		}
		handleWebSocket(conn)
	})
	
	// Catch-all WebSocket handler
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if websocket.IsWebSocketUpgrade(r) {
			conn, err := upgrader.Upgrade(w, r, nil)
			if err != nil {
				log.Printf("WebSocket upgrade failed: %v", err)
				return
			}
			log.Printf("🔌 Catch-all WebSocket connected to %s", r.URL.Path)
			handleWebSocket(conn)
		} else {
			// For regular HTTP requests to root, return a simple info page
			w.Header().Set("Content-Type", "text/plain")
			w.Write([]byte("Twilio-Gladia Transcription Server\n\nAvailable endpoints:\n- /media (WebSocket): Connect Twilio Media Streams\n- /health (HTTP): Health check endpoint"))
		}
	})

	// Start the server
	addr := fmt.Sprintf(":%s", port)
	log.Printf("🚀 Starting server on 0.0.0.0:%s", port)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}