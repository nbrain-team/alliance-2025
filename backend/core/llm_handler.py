import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import HumanMessage, AIMessage, SystemMessage
from typing import AsyncGenerator, List, Dict, Optional, Tuple
import logging
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
import json
from fastapi.concurrency import run_in_threadpool
from . import pinecone_manager

# Configure comprehensive logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def preprocess_query_for_synonyms(query: str) -> str:
    """
    Preprocesses the query to expand mortgage-related terms with their synonyms.
    This helps find relevant information regardless of which term is used.
    """
    # Define mortgage-related synonyms
    mortgage_terms = {
        'mortgage': ['mortgage', 'loan', 'note', 'debt', 'financing'],
        'mortgages': ['mortgages', 'loans', 'notes', 'debts', 'financing'],
        'loan': ['mortgage', 'loan', 'note', 'debt', 'financing'],
        'loans': ['mortgages', 'loans', 'notes', 'debts', 'financing'],
        'note': ['mortgage', 'loan', 'note', 'debt', 'financing'],
        'notes': ['mortgages', 'loans', 'notes', 'debts', 'financing'],
    }
    
    # Check if query contains any mortgage-related terms
    query_lower = query.lower()
    expanded_query = query
    
    for term, synonyms in mortgage_terms.items():
        if term in query_lower:
            # Add a note about synonyms to help the search
            synonym_str = ' OR '.join(synonyms)
            expanded_query = f"{query} (including {synonym_str})"
            break
    
    return expanded_query

# Query classification prompt
QUERY_CLASSIFIER_PROMPT = """
You are a query classification agent. Analyze the user's question and classify it as either:
1. "simple" - A straightforward factual question looking for a specific piece of information (dates, names, amounts, etc.)
2. "complex" - A question requiring analysis, comparison, or synthesis of multiple pieces of information

Examples of simple queries:
- "When does the lease expire?"
- "What is the monthly rent?"
- "Who is the property manager?"
- "What are the CAM charges?"

Examples of complex queries:
- "Analyze the financial performance of the property"
- "Compare the lease terms across multiple properties"
- "What are the risks associated with this investment?"
- "Provide a comprehensive overview of the property"

User's Question: {query}

Respond with ONLY one word: "simple" or "complex"
"""

# Simple query prompt - for direct, concise answers
SIMPLE_QUERY_PROMPT = """
You are a property information assistant. Your task is to find and provide a DIRECT, CONCISE answer to the user's specific question.

**User's Question:** {query}

**Retrieved Information:**
{context}

**Instructions:**
1. Find the EXACT answer to the question in the provided information
2. Respond with ONLY the specific fact requested - no explanations, no analysis, no additional context
3. If you cannot find the exact answer, say "Information not found in documents"
4. For dates: provide just the date
5. For amounts: provide just the number/amount
6. For names: provide just the name
7. For yes/no questions: answer just "Yes" or "No"

**Important Note about Financial Terms:**
- The terms "mortgage", "loan", "note", "debt", and "financing" often refer to the same thing (money borrowed on a property)
- If asked about any of these terms, check for information about ALL of them
- For example, if asked about "mortgage", also look for information about "loan" or "note"

Remember: Be EXTREMELY concise. Your entire response should typically be 1-10 words.
"""

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

# Synthesis prompt for complex queries
SYNTHESIS_PROMPT_TEMPLATE = """
You are a helpful real estate investment assistant. Based on the gathered evidence below, provide a comprehensive and accurate answer to the user's question.

**User's Original Question:** {original_query}

**Gathered Evidence:**
{evidence}

**Instructions:**
1. Synthesize the information from all sub-questions to provide a complete answer
2. Structure your response clearly with appropriate formatting
3. Include specific details, numbers, dates, and facts from the evidence
4. If information is missing or unclear, acknowledge this honestly
5. Cite sources naturally within your response when mentioning specific facts
6. Use tables or lists where appropriate to organize information clearly

**Important Note about Financial Terms:**
- The terms "mortgage", "loan", "note", "debt", and "financing" are often used interchangeably in real estate
- They all refer to money borrowed against a property
- When discussing any of these terms, consider information about all of them as relevant

Provide a thorough, well-organized response that directly addresses the user's question.
"""

