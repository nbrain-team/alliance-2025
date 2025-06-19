from fastapi import FastAPI, HTTPException, Form, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional, AsyncGenerator
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import sys
import json
import tempfile

from core import pinecone_manager
from core import llm_handler
from core import processor

load_dotenv()

app = FastAPI(
    title="ADTV RAG API",
    description="API for ADTV's Retrieval-Augmented Generation platform.",
    version="0.2.1",
)

# --- CORS Configuration ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """Root endpoint to check if the API is running."""
    return {"status": "ADTV RAG API is running"}

# --- Background Processing ---
def process_and_index_files(temp_file_paths: List[str], original_file_names: List[str]):
    """Background task to process and index a list of files."""
    print(f"BACKGROUND_TASK: Starting processing for {len(original_file_names)} files.")
    for i, temp_path in enumerate(temp_file_paths):
        original_name = original_file_names[i]
        print(f"BACKGROUND_TASK: Processing {original_name}")
        try:
            # We can infer content_type from the original file name extension
            chunks = processor.process_file(temp_path, original_name)
            if not chunks:
                print(f"BACKGROUND_TASK: No chunks found for {original_name}. Skipping.")
                continue
            
            metadata = {"source": original_name, "doc_type": "file_upload"}
            pinecone_manager.upsert_chunks(chunks, metadata)
            print(f"BACKGROUND_TASK: Successfully processed and indexed {original_name}")
        except Exception as e:
            print(f"BACKGROUND_TASK_ERROR: Failed to process {original_name}. Reason: {e}", file=sys.stderr)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
    print("BACKGROUND_TASK: File processing complete.")

def process_and_index_urls(urls: List[str]):
    """Background task to crawl, process, and index a list of URLs."""
    print(f"BACKGROUND_TASK: Starting crawling for {len(urls)} URLs.")
    for url in urls:
        print(f"BACKGROUND_TASK: Processing {url}")
        try:
            chunks = processor.process_url(url)
            if not chunks:
                print(f"BACKGROUND_TASK: No content found for {url}. Skipping.")
                continue

            metadata = {"source": url, "doc_type": "url_crawl"}
            pinecone_manager.upsert_chunks(chunks, metadata)
            print(f"BACKGROUND_TASK: Successfully processed and indexed {url}")
        except Exception as e:
            print(f"BACKGROUND_TASK_ERROR: Failed to process {url}. Reason: {e}", file=sys.stderr)
    print("BACKGROUND_TASK: URL crawling complete.")

# --- API Data Models ---
class ChatRequest(BaseModel):
    query: str
    history: List[dict] = []
    file_names: Optional[List[str]] = None

# --- API Endpoints ---
@app.post("/upload-files")
async def upload_files(files: List[UploadFile] = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Accepts one or more files, saves them temporarily,
    and processes them in the background.
    """
    temp_file_paths = []
    original_file_names = []
    for file in files:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file_paths.append(temp_file.name)
            original_file_names.append(file.filename)
    
    background_tasks.add_task(process_and_index_files, temp_file_paths, original_file_names)
    
    return {"message": f"Successfully uploaded {len(files)} files. Processing has started in the background."}

class UrlList(BaseModel):
    urls: List[str]

@app.post("/crawl-urls")
async def crawl_urls(url_list: UrlList, background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Accepts a list of URLs and processes them in the background.
    """
    background_tasks.add_task(process_and_index_urls, url_list.urls)
    return {"message": f"Started crawling {len(url_list.urls)} URLs in the background."}

@app.get("/documents")
async def get_documents():
    """Retrieves a list of all documents from the vector database."""
    try:
        return pinecone_manager.list_documents()
    except Exception as e:
        print(f"Error listing documents: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{file_name}")
async def delete_document(file_name: str):
    """Deletes a document from Pinecone."""
    try:
        pinecone_manager.delete_document(file_name)
        return {"message": f"Successfully deleted {file_name}."}
    except Exception as e:
        print(f"Error deleting document {file_name}: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    Primary chat endpoint. Receives a query, retrieves context from Pinecone,
    and streams the LLM's response.
    """
    async def stream_generator() -> AsyncGenerator[str, None]:
        try:
            # Query Pinecone for relevant context using the user's query and selected files
            matches = pinecone_manager.query_index(
                req.query, file_names=req.file_names if req.file_names else None
            )

            # Stream the main answer from the LLM, passing the structured matches
            async for chunk in llm_handler.stream_answer(req.query, matches, req.history):
                yield f"data: {json.dumps({'type': 'token', 'payload': chunk})}\n\n"

            # After the answer, derive the source documents from the matches and stream them
            source_documents = list(set(
                match['metadata']['source'] for match in matches if 'source' in match.get('metadata', {})
            ))
            if source_documents:
                yield f"data: {json.dumps({'type': 'sources', 'payload': source_documents})}\n\n"
            
            # Send a final 'end' message to signal completion
            yield f"data: {json.dumps({'type': 'end', 'payload': 'Stream finished'})}\n\n"

        except Exception as e:
            print(f"Error in stream generator: {e}", file=sys.stderr)
            # Use a more robust error format for the client
            error_payload = json.dumps({'type': 'error', 'payload': f'An internal error occurred: {str(e)}'})
            yield f"data: {error_payload}\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")