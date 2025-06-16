# This file will contain the core logic for processing uploaded files.
# It will include functions to handle different file types (PDF, DOCX, TXT, etc.),
# extract text, and chunk it for further processing.

import docx
from pypdf import PdfReader
from .chunking import chunk_text

def process_file(file_path: str, file_type: str):
    """
    Main function to process a file based on its type.
    """
    if file_type == "pdf":
        text = process_pdf(file_path)
    elif file_type == "docx":
        text = process_docx(file_path)
    elif file_type == "txt":
        text = process_txt(file_path)
    # Add other file types here later
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    return chunk_text(text)

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