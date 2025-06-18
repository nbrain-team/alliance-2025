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
from enum import Enum
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
    try:
        # Explicitly check for each required environment variable
        required_env_vars = [
            "PINECONE_API_KEY",
            "PINECONE_ENVIRONMENT",
            "GEMINI_API_KEY",
            "GCS_BUCKET_NAME",
            "GOOGLE_APPLICATION_CREDENTIALS",
        ]
        missing_vars = [v for v in required_env_vars if v not in os.environ]
        if missing_vars:
            error_msg = f"CRITICAL ERROR: Missing environment variables: {', '.join(missing_vars)}. Please set them for the 'adtv-backend' service."
            print(error_msg, file=sys.stderr)
            raise RuntimeError(error_msg)

        print("All required environment variables are present.")

        state["pinecone_manager"] = PineconeManager()
        print("PineconeManager initialized.")
        state["gcs_manager"] = GCSManager()
        print("GCSManager initialized.")
        state["llm_handler"] = LLMHandler()
        print("LLMHandler initialized.")

        print("Application startup: Initialization complete.")
    except Exception as e:
        print(f"FATAL: An error occurred during application startup: {e}", file=sys.stderr)
        # Re-raise the exception to ensure the application does not start in a faulty state
        raise

    yield
    # Code to run on shutdown
    print("Application shutdown: Cleaning up resources.")
    state.clear()

app = FastAPI(
    title="ADTV RAG API",
    description="API for ADTV's Retrieval-Augmented Generation platform.",
    version="0.1.0",
    lifespan=lifespan
)

# --- CORS Configuration ---
# This allows the frontend to communicate with the backend.
# In a production environment, you would want to restrict this to your frontend's domain.
origins = ["*"] # Allow all origins for now

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

class DocType(str, Enum):
    sales_marketing = "sales_marketing"
    q_a = "q_a"
    operations = "operations"
    time_seasonal = "time_seasonal"
    other = "other"

@app.post("/generate-upload-url")
async def generate_upload_url(request: GenerateUploadUrlRequest):
    """
    Generates a pre-signed URL to upload a file directly to GCS.
    """
    try:
        gcs_manager = state["gcs_manager"]
        url = gcs_manager.generate_upload_url(
            file_name=request.file_name,
            content_type=request.content_type
        )
        return {"upload_url": url, "file_name": request.file_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class NotifyUploadRequest(BaseModel):
    file_name: str
    content_type: str
    doc_type: DocType

def process_and_index_file(file_name: str, content_type: str, doc_type: str):
    """
    This function runs in the background to process and index the file.
    """
    print(f"Background task started for: {file_name}")
    temp_file_path = f"temp_{file_name}"
    try:
        gcs_manager = state["gcs_manager"]
        pinecone_manager = state["pinecone_manager"]

        print(f"Downloading {file_name} from GCS...")
        gcs_manager.download_to_temp_file(file_name, temp_file_path)
        print(f"Processing {file_name}...")
        chunks = process_file(temp_file_path, content_type)

        print(f"Upserting {len(chunks)} chunks to Pinecone...")
        metadata = {"source": file_name, "doc_type": doc_type}
        pinecone_manager.upsert_chunks(chunks, metadata)
        print(f"Successfully processed and indexed {file_name}")

    except Exception as e:
        print(f"Error processing {file_name} in background: {e}")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            print(f"Cleaned up temporary file: {temp_file_path}")

@app.post("/notify-upload")
async def notify_upload(request: NotifyUploadRequest, background_tasks: BackgroundTasks):
    """
    Notifies the server that a file has been uploaded to GCS.
    This endpoint returns immediately and processing happens in the background.
    """
    background_tasks.add_task(
        process_and_index_file,
        file_name=request.file_name,
        content_type=request.content_type,
        doc_type=request.doc_type.value
    )
    return {"message": f"File {request.file_name} received. Processing has started in the background."}

@app.get("/documents")
async def get_documents():
    """
    Retrieves a list of all documents from the vector database.
    """
    try:
        pinecone_manager = state["pinecone_manager"]
        documents = pinecone_manager.list_documents()
        return documents
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/documents/{file_name}")
async def delete_document(file_name: str):
    """
    Deletes a document and all its associated vectors from Pinecone.
    """
    try:
        pinecone_manager = state["pinecone_manager"]
        pinecone_manager.delete_document(file_name)
        gcs_manager = state["gcs_manager"]
        gcs_manager.delete_file(file_name)
        return {"message": f"Successfully deleted {file_name} from all sources."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_documents(query: str = Form(...), file_names: Optional[List[str]] = Form(None)):
    """
    Queries the vector database and streams the response.
    """
    async def stream_answer() -> AsyncGenerator[str, None]:
        try:
            pinecone_manager = state["pinecone_manager"]
            llm_handler = state["llm_handler"]

            context_chunks = pinecone_manager.query_index(query, file_names=file_names if file_names else None)

            # Use the streaming method from LLMHandler
            async for chunk in llm_handler.stream_answer(query, context_chunks):
                yield chunk
        except Exception as e:
            print(f"Error in stream_answer: {e}")
            # Yield a final message to indicate an error to the client
            yield f"Error: {str(e)}"

    return StreamingResponse(stream_answer(), media_type="text/event-stream") 