from fastapi import FastAPI, UploadFile, File, HTTPException
from dotenv import load_dotenv
import os
import shutil
from core.processor import process_file
from core.pinecone_manager import PineconeManager

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
async def upload_document(file: UploadFile = File(...)):
    """
    Uploads a document, processes it, and stores it in Pinecone.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file name provided.")

    file_extension = file.filename.split(".")[-1]
    temp_file_path = f"temp_{file.filename}"

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        chunks = process_file(temp_file_path, file_extension)

        pinecone_manager = PineconeManager()
        metadata = {"source": file.filename}
        pinecone_manager.upsert_chunks(chunks, metadata)

        return {"message": f"Successfully uploaded and processed {file.filename}"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path) 