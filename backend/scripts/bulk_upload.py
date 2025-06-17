import os
import sys
import argparse
from dotenv import load_dotenv
from pathlib import Path

# --- Add project root to Python path ---
# This allows us to import from the 'core' module.
project_root = Path(__file__).resolve().parent.parent
sys.path.append(str(project_root))
# --- Load Environment Variables ---
# Assumes a .env file exists in the 'backend' directory
load_dotenv(dotenv_path=project_root / ".env")

from core.processor import process_file
from core.pinecone_manager import PineconeManager

# --- Supported Video Formats ---
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}

def bulk_upload(directory_path: str, doc_type: str):
    """
    Scans a directory for video files, processes them, and uploads them to Pinecone.
    """
    print("--- Starting Bulk Upload Process ---")
    
    try:
        # Initialize Pinecone Manager once
        print("Initializing Pinecone connection...")
        pinecone_manager = PineconeManager()
        print("Pinecone connection successful.")
    except Exception as e:
        print(f"FATAL: Could not connect to Pinecone. Please check your .env file. Error: {e}")
        return

    video_files = [p for p in Path(directory_path).rglob('*') if p.suffix.lower() in VIDEO_EXTENSIONS]

    if not video_files:
        print(f"No video files found in '{directory_path}'. Please check the path and file extensions.")
        return

    total_files = len(video_files)
    print(f"Found {total_files} video file(s) to process.")
    print("-" * 20)

    for i, file_path in enumerate(video_files):
        file_name = file_path.name
        print(f"Processing file {i + 1}/{total_files}: {file_name}")

        try:
            # 1. Process the local file to get text chunks
            # We determine the content type from the file extension.
            content_type = f"video/{file_path.suffix.lower().strip('.')}"
            chunks = process_file(str(file_path), content_type)

            if not chunks:
                print(f"Warning: No text chunks were extracted from {file_name}. Skipping.")
                continue

            # 2. Define metadata
            metadata = {"source": file_name, "doc_type": doc_type}
            print(f"Extracted {len(chunks)} text chunks. Upserting to Pinecone...")

            # 3. Upsert chunks to Pinecone
            pinecone_manager.upsert_chunks(chunks, metadata)
            print(f"Successfully processed and uploaded: {file_name}")
            print("-" * 20)

        except Exception as e:
            print(f"ERROR: Failed to process {file_name}. Reason: {e}")
            print("Continuing to the next file...")
            print("-" * 20)
            continue

    print("--- Bulk Upload Process Complete ---")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bulk upload video files to the ADTV Knowledge Base.")
    parser.add_argument("directory", type=str, help="The path to the directory containing your video files.")
    parser.add_argument("--doc_type", type=str, default="Bulk Video Upload", help="The 'Document Type' to assign to these videos.")
    
    args = parser.parse_args()
    
    bulk_upload(args.directory, args.doc_type) 