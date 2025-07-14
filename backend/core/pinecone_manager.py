import os
from pinecone import Pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import Pinecone as LangchainPinecone
from typing import List
import logging

# --- Environment Setup ---
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
PINECONE_ENV = os.getenv("PINECONE_ENVIRONMENT")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL_NAME = "models/embedding-001"
EMBEDDING_DIMENSION = 768

logger = logging.getLogger(__name__)

def _get_pinecone_index():
    """Initializes and returns a Pinecone index client."""
    if not PINECONE_API_KEY or not PINECONE_INDEX_NAME or not PINECONE_ENV:
        raise ValueError("Pinecone API key, index name, or environment not set in environment.")
    
    pc = Pinecone(api_key=PINECONE_API_KEY, environment=PINECONE_ENV)
    
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
        index_name=os.getenv("PINECONE_INDEX_NAME")
    )

def list_documents(property: str = None):
    """
    Lists all unique documents in the Pinecone index.
    If a property is provided, it filters for documents with that property.
    Initializes clients on-the-fly for stability.
    """
    try:
        index = _get_pinecone_index()
        
        filter_metadata = None
        if property:
            filter_metadata = {"property": property}

        # Query a single vector to get a large set of results to inspect metadata
        # This is a workaround since Pinecone doesn't have a direct "list all metadata" function
        results = index.query(
            vector=[0] * EMBEDDING_DIMENSION, # Dummy vector
            top_k=1000, # Adjust K to be large enough to find all unique sources
            include_metadata=True,
            filter=filter_metadata
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

def query_index(query: str, top_k: int = 10, file_names: List[str] = None, properties: List[str] = None):
    """
    Queries the index with a question and returns the most relevant text chunks
    and their source documents.
    Initializes clients on-the-fly for stability.
    """
    index = _get_pinecone_index()
    embeddings = _get_embedding_model()
    
    query_embedding = embeddings.embed_query(query)
    
    filter_metadata = {}
    if file_names:
        filter_metadata["source"] = {"$in": file_names}
    if properties:
        filter_metadata["property"] = {"$in": properties}

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=filter_metadata if filter_metadata else None
    )
    
    return results.get('matches', [])

def get_all_property_documents(properties: List[str]) -> List[str]:
    """
    Gets all document names associated with the given properties.
    Useful for comprehensive searches within a property's documents.
    """
    try:
        index = _get_pinecone_index()
        
        filter_metadata = {"property": {"$in": properties}} if properties else None
        
        # Query with a dummy vector to get all documents for the property
        results = index.query(
            vector=[0] * EMBEDDING_DIMENSION,
            top_k=1000,  # Get many results
            include_metadata=True,
            filter=filter_metadata
        )
        
        # Extract unique document names
        doc_names = set()
        for match in results.get('matches', []):
            source = match.get('metadata', {}).get('source')
            if source:
                doc_names.add(source)
        
        return list(doc_names)
    except Exception as e:
        logger.error(f"Error getting property documents: {e}")
        return [] 