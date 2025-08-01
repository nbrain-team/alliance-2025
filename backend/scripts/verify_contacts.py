import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import Contact
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def verify_contacts():
    """Verify contacts in the database."""
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("No DATABASE_URL found in environment.")
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Count total contacts
        total_contacts = db.query(Contact).count()
        logger.info(f"Total contacts in database: {total_contacts}")
        
        # Show first 10 contacts
        contacts = db.query(Contact).limit(10).all()
        logger.info("\nFirst 10 contacts:")
        for contact in contacts:
            logger.info(f"  - {contact.name} ({contact.email})")
            
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_contacts() 