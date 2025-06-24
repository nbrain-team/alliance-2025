import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import AsyncGenerator, List, Dict, Optional
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json
from fastapi.concurrency import run_in_threadpool
from . import pinecone_manager

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

SYNTHESIS_PROMPT_TEMPLATE = """
You are a Senior Financial Analyst AI. Your task is to provide a comprehensive, expert-level answer to the user's original question based on the evidence gathered from a series of sub-questions.

**User's Original Question:**
{original_query}

**Evidence Gathered (from document sources):**
{evidence}

**Instructions:**
1.  Review all the evidence provided.
2.  Construct a final, synthesized response that directly answers the user's original question.
3.  **Prioritize Precision**: Your primary goal is to extract and present concrete, factual data from the evidence. When the user asks for things like fees, amounts, names, or dates, you must find and include the exact figures and text from the provided sources. Do not summarize this data away.
4.  Do not just list the evidence; analyze it, compare and contrast findings, and identify patterns or key insights.
5.  For every piece of information you use, you MUST cite its source document, which is provided with each piece of evidence (e.g., "[Source: document_name.pdf]").
6.  If the evidence for a sub-question was insufficient or not found, explicitly state that in your analysis.
7.  Ensure your final output is well-structured, clear, and meets the standards of an experienced financial professional. **Use markdown tables to present tabular data** (such as financial summaries, lists of fees, or comparisons) to enhance readability and professionalism.

**Final Synthesized Report:**
"""

def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        google_api_key=os.environ["GEMINI_API_KEY"],
        max_output_tokens=8192,
        temperature=0.7,
        streaming=True
    )

async def decompose_query_to_sub_questions(query: str, llm: ChatGoogleGenerativeAI) -> List[str]:
    """
    Uses the LLM to break down a complex user query into a list of simpler sub-questions.
    """
    logger.info(f"Decomposing query: '{query}'")
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", DECOMPOSITION_PROMPT),
        ("human", query)
    ])
    
    # Temporarily disable streaming for this specific, non-streaming call
    non_streaming_llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        google_api_key=os.environ["GEMINI_API_KEY"],
        max_output_tokens=1024, # Smaller limit for decomposition
        temperature=0.0 # Low temp for deterministic output
    )

    chain = prompt | non_streaming_llm | StrOutputParser()
    
    try:
        response_str = await chain.ainvoke({"query": query})
        logger.info(f"Decomposition response from LLM: {response_str}")
        
        cleaned_response = response_str.strip().replace("```json", "").replace("```", "").strip()
        sub_questions = json.loads(cleaned_response)
        
        if isinstance(sub_questions, list) and all(isinstance(q, str) for q in sub_questions):
            logger.info(f"Successfully decomposed query into {len(sub_questions)} sub-questions.")
            return sub_questions
        else:
            logger.warning("Decomposition did not return a list of strings. Falling back to original query.")
            return [query]
            
    except Exception as e:
        logger.error(f"An unexpected error occurred during query decomposition: {e}", exc_info=True)
        return [query]

async def run_agentic_rag_pipeline(
    query: str, history: List[Dict[str, str]], properties: Optional[List[str]]
) -> AsyncGenerator[Dict, None]:
    """
    Orchestrates the multi-step agentic RAG process.
    """
    logger.info("--- Starting Agentic RAG Pipeline ---")
    llm = get_llm()
    
    # 1. Decompose the query
    sub_questions = await decompose_query_to_sub_questions(query, llm)
    
    # 2. Gather evidence for each sub-question
    evidence_list = []
    all_sources = set()
    
    for i, sub_q in enumerate(sub_questions):
        logger.info(f"Step {i+1}/{len(sub_questions)}: Retrieving context for sub-question: '{sub_q}'")
        matches = await run_in_threadpool(
            pinecone_manager.query_index,
            query=sub_q,
            top_k=5, # Retrieve 5 chunks per sub-question
            properties=properties
        )
        
        context_for_q = ""
        if matches:
            sources = {m.get('metadata', {}).get('source', 'Unknown') for m in matches}
            all_sources.update(sources)
            # Format context with sources for the final prompt
            texts_with_sources = [
                f"{m.get('metadata', {}).get('text', '')} [Source: {m.get('metadata', {}).get('source', 'Unknown')}]"
                for m in matches
            ]
            context_for_q = "\n".join(texts_with_sources)
        
        evidence_list.append(f"Sub-Question: {sub_q}\nEvidence:\n{context_for_q if context_for_q else 'No relevant information found in documents.'}")

    # 3. Synthesize the final answer
    logger.info("Synthesizing final answer from all gathered evidence.")
    
    synthesis_prompt = ChatPromptTemplate.from_template(SYNTHESIS_PROMPT_TEMPLATE)
    
    synthesis_chain = synthesis_prompt | llm | StrOutputParser()
    
    final_prompt_input = {
        "original_query": query,
        "evidence": "\n\n---\n\n".join(evidence_list)
    }

    # 4. Stream the final response
    async for chunk in synthesis_chain.astream(final_prompt_input):
        yield {"content": chunk}
        
    # 5. Yield the consolidated sources at the end
    yield {"sources": list(all_sources)}
    
    logger.info("--- Agentic RAG Pipeline Finished ---")

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