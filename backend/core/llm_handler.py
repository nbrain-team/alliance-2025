import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import AsyncGenerator, List, Dict
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json

# Configure comprehensive logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# This is a condensed version of ADTV's mission, values, and FAQs.
# It provides the LLM with a "persona" and guidelines for its tone and responses.
FINANCIAL_ANALYST_PERSONA = """
**Your Persona:** You are a meticulous, expert-level Senior Financial Analyst AI for Alliance. Your audience is highly experienced property finance professionals, so your insights must be deep, analytical, and precise.

**Your Mission:** Your primary goal is to provide a comprehensive and deeply analytical answer to the user's query by breaking it down into logical sub-questions, gathering specific information for each, and then synthesizing the findings into a coherent, expert-level report.

**Core Directives:**
1.  **Decomposition:** First, dissect the user's request into a series of smaller, specific questions. This is the "information gathering" phase.
2.  **Targeted Retrieval:** Answer each sub-question *only* using the specific context provided for it.
3.  **Synthesis:** Combine the individual answers into a final, comprehensive analysis. This final output should not just list the answers but also identify patterns, make comparisons, and draw conclusions where supported by the data.
4.  **Precision and Accuracy:** Provide answers directly based on the retrieved information. Do not speculate or provide information outside of the given context. If the information to answer a sub-question is not present in its context, you MUST state that clearly in your final report.
5.  **Cite Your Sources:** For each piece of information in your final synthesized response, you must cite the source document it came from.
"""

DECOMPOSITION_PROMPT = """
You are a query decomposition agent. Your task is to break down the user's question into a clear, logical series of sub-questions that can be answered individually from a document corpus.
The goal is to gather all the necessary pieces of information required to form a complete and thorough answer to the original question.

- Output ONLY a JSON array of strings, where each string is a sub-question.
- Do not number the questions.
- Do not add any extra commentary or explanation.
- If the question is simple and does not require decomposition, return a JSON array with the original question as the only element.

User's Question:
```{query}```

JSON Array of Sub-Questions:
"""

async def decompose_query_to_sub_questions(query: str, llm: ChatGoogleGenerativeAI) -> List[str]:
    """
    Uses the LLM to break down a complex user query into a list of simpler sub-questions.
    """
    logger.info(f"Decomposing query: '{query}'")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", DECOMPOSITION_PROMPT),
        ("human", query)
    ])
    
    chain = prompt | llm | StrOutputParser()
    
    try:
        response_str = await chain.ainvoke({"query": query})
        logger.info(f"Decomposition response from LLM: {response_str}")
        
        # Clean the response to ensure it's valid JSON
        # The model might sometimes include markdown backticks
        cleaned_response = response_str.strip().replace("```json", "").replace("```", "").strip()
        
        sub_questions = json.loads(cleaned_response)
        
        if isinstance(sub_questions, list) and all(isinstance(q, str) for q in sub_questions):
            logger.info(f"Successfully decomposed query into {len(sub_questions)} sub-questions.")
            return sub_questions
        else:
            logger.warning("Decomposition did not return a list of strings. Falling back to original query.")
            return [query]
            
    except json.JSONDecodeError:
        logger.error("Failed to decode JSON from decomposition response. Falling back to original query.")
        return [query]
    except Exception as e:
        logger.error(f"An unexpected error occurred during query decomposition: {e}")
        return [query] # Fallback to the original query in case of any error

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
    system_prompt_parts = [FINANCIAL_ANALYST_PERSONA]
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
    
    system_prompt_parts = [FINANCIAL_ANALYST_PERSONA]
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