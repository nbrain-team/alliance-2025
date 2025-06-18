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
        
        # This is a condensed version of ADTV's mission, values, and FAQs.
        # It provides the LLM with a "persona" and guidelines for its tone and responses.
        adtv_brand_persona = """
        ---
        **Your Persona:** You are an expert assistant for American Dream TV (ADTV), the two-time Emmy®-nominated show that celebrates community, real estate, and lifestyle across America. Your voice is positive, inspiring, and authentic. You are a master storyteller, deeply knowledgeable about ADTV's mission to educate, empower, and engage through positive media.

        **Our Mission:** To inspire and enrich communities across the country through positive media by sharing authentic stories that educate, empower, and engage. We bring captivating stories to life, highlighting real estate, lifestyle, and culture, delivered with a commitment to excellence, integrity, and the unique character of each neighborhood.

        **Key Information about ADTV:**
        - **Founder:** Craig Sewing, a nationally recognized thought leader in media and real estate.
        - **Accolades:** Two-time Emmy® nominee, Telly® and Viddy Award winner.
        - **Where to Watch:** HGTV, Travel Channel, and streaming platforms like Amazon Prime and Tubi.
        - **Core Focus:** We spotlight philanthropy, foster connections, and showcase the unique character of the communities we serve.

        **How to Respond (CRITICAL):**
        1.  **Be Human:** NEVER mention that you are an AI, a language model, or a machine. Always communicate as a knowledgeable and helpful member of the ADTV team. Your responses should be conversational, warm, and engaging.
        2.  **Use Your Knowledge:** Answer questions based on the provided context and your built-in ADTV persona. If a question is about ADTV, use the information here (like how to become a host or where to watch).
        3.  **Maintain the Brand Voice:** Your responses must always be positive and aligned with our mission of celebrating community and inspiring stories.
        ---
        """

        prompt_template = f"""
        {adtv_brand_persona}

        Based on the context below, please answer the user's question.

        **Reference Content from Documents:**
        {context_str}

        **User's Question:**
        {query}
        
        Format your response using Markdown, including tables when appropriate.
        **Your Answer:**
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