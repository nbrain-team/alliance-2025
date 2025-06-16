from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import shutil
from core.processor import process_file
from core.pinecone_manager import PineconeManager
from core.llm_handler import LLMHandler
from core.gcs_manager import GCSManager

load_dotenv()

app = FastAPI(
    title="ADTV RAG API",
    description="API for ADTV's Retrieval-Augmented Generation platform.",
    version="0.1.0"
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

@app.post("/generate-upload-url")
async def generate_upload_url(request: GenerateUploadUrlRequest):
    """
    Generates a pre-signed URL to upload a file directly to GCS.
    """
    try:
        gcs_manager = GCSManager()
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
    doc_type: str

@app.post("/notify-upload")
async def notify_upload(request: NotifyUploadRequest):
    """
    Notifies the server that a file has been uploaded to GCS,
    so it can be processed and indexed.
    """
    temp_file_path = f"temp_{request.file_name}"
    try:
        gcs_manager = GCSManager()
        gcs_manager.download_to_temp_file(request.file_name, temp_file_path)

        chunks = process_file(temp_file_path, request.content_type)

        pinecone_manager = PineconeManager()
        metadata = {"source": request.file_name, "doc_type": request.doc_type}
        pinecone_manager.upsert_chunks(chunks, metadata)

        return {"message": f"Successfully processed {request.file_name}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@app.get("/documents")
async def get_documents():
    """
    Retrieves a list of all documents from the vector database.
    """
    try:
        pinecone_manager = PineconeManager()
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
        pinecone_manager = PineconeManager()
        pinecone_manager.delete_document(file_name)
        return {"message": f"Successfully deleted {file_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query")
async def query_documents(query: str = Form(...), file_names: Optional[List[str]] = Form(None)):
    """
    Queries the vector database for a given question and returns a generated answer.
    Can be filtered by a list of file names.
    """
    try:
        pinecone_manager = PineconeManager()
        context_chunks = pinecone_manager.query_index(query, file_names=file_names)

        llm_handler = LLMHandler()
        answer = llm_handler.generate_answer(query, context_chunks)
        
        return {"answer": answer, "context": context_chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 