from fastapi import FastAPI, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from typing import List, Optional, AsyncGenerator
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import sys
import json

from core import pinecone_manager
from core import gcs_manager
from core import llm_handler
from core.processor import process_file

load_dotenv()

app = FastAPI(
    title="ADTV RAG API",
    description="API for ADTV's Retrieval-Augmented Generation platform.",
    version="0.1.0",
)

# --- CORS Configuration ---
# Allow all origins for simplicity in this setup.
# In a production environment, you would restrict this to your frontend's domain.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    """
    Handles ALL CORS pre-flight OPTIONS requests.
    This is a robust way to ensure that our gateway doesn't
    time out and return a 502 error on pre-flight checks.
    """
    return Response(status_code=204)

@app.get("/")
def read_root():
    """Root endpoint to check if the API is running."""
    return {"status": "ADTV RAG API is running"}

class GenerateUploadUrlRequest(BaseModel):
    file_name: str
    content_type: str

@app.post("/generate-upload-url")
async def generate_upload_url(request: GenerateUploadUrlRequest):
    """Generates a pre-signed URL to upload a file directly to GCS."""
    try:
        url = gcs_manager.generate_upload_url(
            file_name=request.file_name,
            content_type=request.content_type
        )
        return {"upload_url": url, "file_name": request.file_name}
    except Exception as e:
        print(f"Error generating upload URL: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

class NotifyUploadRequest(BaseModel):
    file_name: str
    content_type: str
    doc_type: str

def process_and_index_file(file_name: str, content_type: str, doc_type: str):
    """
    This function runs in the background to process and index the file.
    It's designed to be completely self-contained.
    """
    print(f"BACKGROUND_TASK: Starting for {file_name}")
    temp_file_path = f"temp_{file_name}"
    try:
        print(f"BACKGROUND_TASK: Downloading {file_name} from GCS...")
        gcs_manager.download_to_temp_file(file_name, temp_file_path)

        print(f"BACKGROUND_TASK: Processing {file_name}...")
        chunks = process_file(temp_file_path, content_type)
        if not chunks:
            print(f"BACKGROUND_TASK: No chunks found for {file_name}. Aborting.")
            return

        print(f"BACKGROUND_TASK: Upserting {len(chunks)} chunks to Pinecone...")
        metadata = {"source": file_name, "doc_type": doc_type}
        pinecone_manager.upsert_chunks(chunks, metadata)
        print(f"BACKGROUND_TASK: Successfully processed and indexed {file_name}")

    except Exception as e:
        print(f"BACKGROUND_TASK_ERROR: {e}", file=sys.stderr)
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"BACKGROUND_TASK: Cleaned up temporary file {temp_file_path}")

@app.post("/notify-upload")
async def notify_upload(request: NotifyUploadRequest, background_tasks: BackgroundTasks):
    """Notifies the server that a file has been uploaded."""
    background_tasks.add_task(
        process_and_index_file,
        file_name=request.file_name,
        content_type=request.content_type,
        doc_type=request.doc_type
    )
    return {"message": "File processing started in the background."}

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
    """Deletes a document from Pinecone and GCS."""
    try:
        pinecone_manager.delete_document(file_name)
        gcs_manager.delete_file(file_name)
        return {"message": f"Successfully deleted {file_name}."}
    except Exception as e:
        print(f"Error deleting document {file_name}: {e}", file=sys.stderr)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_documents(query: str = Form(...),
                        file_names: Optional[List[str]] = Form(None),
                        history: str = Form("[]")):
    """Queries the vector database and streams the LLM response."""
    try:
        chat_history = json.loads(history)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in 'history' field.")

    async def stream_generator() -> AsyncGenerator[str, None]:
        try:
            query_result = pinecone_manager.query_index(
                query, file_names=file_names if file_names else None
            )
            context_chunks = query_result.get("chunks", [])
            source_documents = query_result.get("sources", [])

            # Stream the main answer from the LLM
            async for chunk in llm_handler.stream_answer(query, context_chunks, chat_history):
                yield f"data: {json.dumps({'type': 'token', 'payload': chunk})}\n\n"

            # After the answer, stream the source documents
            if source_documents:
                yield f"data: {json.dumps({'type': 'sources', 'payload': source_documents})}\n\n"

        except Exception as e:
            print(f"Error in stream generator: {e}", file=sys.stderr)
            yield f"data: {json.dumps({'type': 'error', 'payload': str(e)})}\n\n"

    return StreamingResponse(stream_generator(), media_type="text/event-stream")