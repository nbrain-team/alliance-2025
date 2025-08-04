import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from core.database import Base
from core.email_campaigns import EmailCampaign, EmailTemplate, campaign_recipients
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_email_campaign_tables():
    """Add email campaign tables to the database."""
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        raise ValueError("No DATABASE_URL found in environment. Please set it.")
    
    engine = create_engine(DATABASE_URL)
    
    try:
        # Create the tables
        Base.metadata.create_all(bind=engine, tables=[
            EmailCampaign.__table__,
            EmailTemplate.__table__,
            campaign_recipients
        ])
        
        logger.info("Successfully created email campaign tables: email_campaigns, email_templates, campaign_recipients")
        
    except Exception as e:
        logger.error(f"Error creating email campaign tables: {e}")
        raise

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    add_email_campaign_tables() 