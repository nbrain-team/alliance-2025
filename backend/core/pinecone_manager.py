import os
from pinecone import Pinecone, ServerlessSpec
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

        # --- Define model and dimension ---
        self.embedding_model_name = "models/embedding-001"
        self.embedding_dimension = 768  # Gemini's embedding-001 model dimension

        # --- Validate that all credentials are set ---
        if not all([self.pinecone_api_key, self.pinecone_environment, self.pinecone_index_name, self.gemini_api_key]):
            raise ValueError("One or more required environment variables are not set.")

        # --- Initialize Pinecone client (new method) ---
        self.pc = Pinecone(api_key=self.pinecone_api_key)

        # --- Create or update index ---
        if self.pinecone_index_name not in self.pc.list_indexes().names():
            print(f"Creating new Pinecone index: '{self.pinecone_index_name}' with dimension {self.embedding_dimension}")
            self.pc.create_index(
                name=self.pinecone_index_name,
                dimension=self.embedding_dimension,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region=self.pinecone_environment
                )
            )
        else: # If index exists, check dimension and recreate if it doesn't match
            index_description = self.pc.describe_index(self.pinecone_index_name)
            if index_description.dimension != self.embedding_dimension:
                print(f"Index '{self.pinecone_index_name}' has dimension {index_description.dimension}, but code requires {self.embedding_dimension}.")
                print("Deleting and recreating index to fix mismatch.")
                self.pc.delete_index(self.pinecone_index_name)
                self.pc.create_index(
                    name=self.pinecone_index_name,
                    dimension=self.embedding_dimension,
                    metric='cosine',
                    spec=ServerlessSpec(
                        cloud='aws',
                        region=self.pinecone_environment
                    )
                )
        
        self.index = self.pc.Index(self.pinecone_index_name)

        # --- Initialize Google Gemini embeddings model ---
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model=self.embedding_model_name,
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
                vector=[0] * self.embedding_dimension,
                top_k=1000,
                include_metadata=True
            )
            
            # Deduplicate results based on the 'source' metadata
            seen_files = set()
            unique_documents = []
            for match in results.get('matches', []):
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