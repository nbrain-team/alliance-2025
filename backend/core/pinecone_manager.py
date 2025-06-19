import os
from pinecone import Pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import Pinecone as LangchainPinecone
from typing import List

# --- Environment Setup ---
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL_NAME = "models/embedding-001"
EMBEDDING_DIMENSION = 768

def _get_pinecone_index():
    """Initializes and returns a Pinecone index client."""
    if not PINECONE_API_KEY or not PINECONE_INDEX_NAME:
        raise ValueError("Pinecone API key or index name not set in environment.")
    pc = Pinecone(api_key=PINECONE_API_KEY)
    # Note: We are now assuming the index exists and is configured correctly.
    # The volatile startup process should not be creating/validating indexes.
    return pc.Index(PINECONE_INDEX_NAME)

def _get_embedding_model():
    """Initializes and returns a Gemini embedding model client."""
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key not set in environment.")
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL_NAME,
        google_api_key=GEMINI_API_KEY
    )

def upsert_chunks(chunks: List[str], metadata: dict):
    """
    Embeds text chunks using Google Gemini and upserts them into Pinecone.
    Initializes clients on-the-fly for stability.
    """
    embeddings = _get_embedding_model()
    
    docs_with_metadata = []
    for i, chunk in enumerate(chunks):
        doc_metadata = metadata.copy()
        doc_metadata["text"] = chunk
        docs_with_metadata.append(doc_metadata)

    LangchainPinecone.from_texts(
        texts=chunks,
        embedding=embeddings,
        metadatas=docs_with_metadata,
        index_name=PINECONE_INDEX_NAME
    )

def list_documents():
    """
    Lists all unique documents in the Pinecone index.
    Initializes clients on-the-fly for stability.
    """
    try:
        index = _get_pinecone_index()
        results = index.query(
            vector=[0] * EMBEDDING_DIMENSION,
            top_k=1000,
            include_metadata=True
        )
        
        seen_files = set()
        unique_documents = []
        for match in results.get('matches', []):
            file_name = match.get('metadata', {}).get('source')
            if file_name and file_name not in seen_files:
                unique_documents.append({
                    "name": file_name,
                    "type": match.get('metadata', {}).get('doc_type', 'N/A'),
                    "status": "Ready"
                })
                seen_files.add(file_name)
        return unique_documents
    except Exception as e:
        print(f"Error listing documents from Pinecone: {e}")
        return []

def delete_document(file_name: str):
    """
    Deletes all vectors associated with a specific file_name from the index.
    Initializes clients on-the-fly for stability.
    """
    index = _get_pinecone_index()
    index.delete(filter={"source": file_name})

def query_index(query: str, top_k: int = 5, file_names: List[str] = None):
    """
    Queries the index with a question and returns the most relevant text chunks
    and their source documents.
    Initializes clients on-the-fly for stability.
    """
    index = _get_pinecone_index()
    embeddings = _get_embedding_model()
    
    query_embedding = embeddings.embed_query(query)
    
    filter_metadata = None
    if file_names:
        filter_metadata = {"source": {"$in": file_names}}

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=filter_metadata
    )
    
    matches = results.get('matches', [])
    chunks = [match['metadata']['text'] for match in matches if 'text' in match.get('metadata', {})]
    
    sources = set()
    for match in matches:
        if 'source' in match.get('metadata', {}):
            sources.add(match['metadata']['source'])
            
    return {"chunks": chunks, "sources": list(sources)} 