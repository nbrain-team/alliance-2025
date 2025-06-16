import os
from pinecone import Pinecone as PineconeClient, PodSpec
from langchain_pinecone import Pinecone
from langchain_openai import OpenAIEmbeddings

class PineconeManager:
    def __init__(self):
        self.pinecone = PineconeClient(
            api_key=os.environ["PINECONE_API_KEY"]
        )
        self.index_name = "adtv-index"
        self.embeddings = OpenAIEmbeddings(model="text-embedding-ada-002")

    def get_or_create_index(self):
        if self.index_name not in self.pinecone.list_indexes().names():
            self.pinecone.create_index(
                name=self.index_name,
                dimension=1536,  # OpenAI's ada-002 model
                metric="cosine",
                spec=PodSpec(environment=os.environ["PINECONE_ENVIRONMENT"])
            )
        return self.pinecone.Index(self.index_name)

    def upsert_chunks(self, chunks: list, metadata: dict):
        index = self.get_or_create_index()
        Pinecone.from_texts(
            texts=chunks,
            embedding=self.embeddings,
            metadatas=[metadata] * len(chunks),
            index_name=self.index_name
        ) 