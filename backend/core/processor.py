# This file will contain the core logic for processing uploaded files.
# It will include functions to handle different file types (PDF, DOCX, TXT, etc.),
# extract text, and chunk it for further processing.

import os
import openai
import docx
from pypdf import PdfReader
from moviepy.editor import VideoFileClip
from .chunking import chunk_text

# Configure the OpenAI client
openai.api_key = os.environ.get("OPENAI_API_KEY")

def process_file(file_path: str, file_type: str):
    """
    Main function to process a file based on its type.
    """
    if "pdf" in file_type:
        text = process_pdf(file_path)
    elif "docx" in file_type:
        text = process_docx(file_path)
    elif "text" in file_type:
        text = process_txt(file_path)
    elif "video" in file_type:
        text = process_video(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    return chunk_text(text)

def process_video(file_path: str) -> str:
    """
    Processes a video file, extracts audio, and transcribes it.
    """
    video = VideoFileClip(file_path)
    audio_path = "temp_audio.mp3"
    video.audio.write_audiofile(audio_path, codec='mp3')

    with open(audio_path, "rb") as audio_file:
        transcription = openai.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file
        )

    os.remove(audio_path)
    return transcription.text

def process_pdf(file_path: str) -> str:
    """
    Processes a PDF file and extracts its text content.
    """
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text

def process_docx(file_path: str) -> str:
    """
    Processes a DOCX file and extracts its text content.
    """
    doc = docx.Document(file_path)
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

def process_txt(file_path: str) -> str:
    """
    Processes a TXT file and returns its content.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read() 