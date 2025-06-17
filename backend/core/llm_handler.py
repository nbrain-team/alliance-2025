import os
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import AsyncGenerator

class LLMHandler:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-pro",
            google_api_key=os.environ["GEMINI_API_KEY"]
        )

    async def stream_answer(self, query: str, context: list[str]) -> AsyncGenerator[str, None]:
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

        Respond clearly and conversationally. Format your response using Markdown, including tables when appropriate.
        """
        
        async for chunk in self.llm.astream(prompt_template):
            yield chunk.content 