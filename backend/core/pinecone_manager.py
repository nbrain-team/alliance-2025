import os
from pinecone import Pinecone as PineconeClient, PodSpec
from langchain_pinecone import Pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from typing import List

class PineconeManager:
    def __init__(self):
        self.api_key = os.getenv("PINECONE_API_KEY")
        self.environment = os.getenv("PINECONE_ENVIRONMENT")
        self.index_name = os.getenv("PINECONE_INDEX_NAME")

        if not all([self.api_key, self.environment, self.index_name]):
            raise ValueError("Pinecone API key, environment, or index name not set.")

        pinecone.init(api_key=self.api_key, environment=self.environment)
        
        if self.index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=self.index_name,
                dimension=768, 
                metric='cosine'
            )
        self.index = pinecone.Index(self.index_name)

        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=os.environ["GEMINI_API_KEY"]
        )

    def get_or_create_index(self):
        if self.index_name not in pinecone.list_indexes():
            pinecone.create_index(
                name=self.index_name,
                dimension=768,  # Gemini's embedding model dimension
                metric="cosine",
                spec=PodSpec(environment=self.environment)
            )
        return pinecone.Index(self.index_name)

    def upsert_chunks(self, chunks: List[str], metadata: dict):
        index = self.get_or_create_index()
        
        # Add the text of each chunk to its metadata
        docs_with_metadata = []
        for i, chunk in enumerate(chunks):
            doc_metadata = metadata.copy()
            doc_metadata["text"] = chunk
            docs_with_metadata.append(doc_metadata)

        Pinecone.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            metadatas=docs_with_metadata,
            index_name=self.index_name
        )

    def list_documents(self):
        index = self.get_or_create_index()
        # This is a bit of a hack to get all documents, as Pinecone doesn't have a direct "list all" with metadata.
        # We query for a vector of zeros and get a large number of results.
        # This might not be suitable for extremely large indexes, but works for thousands of docs.
        try:
            results = index.query(
                vector=[0] * 768, # Gemini embedding dimension
                top_k=1000, # Adjust as needed
                include_metadata=True
            )
            
            # Deduplicate based on file name
            seen_files = set()
            unique_documents = []
            for match in results['matches']:
                file_name = match['metadata'].get('source')
                if file_name and file_name not in seen_files:
                    unique_documents.append({
                        "name": file_name,
                        "type": match['metadata'].get('doc_type', 'N/A'),
                        "status": "Ready" # Assuming all indexed docs are ready
                    })
                    seen_files.add(file_name)
            return unique_documents
        except Exception as e:
            print(f"Error listing documents from Pinecone: {e}")
            return []

    def delete_document(self, file_name: str):
        index = self.get_or_create_index()
        index.delete(filter={"source": file_name})

    def query_index(self, query: str, top_k: int = 5, file_names: list[str] | None = None):
        index = self.get_or_create_index()
        query_embedding = self.embeddings.embed_query(query)
        
        filter_metadata = None
        if file_names:
            filter_metadata = {"source": {"$in": file_names}}

        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_metadata
        )
        return [match['metadata']['text'] for match in results['matches']] 