def get_llm():
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        google_api_key=os.environ["GEMINI_API_KEY"],
        max_output_tokens=8192,
        temperature=0.7,
        streaming=True
    )

async def classify_query(query: str) -> str:
    """
    Classifies a query as 'simple' or 'complex'
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-1.5-pro",
        google_api_key=os.environ["GEMINI_API_KEY"],
        max_output_tokens=10,
        temperature=0.0
    )
    
    prompt = ChatPromptTemplate.from_template(QUERY_CLASSIFIER_PROMPT)
    chain = prompt | llm | StrOutputParser()
    
    try:
        classification = await chain.ainvoke({"query": query})
        classification = classification.strip().lower()
        if classification in ["simple", "complex"]:
            logger.info(f"Query classified as: {classification}")
            return classification
        else:
            logger.warning(f"Invalid classification: {classification}. Defaulting to complex.")
            return "complex"
    except Exception as e:
        logger.error(f"Error classifying query: {e}")
        return "complex"

async def handle_simple_query(
    query: str, properties: Optional[List[str]]
) -> AsyncGenerator[Dict, None]:
    """
    Handles simple factual queries with direct, concise answers
    """
    logger.info("Handling simple query")
    llm = get_llm()
    
    # Preprocess query for mortgage-related synonyms
    expanded_query = preprocess_query_for_synonyms(query)
    
    # For simple queries, search more broadly to find the specific document
    # Look for documents that might contain the answer based on common naming patterns
    search_queries = [
        expanded_query,  # Expanded query with synonyms
        query,  # Original query as fallback
        "lease terms lease agreement commercial lease extract",  # Common lease documents
        "property summary financial summary rent roll",  # Financial documents
        "property information details specifications"  # General property info
    ]
    
    all_matches = []
    all_sources = set()
    
    for search_q in search_queries:
        matches = await run_in_threadpool(
            pinecone_manager.query_index,
            query=search_q,
            top_k=10,  # Get more results for simple queries
            properties=properties
        )
        if matches:
            all_matches.extend(matches)
            sources = {m.get('metadata', {}).get('source', 'Unknown') for m in matches}
            all_sources.update(sources)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_matches = []
    for match in all_matches:
        match_id = match.get('id')
        if match_id not in seen:
            seen.add(match_id)
            unique_matches.append(match)
    
    # Format context
    context_texts = []
    for match in unique_matches[:15]:  # Limit to top 15 chunks
        source = match.get('metadata', {}).get('source', 'Unknown')
        text = match.get('metadata', {}).get('text', '')
        context_texts.append(f"[Source: {source}]\n{text}")
    
    context = "\n\n---\n\n".join(context_texts)
    
    # Generate response
    prompt = ChatPromptTemplate.from_template(SIMPLE_QUERY_PROMPT)
    chain = prompt | llm | StrOutputParser()
    
    async for chunk in chain.astream({"query": query, "context": context}):
        yield {"content": chunk}
    
    yield {"sources": list(all_sources)}

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
    
    # Preprocess query for mortgage-related synonyms
    expanded_query = preprocess_query_for_synonyms(query)
    
    # First, classify the query
    query_type = await classify_query(query)
    
    if query_type == "simple":
        # Handle simple queries with direct answers
        async for chunk in handle_simple_query(query, properties):
            yield chunk
    else:
        # Handle complex queries with the full pipeline
        llm = get_llm()
        
        # 1. Decompose the query (use expanded query for better decomposition)
        sub_questions = await decompose_query_to_sub_questions(expanded_query, llm)
        
        # 2. Gather evidence for each sub-question
        evidence_list = []
        all_sources = set()
        
        for i, sub_q in enumerate(sub_questions):
            logger.info(f"Step {i+1}/{len(sub_questions)}: Retrieving context for sub-question: '{sub_q}'")
            
            # Also expand sub-questions for mortgage terms
            expanded_sub_q = preprocess_query_for_synonyms(sub_q)
            
            matches = await run_in_threadpool(
                pinecone_manager.query_index,
                query=expanded_sub_q,
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