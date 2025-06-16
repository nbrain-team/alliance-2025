# ADTV AI Platform

This project is a centralized, scalable AI platform that can process and retrieve brand knowledge from videos, documents, and customer Q&A logs, using RAG (Retrieval-Augmented Generation), MCP-style orchestration, and Gemini Pro 2.5. The system will allow internal users to query, learn from, and eventually act on company-specific information.

## 🚀 Goal

Create a centralized, scalable AI platform that can process and retrieve brand knowledge from videos, documents, and customer Q&A logs, using RAG (Retrieval-Augmented Generation), MCP-style orchestration, and Gemini Pro 2.5. The system will allow internal users to query, learn from, and eventually act on company-specific information.

## 🧱 Core Components

-   **Model**: Gemini Pro 2.5 (via Vertex AI API)
-   **Vector DB**: Pinecone (upserted via API)
-   **Embedding Model**: Gemini Embeddings or OpenAI ada-002
-   **File Storage**: Google Drive or Render-hosted storage
-   **Transcription**: Gemini Audio-to-Text or Whisper API
-   **Frontend**: React (Notion-style UI)
-   **Backend/API**: Python/FastAPI
-   **Deployment**: Render + GitHub CI/CD