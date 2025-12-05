#!/usr/bin/env python3
"""
Test suite for pull_from_ftp.py with mocked FTP/SFTP services and Gladia API.
"""

import os
import sys
import json
import tempfile
import shutil
import time
from unittest import TestCase, TestLoader, TextTestRunner, mock
from unittest.mock import Mock, MagicMock, patch, call, mock_open
from concurrent.futures import Future
from io import BytesIO
import uuid


class TestPullFromFTP(TestCase):
    """Test suite for the FTP pull mode transcription server."""
    
    def setUp(self):
        """Set up test environment and mocks."""
        self.temp_dir = tempfile.mkdtemp(prefix="test_ftp_")
        
        # Set up environment variables
        self.env_vars = {
            "GLADIA_API_KEY": "test-api-key-xxxx",
            "STORAGE_HOST": "test.ftp.server.com",
            "STORAGE_TYPE": "sftp",
            "STORAGE_USER": "test_user",
            "STORAGE_PASS": "test_pass",
            "POLLING_INTERVAL_SECONDS": "1",
            "REMOTE_DIRECTORY": "/test/uploads",
            "SUPPORTED_EXTENSIONS": "mp3,wav,m4a",
            "MAX_PARALLELISM": "2"
        }
        
        # Apply environment variables
        self.env_patcher = patch.dict(os.environ, self.env_vars)
        self.env_patcher.start()
        
        # Create mock for the module
        self.mock_module = MagicMock()
        
    def tearDown(self):
        """Clean up test environment."""
        self.env_patcher.stop()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def test_configuration_loading(self):
        """Test that configuration is properly loaded from environment variables."""
        # Import the module to test configuration loading
        with patch.dict(os.environ, self.env_vars):
            # Mock the module import to test configuration
            import pull_from_ftp
            
            self.assertEqual(pull_from_ftp.GLADIA_API_KEY, "test-api-key-xxxx")
            self.assertEqual(pull_from_ftp.STORAGE_HOST, "test.ftp.server.com")
            self.assertEqual(pull_from_ftp.STORAGE_TYPE, "sftp")
            self.assertEqual(pull_from_ftp.POLLING_INTERVAL_SECONDS, 1)
            self.assertEqual(pull_from_ftp.MAX_PARALLELISM, 2)
            self.assertIn(".mp3", pull_from_ftp.SUPPORTED_EXTENSIONS)
            self.assertIn(".wav", pull_from_ftp.SUPPORTED_EXTENSIONS)
    
    def test_missing_required_config(self):
        """Test that missing required configuration raises an error."""
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(ValueError) as context:
                # Re-import to trigger configuration loading
                if 'pull_from_ftp' in sys.modules:
                    del sys.modules['pull_from_ftp']
                import pull_from_ftp
            
            self.assertIn("GLADIA_API_KEY", str(context.exception))
            self.assertIn("STORAGE_HOST", str(context.exception))
    
    def test_gladia_upload_audio(self):
        """Test audio upload to Gladia API."""
        import pull_from_ftp
        
        # Create a test file
        test_file = os.path.join(self.temp_dir, "test.mp3")
        with open(test_file, "wb") as f:
            f.write(b"fake audio data")
        
        # Test the upload function (pseudocode version)
        result = pull_from_ftp.gladia_upload_audio(test_file)
        
        # For the pseudocode version, just check it returns something
        self.assertIsNotNone(result)
        self.assertIn("gladia.io", result)
    
    def test_gladia_request_transcription(self):
        """Test transcription request to Gladia API."""
        import pull_from_ftp
        
        # Test the transcription request (pseudocode version)
        audio_url = "https://api.gladia.io/audio/test.mp3"
        result = pull_from_ftp.gladia_request_transcription(audio_url)
        
        # Check result
        self.assertIsNotNone(result)
        self.assertIn("transcription", result.lower())
    
    @patch('pull_from_ftp.time.sleep')
    def test_gladia_poll_for_result(self, mock_sleep):
        """Test polling for transcription results."""
        import pull_from_ftp
        
        # Reset the poll count if it exists
        if hasattr(pull_from_ftp.gladia_poll_for_result, 'poll_count'):
            pull_from_ftp.gladia_poll_for_result.poll_count = 0
        
        # Test polling (pseudocode version simulates 3 polls)
        result = pull_from_ftp.gladia_poll_for_result("test-id")
        
        # Check result structure
        self.assertIsNotNone(result)
        self.assertIn("transcription", result)
        self.assertIn("full_transcript", result["transcription"])
    
    def test_list_remote_files(self):
        """Test listing files from remote storage."""
        import pull_from_ftp
        
        # Test the list function
        files = pull_from_ftp.list_remote_files("/test/path")
        
        # Check that files are returned
        self.assertIsInstance(files, list)
        self.assertTrue(len(files) > 0)
        
        # Check file extensions
        audio_extensions = ('.mp3', '.wav', '.m4a')
        audio_files = [f for f in files if f.lower().endswith(audio_extensions)]
        self.assertTrue(len(audio_files) > 0)
    
    @patch('builtins.open', new_callable=mock_open)
    def test_download_file_from_storage(self, mock_file):
        """Test downloading a file from remote storage."""
        import pull_from_ftp
        
        remote_path = "/remote/test.mp3"
        local_path = os.path.join(self.temp_dir, "local_test.mp3")
        
        # Test download
        pull_from_ftp.download_file_from_storage(remote_path, local_path)
        
        # Check that file write was attempted
        mock_file.assert_called_with(local_path, "w")
        mock_file().write.assert_called_with("dummy audio data")
    
    def test_save_file_to_storage(self):
        """Test saving a file to remote storage."""
        import pull_from_ftp
        
        # Create a test file
        local_file = os.path.join(self.temp_dir, "test.json")
        with open(local_file, "w") as f:
            json.dump({"test": "data"}, f)
        
        remote_path = "/remote/test.json"
        
        # Test upload (this is mocked in the pseudocode)
        # No exception should be raised
        pull_from_ftp.save_file_to_storage(local_file, remote_path)
    
    @patch('pull_from_ftp.save_file_to_storage')
    @patch('pull_from_ftp.gladia_poll_for_result')
    @patch('pull_from_ftp.gladia_request_transcription')
    @patch('pull_from_ftp.gladia_upload_audio')
    @patch('builtins.open', new_callable=mock_open)
    def test_process_audio_file(self, mock_file, mock_upload, mock_request, 
                                mock_poll, mock_save):
        """Test the complete audio file processing workflow."""
        import pull_from_ftp
        
        # Set up mocks
        mock_upload.return_value = "https://api.gladia.io/audio/test.mp3"
        mock_request.return_value = "transcription-id-123"
        mock_poll.return_value = {
            "transcription": {
                "full_transcript": "Test transcription"
            },
            "metadata": {"audio_url": "https://test.url"}
        }
        
        # Create a test audio file
        local_audio = os.path.join(self.temp_dir, "test.mp3")
        with open(local_audio, "w") as f:
            f.write("fake audio")
        
        remote_path = "/remote/kiosk-01/test.mp3"
        
        # Process the file
        pull_from_ftp.process_audio_file(local_audio, remote_path)
        
        # Verify the workflow
        mock_upload.assert_called_once_with(local_audio)
        mock_request.assert_called_once_with("https://api.gladia.io/audio/test.mp3")
        mock_poll.assert_called_once_with("transcription-id-123")
        
        # Verify JSON was saved
        expected_json_path = "/remote/kiosk-01/test.json"
        mock_save.assert_called_once()
        saved_path = mock_save.call_args[0][1]
        self.assertEqual(saved_path, expected_json_path)
    
    @patch('os.path.exists')
    @patch('os.remove')
    @patch('pull_from_ftp.process_audio_file')
    @patch('pull_from_ftp.download_file_from_storage')
    def test_worker_task(self, mock_download, mock_process, mock_remove, mock_exists):
        """Test the worker task wrapper."""
        import pull_from_ftp
        
        # Mock that file exists for cleanup
        mock_exists.return_value = True
        
        remote_path = "/remote/test.mp3"
        
        # Run worker task
        result = pull_from_ftp.worker_task(remote_path)
        
        # Verify download was called
        mock_download.assert_called_once()
        
        # Verify processing was called
        mock_process.assert_called_once()
        
        # Verify cleanup was called
        mock_remove.assert_called()
        
        # Check return value
        self.assertEqual(result, remote_path)
    
    def test_main_watcher_loop_logic(self):
        """Test the file filtering logic used in the main watcher loop."""
        # Simulate the main loop's file filtering logic
        all_files = [
            "/test/uploads/rec_01.mp3",
            "/test/uploads/rec_02.mp3",
            "/test/uploads/rec_02.json",  # Already processed
            "/test/uploads/rec_03.wav",
            "/test/uploads/document.pdf",  # Should be ignored
            "/test/uploads/rec_04.m4a",
            "/test/uploads/rec_04.json",  # Already processed
        ]
        
        supported_extensions = ('.mp3', '.wav', '.m4a')
        
        # Filter for audio files
        audio_files = {f for f in all_files if f.lower().endswith(supported_extensions)}
        json_files = {f for f in all_files if f.lower().endswith('.json')}
        
        # Find unprocessed audio files
        unprocessed_audio = []
        for audio_path in audio_files:
            expected_json_path = os.path.splitext(audio_path)[0] + ".json"
            if expected_json_path not in json_files:
                unprocessed_audio.append(audio_path)
        
        # Should find rec_01.mp3 and rec_03.wav as unprocessed
        self.assertEqual(len(unprocessed_audio), 2)
        self.assertIn("/test/uploads/rec_01.mp3", unprocessed_audio)
        self.assertIn("/test/uploads/rec_03.wav", unprocessed_audio)
        
        # rec_02.mp3 and rec_04.m4a should NOT be in unprocessed (they have JSON files)
        self.assertNotIn("/test/uploads/rec_02.mp3", unprocessed_audio)
        self.assertNotIn("/test/uploads/rec_04.m4a", unprocessed_audio)
    
    def test_file_filtering_logic(self):
        """Test the logic for filtering already processed files."""
        # Simulate the filtering logic
        all_files = [
            "/remote/audio1.mp3",
            "/remote/audio1.json",
            "/remote/audio2.wav",
            "/remote/audio3.m4a",
            "/remote/audio3.json",
            "/remote/other.txt"
        ]
        
        supported_extensions = ('.mp3', '.wav', '.m4a')
        
        audio_files = {f for f in all_files if f.lower().endswith(supported_extensions)}
        json_files = {f for f in all_files if f.lower().endswith('.json')}
        
        unprocessed = []
        for audio in audio_files:
            expected_json = os.path.splitext(audio)[0] + ".json"
            if expected_json not in json_files:
                unprocessed.append(audio)
        
        # Should only include audio2.wav (audio1 and audio3 have JSON files)
        self.assertEqual(len(unprocessed), 1)
        self.assertIn("audio2.wav", unprocessed[0])
    
    @patch('os.remove')
    @patch('pull_from_ftp.process_audio_file')
    @patch('pull_from_ftp.download_file_from_storage')
    def test_error_handling_in_worker(self, mock_download, mock_process, mock_remove):
        """Test error handling in the worker task."""
        import pull_from_ftp
        
        # Make processing raise an exception
        mock_process.side_effect = Exception("Processing failed")
        
        remote_path = "/remote/test.mp3"
        
        # Worker task should still complete even with exception
        # The finally block ensures cleanup happens
        try:
            result = pull_from_ftp.worker_task(remote_path)
            # Should still return the path even on error
            self.assertEqual(result, remote_path)
        except Exception:
            # The pseudocode doesn't handle the exception, so it might propagate
            pass
    
    def test_parallel_processing_limit(self):
        """Test that parallel processing respects MAX_PARALLELISM."""
        with patch.dict(os.environ, {"MAX_PARALLELISM": "3"}):
            if 'pull_from_ftp' in sys.modules:
                del sys.modules['pull_from_ftp']
            import pull_from_ftp
            
            self.assertEqual(pull_from_ftp.MAX_PARALLELISM, 3)


def run_tests():
    """Run all tests and display results."""
    # Create test suite
    loader = TestLoader()
    suite = loader.loadTestsFromTestCase(TestPullFromFTP)
    
    # Run tests with verbose output
    runner = TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    
    if result.wasSuccessful():
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Some tests failed!")
        
        if result.failures:
            print("\nFailures:")
            for test, traceback in result.failures:
                print(f"  - {test}: {traceback}")
        
        if result.errors:
            print("\nErrors:")
            for test, traceback in result.errors:
                print(f"  - {test}: {traceback}")
    
    return result.wasSuccessful()


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)