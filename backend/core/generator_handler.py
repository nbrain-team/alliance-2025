import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.schema import SystemMessage, HumanMessage
import pandas as pd
import io
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

GENERATOR_PERSONA = """
You are an expert-level marketing and sales copywriter. Your task is to rewrite a piece of core content for a specific individual based on their data.
You must seamlessly weave the user's data into the core content to make it feel personal, natural, and compelling.
The final output should ONLY be the personalized text. Do not add any extra greetings, commentary, or sign-offs.
"""

async def process_csv_and_generate_content(
    csv_file: io.BytesIO,
    key_fields: list[str],
    core_content: str,
    tone: str,
    style: str,
    is_preview: bool = False
) -> pd.DataFrame:
    """
    Reads a CSV file, generates personalized content for each row using an LLM,
    and returns a DataFrame with the new content.
    """
    try:
        df = pd.read_csv(csv_file)
        target_df = df.head(1) if is_preview else df

        if len(df) > 1000:
            raise ValueError("CSV file cannot contain more than 1000 rows.")

        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-pro",
            google_api_key=os.environ.get("GEMINI_API_KEY"),
            temperature=0.7,
            max_output_tokens=8192
        )
        
        generated_contents = []
        total_rows = len(target_df)
        logger.info(f"Starting content generation for {total_rows} rows...")

        for index, row in target_df.iterrows():
            logger.info(f"Processing row {index + 1}/{total_rows}")
            
            # Step 1: Perform direct replacement for key fields
            temp_content = core_content
            for field in key_fields:
                placeholder = f"{{{{{field}}}}}"
                if placeholder in temp_content and field in row:
                    temp_content = temp_content.replace(placeholder, str(row[field]))
            
            # Step 2: Prepare contextual data for the AI
            # Exclude key_fields from the context to avoid redundancy
            contextual_data = {k: v for k, v in row.items() if k not in key_fields}
            context_str = ", ".join([f"{k}: '{v}'" for k, v in contextual_data.items()])
            
            # Step 3: Construct the new, more intelligent prompt
            prompt = f"""
Your Task:
You are an expert copywriter. Your goal is to rewrite and personalize the 'Smart Template' below.
Use the 'Contextual Data' provided to make the message highly relevant to the recipient.
Do NOT simply list the data. Instead, weave the information naturally into the template to make it sound personal and compelling.
Maintain the core message and offer of the original template.

**Contextual Data for This Prospect:**
---
{context_str}
---

**Smart Template to Personalize:**
---
{temp_content}
---

**Instructions:**
- The final tone of your writing must be: {tone}
- The final output style must be a: {style}
- IMPORTANT: The output should ONLY be the final rewritten text. Do not add any of your own commentary, greetings, or sign-offs.
"""
            
            messages = [
                SystemMessage(content=GENERATOR_PERSONA),
                HumanMessage(content=prompt)
            ]
            
            try:
                response = await llm.ainvoke(messages)
                generated_text = response.content
                generated_contents.append(generated_text)
                logger.info(f"Successfully generated content for row {index + 1}")
            except Exception as e:
                logger.error(f"LLM failed for row {index + 1}. Error: {e}. Appending empty string.")
                generated_contents.append("")

        target_df['ai_generated_content'] = generated_contents
        logger.info(f"Finished content generation for all {total_rows} rows.")
        return target_df

    except Exception as e:
        logger.error(f"Error processing CSV file: {e}")
        raise 