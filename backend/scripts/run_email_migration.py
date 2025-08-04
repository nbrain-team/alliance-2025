import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from core.database import Base
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_migration():
    """Add email campaign tables to the database."""
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        raise ValueError("No DATABASE_URL found in environment. Please set it.")
    
    engine = create_engine(DATABASE_URL)
    
    try:
        # Import the models to ensure they're registered with Base
        from core.email_campaigns import EmailCampaign, EmailTemplate, campaign_recipients
        
        # Create all tables (this is safe - it won't recreate existing tables)
        Base.metadata.create_all(bind=engine)
        
        logger.info("Successfully ensured all database tables exist, including email campaign tables")
        
    except Exception as e:
        logger.error(f"Error creating tables: {e}")
        raise

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    run_migration() 