#!/usr/bin/env python3
"""
Demo script to show how the FTP pull mode transcription server works.
This simulates the behavior without requiring actual FTP/SFTP or Gladia API connections.
"""

import os
import sys
import time
import json
import tempfile
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed


def simulate_ftp_server():
    """Simulate an FTP server with audio files."""
    print("\n" + "="*70)
    print("FTP PULL MODE TRANSCRIPTION DEMO")
    print("="*70)
    
    print("\n📂 Simulated FTP Server Contents:")
    files = [
        "/remote/kiosk-01/announcement_001.mp3",
        "/remote/kiosk-01/announcement_002.mp3",
        "/remote/kiosk-01/announcement_002.json",  # Already processed
        "/remote/kiosk-02/customer_inquiry_001.wav",
        "/remote/kiosk-02/customer_inquiry_002.m4a",
        "/remote/kiosk-03/feedback_001.mp3",
    ]
    
    for file in files:
        status = " ✅ (has transcription)" if file.endswith(".json") else ""
        print(f"  {file}{status}")
    
    return files


def simulate_processing(audio_file):
    """Simulate the processing of a single audio file."""
    print(f"\n🎵 Processing: {audio_file}")
    
    # Simulate upload to Gladia
    print(f"  ⬆️  Uploading to Gladia API...")
    time.sleep(0.5)
    
    # Simulate transcription request
    print(f"  🔄 Starting transcription job...")
    time.sleep(0.5)
    
    # Simulate polling for result
    for i in range(3):
        print(f"  ⏳ Polling for result... ({i+1}/3)")
        time.sleep(0.5)
    
    # Simulate successful transcription
    transcript = f"This is the transcribed content from {os.path.basename(audio_file)}"
    print(f"  ✅ Transcription complete!")
    print(f"  📝 Result: \"{transcript[:50]}...\"")
    
    # Simulate saving JSON result
    json_file = os.path.splitext(audio_file)[0] + ".json"
    print(f"  💾 Saving transcription to: {json_file}")
    
    return {
        "audio_file": audio_file,
        "json_file": json_file,
        "transcript": transcript
    }


def main():
    """Main demo function."""
    # Simulate FTP server contents
    all_files = simulate_ftp_server()
    
    # Filter for audio files that need processing
    supported_extensions = ('.mp3', '.wav', '.m4a')
    audio_files = [f for f in all_files if f.lower().endswith(supported_extensions)]
    json_files = [f for f in all_files if f.lower().endswith('.json')]
    
    # Find unprocessed audio files
    unprocessed = []
    for audio in audio_files:
        expected_json = os.path.splitext(audio)[0] + ".json"
        if expected_json not in json_files:
            unprocessed.append(audio)
    
    print(f"\n📊 Analysis:")
    print(f"  Total audio files: {len(audio_files)}")
    print(f"  Already processed: {len(audio_files) - len(unprocessed)}")
    print(f"  Need processing: {len(unprocessed)}")
    
    if not unprocessed:
        print("\n✨ All files are already processed!")
        return
    
    print(f"\n🚀 Starting parallel processing with 2 workers...")
    print("="*70)
    
    # Process files in parallel
    results = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        # Submit all unprocessed files
        futures = {executor.submit(simulate_processing, file): file 
                  for file in unprocessed}
        
        # Collect results as they complete
        for future in as_completed(futures):
            try:
                result = future.result()
                results.append(result)
            except Exception as e:
                print(f"\n❌ Error processing {futures[future]}: {e}")
    
    # Summary
    print("\n" + "="*70)
    print("PROCESSING COMPLETE")
    print("="*70)
    print(f"\n📈 Summary:")
    print(f"  Files processed: {len(results)}")
    print(f"  Transcriptions saved: {len(results)}")
    
    print(f"\n📁 New JSON files created:")
    for result in results:
        print(f"  ✅ {result['json_file']}")
    
    print("\n✨ Demo complete! In a real deployment:")
    print("  - The script would continuously monitor the FTP/SFTP server")
    print("  - Real audio files would be uploaded to Gladia API")
    print("  - Actual transcriptions would be saved back to the FTP/SFTP server")
    print("  - Processing would repeat at regular intervals (e.g., every 20 seconds)")


if __name__ == "__main__":
    main()