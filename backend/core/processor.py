# This file will contain the core logic for processing uploaded files.
# It will include functions to handle different file types (PDF, DOCX, TXT, etc.),
# extract text, and chunk it for further processing.

import os
import tempfile
import whisper
import mimetypes
import subprocess
from .chunking import chunk_text
from langchain_text_splitters import RecursiveCharacterTextSplitter
import docx
from pypdf import PdfReader
import requests
from bs4 import BeautifulSoup

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 100

def _get_text_splitter():
    """Returns a configured text splitter."""
    return RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len
    )

def _get_text_from_docx(file_path: str) -> str:
    """Extracts text from a .docx file."""
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])

def _get_text_from_pdf(file_path: str) -> str:
    """Extracts text from a .pdf file."""
    reader = PdfReader(file_path)
    return "\n".join([page.extract_text() for page in reader.pages])

def _get_text_from_txt(file_path: str) -> str:
    """Reads text from a .txt file."""
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()

def process_file(file_path: str, original_filename: str) -> list[str]:
    """
    Determines the file type from the original filename and processes it.
    """
    text_splitter = _get_text_splitter()
    text = ""
    file_ext = os.path.splitext(original_filename)[1].lower()

    if file_ext == ".docx":
        text = _get_text_from_docx(file_path)
    elif file_ext == ".pdf":
        text = _get_text_from_pdf(file_path)
    elif file_ext == ".txt":
        text = _get_text_from_txt(file_path)
    else:
        # If the content type is not supported, we don't raise an error,
        # just return no chunks. The background task will log a warning.
        print(f"Warning: Unsupported file type '{file_ext}' for file {original_filename}")
        return []

    return text_splitter.split_text(text)

def process_url(url: str) -> list[str]:
    """
    Fetches content from a URL, extracts text, and splits it into chunks.
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, "html.parser")
        
        # Remove script and style elements
        for script_or_style in soup(["script", "style"]):
            script_or_style.decompose()
            
        text = soup.get_text(separator="\n", strip=True)
        
        text_splitter = _get_text_splitter()
        return text_splitter.split_text(text)
        
    except requests.RequestException as e:
        print(f"Error fetching URL {url}: {e}")
        return []

# NOTE: The PDF and DOCX processing functions have been removed for now
# to resolve a local module dependency issue. They can be restored when needed. 