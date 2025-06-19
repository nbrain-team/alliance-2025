import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import AsyncGenerator, List, Dict
import logging

# Configure comprehensive logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# This is a condensed version of ADTV's mission, values, and FAQs.
# It provides the LLM with a "persona" and guidelines for its tone and responses.
ADTV_BRAND_PERSONA = """
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

async def stream_answer(query: str, context: list[str], history: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """
    Generates an answer using the LLM based on the query, context, and chat history.
    Initializes a new LLM client for each call to ensure stability.
    """
    logger.info("Initializing new LLM client for this request.")
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=os.environ["GEMINI_API_KEY"]
    )

    context_str = "\n".join(context)
    
    # --- Construct the message history for the LLM ---
    # Combine persona and context into a single system message for the Gemini API.
    system_prompt_parts = [ADTV_BRAND_PERSONA]
    if context:
        system_prompt_parts.append(f"Please use the following context from our documents to answer the user's question:\n<context>\n{context_str}\n</context>")
    
    final_system_prompt = "\n\n".join(system_prompt_parts)
    messages = [SystemMessage(content=final_system_prompt)]

    # Add past conversation history
    for message in history:
        if message.get("sender") == "user":
            messages.append(HumanMessage(content=message.get("text", "")))
        elif message.get("sender") == "ai":
            messages.append(AIMessage(content=message.get("text", "")))

    # Add the current user query
    messages.append(HumanMessage(content=query))
    
    logger.info(f"Querying LLM with query: '{query}' and {len(history)} previous messages.")
    
    logger.info("Streaming response from LLM...")
    chunks_received = 0
    try:
        async for chunk in llm.astream(messages):
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