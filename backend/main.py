from fastapi import FastAPI, HTTPException, Form, BackgroundTasks, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List, Optional, AsyncGenerator
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv
import os
import sys
import json
import tempfile
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from core import pinecone_manager
from core import llm_handler
from core import processor
from core import database, auth

load_dotenv()

# Initialize database tables on startup
database.create_tables()

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

class ConversationHistory(BaseModel):
    messages: List[dict]

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Auth ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = auth.decode_access_token(token)
    if payload is None:
        raise credentials_exception
    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception
    user = db.query(database.User).filter(database.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

# --- API Endpoints ---
@app.post("/signup", response_model=Token)
def signup(user_data: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(database.User).filter(database.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = database.User(email=user_data.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    access_token = auth.create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(database.User).filter(database.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

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

@app.post("/history")
def save_chat_history(
    conversation: ConversationHistory, 
    db: Session = Depends(database.get_db), 
    current_user: database.User = Depends(get_current_user)
):
    """Saves a full chat conversation to the database."""
    if not conversation.messages:
        raise HTTPException(status_code=400, detail="Cannot save an empty conversation.")
    
    # Create a title from the first user message
    first_user_message = next((msg['text'] for msg in conversation.messages if msg.get('sender') == 'user'), "Untitled Chat")
    title = first_user_message[:100] # Truncate title

    new_conversation = database.ChatConversation(
        title=title,
        messages=conversation.dict()['messages'],
        user_id=current_user.id
    )
    db.add(new_conversation)
    db.commit()
    db.refresh(new_conversation)
    return {"status": "success", "chat_id": new_conversation.id}

@app.get("/history")
def get_all_chat_histories(db: Session = Depends(database.get_db), current_user: database.User = Depends(get_current_user)):
    """Retrieves a list of all saved chat conversations for the current user."""
    conversations = db.query(database.ChatConversation).filter(database.ChatConversation.user_id == current_user.id).order_by(database.ChatConversation.created_at.desc()).all()
    # Return metadata, not the full message history
    return [{"id": c.id, "title": c.title, "created_at": c.created_at} for c in conversations]

@app.get("/history/{chat_id}")
def get_chat_history(chat_id: str, db: Session = Depends(database.get_db), current_user: database.User = Depends(get_current_user)):
    """Retrieves the full message history for a specific chat."""
    conversation = db.query(database.ChatConversation).filter(
        database.ChatConversation.id == chat_id,
        database.ChatConversation.user_id == current_user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Chat not found or you don't have access")
    return conversation

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