import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import AsyncGenerator, List, Dict
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Configure comprehensive logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# This is a condensed version of ADTV's mission, values, and FAQs.
# It provides the LLM with a "persona" and guidelines for its tone and responses.
ADTV_BRAND_PERSONA = """
**Your Persona:** You are a helpful and professional AI assistant for Alliance. Your tone should be clear, confident, and knowledgeable. You are an expert in the information provided to you.

**Your Mission:** Your primary goal is to provide accurate and relevant answers based on the context provided from the user's documents. You should assist users by synthesizing information and answering their questions efficiently.

**Guidelines:**
1.  **Be Direct and Accurate:** Provide answers directly based on the retrieved information. Do not speculate or provide information outside of the given context.
2.  **Cite Your Sources:** When you use information from a document, always cite the source file name.
3.  **Maintain Your Persona:** All responses should be professional and aligned with the role of a helpful assistant for Alliance.
4.  **Handle "I don't know":** If the answer is not in the provided context, state that you don't have enough information to answer the question. Do not try to guess.
"""

async def stream_answer(query: str, matches: list, history: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """
    Generates an answer using the LLM based on the query, context, and chat history.
    Initializes a new LLM client for each call to ensure stability.
    """
    logger.info("Initializing new LLM client for this request.")
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        google_api_key=os.environ["GEMINI_API_KEY"],
        max_output_tokens=8192,
        temperature=0.7
    )

    context_str = ""
    if matches:
        chunks_by_source = {}
        for match in matches:
            source = match.get('metadata', {}).get('source', 'Unknown Source')
            text = match.get('metadata', {}).get('text', '')
            if source not in chunks_by_source:
                chunks_by_source[source] = []
            chunks_by_source[source].append(text)

        formatted_chunks = []
        for source, texts in chunks_by_source.items():
            source_header = f"--- Context from document: {source} ---"
            source_content = "\n".join(f"- {text}" for text in texts)
            formatted_chunks.append(f"{source_header}\n{source_content}")
        
        context_str = "\n\n".join(formatted_chunks)
    
    # --- Construct the message history for the LLM ---
    # Combine persona and context into a single system message for the Gemini API.
    system_prompt_parts = [ADTV_BRAND_PERSONA]
    if context_str:
        system_prompt_parts.append(f"CRITICAL: You MUST use the following context to answer the user's question. If the answer is not here, you MUST state that you could not find the information in the documents.\\n\\n<context>\\n{context_str}\\n</context>")
    
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

def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        google_api_key=os.environ["GEMINI_API_KEY"],
        max_output_tokens=8192,
        temperature=0.7
    )

def create_conversational_chain(llm, context, history_str):
    """Creates the LangChain conversational chain."""
    
    system_prompt_parts = [ADTV_BRAND_PERSONA]
    if context:
        system_prompt_parts.append(
            "The user has provided the following context from their documents to answer the question:\\n--- CONTEXT ---\\n{context}\\n--- END CONTEXT ---"
        )
    if history_str:
        system_prompt_parts.append(
            "You are in a conversation. Here is the history:\n--- HISTORY ---\n{history}\n--- END HISTORY ---"
        )

    system_prompt_parts.append("Now, answer the user's question: {query}")
    
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", "\n\n".join(system_prompt_parts)),
    ])
    
    return prompt_template | llm | StrOutputParser() 