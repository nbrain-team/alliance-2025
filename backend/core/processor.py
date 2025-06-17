# This file will contain the core logic for processing uploaded files.
# It will include functions to handle different file types (PDF, DOCX, TXT, etc.),
# extract text, and chunk it for further processing.

import os
import tempfile
import whisper
import mimetypes
import subprocess
from .chunking import chunk_text

def process_file(file_path: str, content_type: str) -> list[str]:
    """
    Processes an uploaded file based on its content type and returns text chunks.
    """
    if content_type.startswith('video/'):
        return process_video(file_path)
    elif content_type.startswith('text/'):
        return process_text(file_path)
    else:
        # Try to guess the mime type if not provided
        guessed_type, _ = mimetypes.guess_type(file_path)
        if guessed_type:
            if guessed_type.startswith('video/'):
                return process_video(file_path)
            elif guessed_type.startswith('text/'):
                return process_text(file_path)

        raise ValueError(f"Unsupported file type: {content_type} / {guessed_type}")

def process_video(file_path: str) -> list[str]:
    """
    Processes a video file by extracting audio with ffmpeg and transcribing it.
    This method is more memory-efficient than using MoviePy for large files.
    """
    print(f"Processing video with ffmpeg: {file_path}")
    audio_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio_file:
            audio_path = temp_audio_file.name

        # Use ffmpeg to extract audio without loading video into memory
        command = ["ffmpeg", "-i", file_path, "-q:a", "0", "-map", "a", audio_path, "-y"]
        print("Extracting audio with ffmpeg...")
        # Use capture_output=True to hide ffmpeg's noisy stdout/stderr from logs unless there's an error
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        
        print("Transcribing audio...")
        model = whisper.load_model("tiny") 
        result = model.transcribe(audio_path, fp16=False)
        full_text = result['text']
        
        print("Transcription complete. Chunking text...")
        return chunk_text(full_text)
    except subprocess.CalledProcessError as e:
        print(f"ffmpeg failed: {e.stderr}")
        return []
    except Exception as e:
        print(f"Error processing video {file_path}: {e}")
        return []
    finally:
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
            print(f"Cleaned up temporary audio file: {audio_path}")

def process_text(file_path: str) -> list[str]:
    """
    Processes a text file and chunks its content.
    """
    print(f"Processing text file: {file_path}")
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            full_text = f.read()
        return chunk_text(full_text)
    except Exception as e:
        print(f"Error processing text file {file_path}: {e}")
        return []

# NOTE: The PDF and DOCX processing functions have been removed for now
# to resolve a local module dependency issue. They can be restored when needed. 