import os
import pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import Pinecone as LangchainPinecone
from typing import List

class PineconeManager:
    def __init__(self):
        # --- Get credentials from environment variables ---
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.pinecone_environment = os.getenv("PINECONE_ENVIRONMENT")
        self.pinecone_index_name = os.getenv("PINECONE_INDEX_NAME")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")

        # --- Validate that all credentials are set ---
        if not all([self.pinecone_api_key, self.pinecone_environment, self.pinecone_index_name, self.gemini_api_key]):
            raise ValueError("One or more required environment variables are not set.")

        # --- Initialize Pinecone client ---
        pinecone.init(api_key=self.pinecone_api_key, environment=self.pinecone_environment)

        # --- Create index if it doesn't exist ---
        if self.pinecone_index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=self.pinecone_index_name,
                dimension=768,  # Gemini's embedding model dimension
                metric='cosine'
            )
        
        self.index = pinecone.Index(self.pinecone_index_name)

        # --- Initialize Google Gemini embeddings model ---
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=self.gemini_api_key
        )

    def upsert_chunks(self, chunks: List[str], metadata: dict):
        """
        Embeds text chunks using Google Gemini and upserts them into Pinecone.
        """
        # Add the text of each chunk to its metadata for storage
        docs_with_metadata = []
        for i, chunk in enumerate(chunks):
            doc_metadata = metadata.copy()
            doc_metadata["text"] = chunk
            docs_with_metadata.append(doc_metadata)

        # Use the LangchainPinecone integration to embed and upsert
        LangchainPinecone.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            metadatas=docs_with_metadata,
            index_name=self.pinecone_index_name
        )

    def list_documents(self):
        """
        Lists all unique documents in the Pinecone index.
        """
        try:
            # Query for a vector of zeros to get a broad sample of documents
            results = self.index.query(
                vector=[0] * 768,  # Gemini embedding dimension
                top_k=1000,
                include_metadata=True
            )
            
            # Deduplicate results based on the 'source' metadata
            seen_files = set()
            unique_documents = []
            if results['matches']:
                for match in results['matches']:
                    file_name = match['metadata'].get('source')
                    if file_name and file_name not in seen_files:
                        unique_documents.append({
                            "name": file_name,
                            "type": match['metadata'].get('doc_type', 'N/A'),
                            "status": "Ready"
                        })
                        seen_files.add(file_name)
            return unique_documents
        except Exception as e:
            print(f"Error listing documents from Pinecone: {e}")
            return []

    def delete_document(self, file_name: str):
        """
        Deletes all vectors associated with a specific file_name from the index.
        """
        self.index.delete(filter={"source": file_name})

    def query_index(self, query: str, top_k: int = 5, file_names: List[str] = None):
        """
        Queries the index with a question and returns the most relevant text chunks.
        """
        query_embedding = self.embeddings.embed_query(query)
        
        filter_metadata = None
        if file_names:
            filter_metadata = {"source": {"$in": file_names}}

        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_metadata
        )
        # Return only the text content from the metadata of matching vectors
        return [match['metadata']['text'] for match in results.get('matches', [])] 