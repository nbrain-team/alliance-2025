from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from typing import List, Optional
from dotenv import load_dotenv
import os
import shutil
from core.processor import process_file
from core.pinecone_manager import PineconeManager
from core.llm_handler import LLMHandler

load_dotenv()

app = FastAPI(
    title="ADTV RAG API",
    description="API for ADTV's Retrieval-Augmented Generation platform.",
    version="0.1.0"
)

@app.get("/")
def read_root():
    """
    Root endpoint to check if the API is running.
    """
    return {"status": "ADTV RAG API is running"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...), doc_type: str = Form(...)):
    """
    Uploads a document, processes it, and stores it in Pinecone.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    temp_file_path = f"temp_{file.filename}"

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        chunks = process_file(temp_file_path, file.content_type)

        pinecone_manager = PineconeManager()
        metadata = {"source": file.filename, "doc_type": doc_type}
        pinecone_manager.upsert_chunks(chunks, metadata)

        return {"message": f"Successfully uploaded and processed {file.filename}"}

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