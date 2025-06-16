import os
from pinecone import Pinecone as PineconeClient, PodSpec
from langchain_pinecone import Pinecone
from langchain_google_genai import GoogleGenerativeAIEmbeddings

class PineconeManager:
    def __init__(self):
        self.pinecone = PineconeClient(
            api_key=os.environ["PINECONE_API_KEY"]
        )
        self.index_name = "adtv-index"
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=os.environ["GEMINI_API_KEY"]
        )

    def get_or_create_index(self):
        if self.index_name not in self.pinecone.list_indexes().names():
            self.pinecone.create_index(
                name=self.index_name,
                dimension=768,  # Gemini's embedding model dimension
                metric="cosine",
                spec=PodSpec(environment=os.environ["PINECONE_ENVIRONMENT"])
            )
        return self.pinecone.Index(self.index_name)

    def upsert_chunks(self, chunks: list, metadata: dict):
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

    def query_index(self, query: str, top_k: int = 5):
        index = self.get_or_create_index()
        query_embedding = self.embeddings.embed_query(query)
        results = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        return [match['metadata']['text'] for match in results['matches']] 