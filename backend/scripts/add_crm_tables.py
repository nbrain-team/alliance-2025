import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from core.database import Base, Contact, Opportunity, Activity
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_crm_tables():
    """Add CRM tables to the database."""
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        raise ValueError("No DATABASE_URL found in environment. Please set it.")
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create the tables
        Base.metadata.create_all(bind=engine, tables=[
            Contact.__table__,
            Opportunity.__table__,
            Activity.__table__
        ])
        
        logger.info("Successfully created CRM tables: contacts, opportunities, activities")
        
    except Exception as e:
        logger.error(f"Error creating CRM tables: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    add_crm_tables() 