import os
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import AsyncGenerator
import logging

# Configure comprehensive logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LLMHandler:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=os.environ["GEMINI_API_KEY"]
        )

    async def stream_answer(self, query: str, context: list[str]) -> AsyncGenerator[str, None]:
        """
        Generates an answer using the LLM based on the query and context.
        """
        context_str = "\n".join(context)
        
        logger.info(f"Querying LLM with query: '{query}'")
        if context:
            logger.info(f"Context found for query. Length: {len(context_str)} chars.")
            # To avoid flooding logs, only show the first 500 chars of context
            logger.info(f"Context preview: {context_str[:500]}...")
        else:
            logger.warning("No context found for this query. The response will be based on the LLM's general knowledge.")
        
        prompt_template = f"""
        You are a helpful, brand-aware assistant trained on ADTV materials.
        Always respond in a friendly, knowledgeable tone aligned with American Dream TV's values.

        Here is some reference content:
        {context_str}

        QUESTION: {query}

        Respond clearly and conversationally. Format your response using Markdown, including tables when appropriate.
        """
        
        logger.info("Streaming response from LLM...")
        chunks_received = 0
        try:
            async for chunk in self.llm.astream(prompt_template):
                if chunk.content:
                    chunks_received += 1
                    yield chunk.content
            
            if chunks_received == 0:
                logger.warning("LLM stream finished but no content was received in any chunk.")
            else:
                logger.info(f"LLM stream finished. Total content chunks received: {chunks_received}")

        except Exception as e:
            logger.error(f"An exception occurred during the LLM stream: {e}", exc_info=True)
            yield "Sorry, an error occurred while processing your request." 