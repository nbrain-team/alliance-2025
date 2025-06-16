import os
from langchain_google_vertexai import VertexAI

class LLMHandler:
    def __init__(self):
        self.llm = VertexAI(
            model_name="gemini-pro",
            project=os.environ.get("GOOGLE_CLOUD_PROJECT_ID"),
            credentials=None # Uses Application Default Credentials
        )

    def generate_answer(self, query: str, context: list[str]) -> str:
        """
        Generates an answer using the LLM based on the query and context.
        """
        context_str = "\n".join(context)
        
        prompt_template = f"""
        You are a helpful, brand-aware assistant trained on ADTV materials.
        Always respond in a friendly, knowledgeable tone aligned with American Dream TV's values.

        Here is some reference content:
        {context_str}

        QUESTION: {query}

        Respond clearly and conversationally.
        """
        
        response = self.llm.invoke(prompt_template)
        return response 