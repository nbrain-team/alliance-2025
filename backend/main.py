from fastapi import FastAPI, UploadFile, File, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional, AsyncGenerator
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import shutil
import sys
from contextlib import asynccontextmanager
from core.processor import process_file
from core.pinecone_manager import PineconeManager
from core.llm_handler import LLMHandler
from core.gcs_manager import GCSManager

load_dotenv()

# --- Application State and Lifespan Management ---
# We store long-lived objects here to avoid re-initializing on every request.
state = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages application startup and shutdown events.
    Initializes expensive objects like database managers here.
    """
    print("Application startup: Initializing service managers...")
    # Initialize to None to indicate they are not ready
    state["pinecone_manager"] = None
    state["gcs_manager"] = None
    state["llm_handler"] = None

    try:
        # Explicitly check for each required environment variable
        required_env_vars = [
            "PINECONE_API_KEY",
            "PINECONE_ENVIRONMENT",
            "PINECONE_INDEX_NAME",
            "GEMINI_API_KEY",
            "GCS_BUCKET_NAME",
            "GOOGLE_APPLICATION_CREDENTIALS",
        ]
        missing_vars = [v for v in required_env_vars if v not in os.environ]
        if missing_vars:
            error_msg = f"CRITICAL ERROR: Missing environment variables: {', '.join(missing_vars)}. Please set them for the 'adtv-backend' service."
            print(error_msg, file=sys.stderr)
            # No need to raise, as managers will fail individually
    except Exception as e:
        print(f"Error checking environment variables: {e}", file=sys.stderr)
    
    # --- Individual Service Initialization with Robust Error Handling ---
    try:
        state["pinecone_manager"] = PineconeManager()
        print("PineconeManager initialized successfully.")
    except Exception as e:
        print(f"FATAL: PineconeManager failed to initialize: {e}", file=sys.stderr)

    try:
        state["gcs_manager"] = GCSManager()
        print("GCSManager initialized successfully.")
    except Exception as e:
        print(f"FATAL: GCSManager failed to initialize: {e}", file=sys.stderr)

    try:
        state["llm_handler"] = LLMHandler()
        print("LLMHandler initialized successfully.")
    except Exception as e:
        print(f"FATAL: LLMHandler failed to initialize: {e}", file=sys.stderr)

    print("Application startup: Initialization sequence complete.")
    
    yield
    
    print("Application shutdown: Cleaning up resources.")
    state.clear()

app = FastAPI(
    title="ADTV RAG API",
    description="API for ADTV's Retrieval-Augmented Generation platform.",
    version="0.1.0",
    lifespan=lifespan
)

# --- CORS Configuration ---
origins = ["*"] 

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    """
    Root endpoint to check if the API is running.
    """
    return {"status": "ADTV RAG API is running"}

class GenerateUploadUrlRequest(BaseModel):
    file_name: str
    content_type: str

def get_manager(manager_name: str):
    """Helper to get a manager from state and handle initialization errors."""
    manager = state.get(manager_name)
    if manager is None:
        raise HTTPException(
            status_code=503, 
            detail=f"The {manager_name.replace('_', ' ').title()} is not available due to a startup error. Please check the server logs for more details."
        )
    return manager

@app.post("/generate-upload-url")
async def generate_upload_url(request: GenerateUploadUrlRequest):
    """
    Generates a pre-signed URL to upload a file directly to GCS.
    """
    try:
        gcs_manager = get_manager("gcs_manager")
        url = gcs_manager.generate_upload_url(
            file_name=request.file_name,
            content_type=request.content_type
        )
        return {"upload_url": url, "file_name": request.file_name}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class NotifyUploadRequest(BaseModel):
    file_name: str
    content_type: str
    doc_type: str

def process_and_index_file(file_name: str, content_type: str, doc_type: str):
    """
    This function runs in the background to process and index the file.
    """
    print(f"BACKGROUND_TASK_STARTED for: {file_name}, content_type: {content_type}")
    temp_file_path = f"temp_{file_name}"
    try:
        gcs_manager = state.get("gcs_manager")
        pinecone_manager = state.get("pinecone_manager")
        
        if not all([gcs_manager, pinecone_manager]):
            print(f"BACKGROUND_TASK_ERROR: One or more service managers were not available during startup. Aborting task for {file_name}.")
            return

        print(f"BACKGROUND_TASK_STEP: Downloading {file_name} from GCS...")
        gcs_manager.download_to_temp_file(file_name, temp_file_path)
        print(f"BACKGROUND_TASK_STEP: Download complete. File at {temp_file_path}")

        print(f"BACKGROUND_TASK_STEP: Processing {file_name} with content_type {content_type}...")
        chunks = process_file(temp_file_path, content_type)
        print(f"BACKGROUND_TASK_STEP: Processing complete. Got {len(chunks)} chunks.")

        if not chunks:
            print(f"BACKGROUND_TASK_WARNING: No chunks were generated for {file_name}. Aborting upsert.")
            return

        print(f"BACKGROUND_TASK_STEP: Upserting {len(chunks)} chunks to Pinecone...")
        metadata = {"source": file_name, "doc_type": doc_type}
        pinecone_manager.upsert_chunks(chunks, metadata)
        print(f"BACKGROUND_TASK_SUCCESS: Successfully processed and indexed {file_name}")

    except Exception as e:
        import traceback
        print(f"BACKGROUND_TASK_ERROR: Error processing {file_name} in background: {repr(e)}")
        traceback.print_exc()
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"BACKGROUND_TASK_FINALLY: Cleaned up temporary file: {temp_file_path}")

@app.post("/notify-upload")
async def notify_upload(request: NotifyUploadRequest, background_tasks: BackgroundTasks):
    """
    Notifies the server that a file has been uploaded to GCS.
    This endpoint returns immediately and processing happens in the background.
    """
    get_manager("gcs_manager")
    get_manager("pinecone_manager")

    background_tasks.add_task(
        process_and_index_file,
        file_name=request.file_name,
        content_type=request.content_type,
        doc_type=request.doc_type
    )
    return {"message": f"File {request.file_name} received. Processing has started in the background."}

@app.get("/documents")
async def get_documents():
    """
    Retrieves a list of all documents from the vector database.
    """
    try:
        pinecone_manager = get_manager("pinecone_manager")
        documents = pinecone_manager.list_documents()
        return documents
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{file_name}")
async def delete_document(file_name: str):
    """
    Deletes a document and all its associated vectors from Pinecone.
    """
    try:
        pinecone_manager = get_manager("pinecone_manager")
        pinecone_manager.delete_document(file_name)
        gcs_manager = get_manager("gcs_manager")
        gcs_manager.delete_file(file_name)
        return {"message": f"Successfully deleted {file_name} from all sources."}
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_documents(query: str = Form(...), file_names: Optional[List[str]] = Form(None)):
    """
    Queries the vector database and streams the response.
    """
    async def stream_answer() -> AsyncGenerator[str, None]:
        try:
            pinecone_manager = get_manager("pinecone_manager")
            llm_handler = get_manager("llm_handler")

            context_chunks = pinecone_manager.query_index(query, file_names=file_names if file_names else None)

            async for chunk in llm_handler.stream_answer(query, context_chunks):
                yield chunk
        except Exception as e:
            print(f"Error in stream_answer: {e}")
            yield f"Error: {str(e)}"

    return StreamingResponse(stream_answer(), media_type="text/event-stream")