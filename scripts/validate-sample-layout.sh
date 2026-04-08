#!/usr/bin/env bash
# Ensures python/, javascript/, and typescript/ match the tree documented in README.md.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

missing=0

require_path() {
  local p="$1"
  if [[ ! -e "$p" ]]; then
    echo "error: missing required path: $p" >&2
    missing=1
  fi
}

echo "Checking sample layout under $ROOT ..."

# --- Python (README + pyproject [tool.gladia.scripts]) ---
require_path "python/README.md"
require_path "python/pyproject.toml"
require_path "python/core-concepts/pre-recorded/pre_recorded.py"
require_path "python/core-concepts/pre-recorded/pre_recorded_async.py"
require_path "python/core-concepts/live/live-from-file.py"
require_path "python/core-concepts/live/live-from-microphone.py"
require_path "python/examples/anonymized_call.py"
require_path "python/examples/call_sentiment_analysis.py"
require_path "python/examples/meeting_summary.py"
require_path "python/examples/youtube_translation.py"

# --- JavaScript (README + package.json scripts) ---
require_path "javascript/README.md"
require_path "javascript/package.json"
require_path "javascript/core-concepts/pre-recorded/pre-recorded.js"
require_path "javascript/core-concepts/live/live-from-file.js"
require_path "javascript/core-concepts/live/live-from-microphone.js"
require_path "javascript/examples/anonymized-call.js"
require_path "javascript/examples/call-sentiment-analysis.js"
require_path "javascript/examples/meeting-summary.js"
require_path "javascript/examples/youtube-translation.js"

# --- TypeScript ---
require_path "typescript/README.md"
require_path "typescript/package.json"
require_path "typescript/tsconfig.json"
require_path "typescript/core-concepts/pre-recorded/pre-recorded.ts"
require_path "typescript/core-concepts/live/live-from-file.ts"
require_path "typescript/core-concepts/live/live-from-microphone.ts"
require_path "typescript/examples/anonymized-call.ts"
require_path "typescript/examples/call-sentiment-analysis.ts"
require_path "typescript/examples/meeting-summary.ts"
require_path "typescript/examples/youtube-translation.ts"

# --- Integration examples: each folder listed in README must have a README ---
for integration in discord gmeet-bot livekit-agent OBS pipecat-bot twilio; do
  require_path "integrations-examples/${integration}/README.md"
done

if [[ "$missing" -ne 0 ]]; then
  echo "layout validation failed" >&2
  exit 1
fi

echo "layout OK"
