import os
import sys
from datetime import datetime
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import Contact, Opportunity
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_opportunities_from_contacts():
    """Create opportunities for all contacts in the database."""
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("No DATABASE_URL found in environment.")
    
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get all contacts
        contacts = db.query(Contact).all()
        logger.info(f"Found {len(contacts)} contacts to convert to opportunities")
        
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for contact in contacts:
            try:
                # Check if opportunity already exists for this contact
                existing_opp = db.query(Opportunity).filter(
                    Opportunity.contact_id == contact.id
                ).first()
                
                if existing_opp:
                    logger.info(f"Opportunity already exists for {contact.email}")
                    skipped_count += 1
                    continue
                
                # Create new opportunity
                new_opportunity = Opportunity(
                    contact_id=contact.id,
                    company=contact.name,  # Use contact name as company name
                    deal_status="New Lead",  # Default status
                    lead_source="Email Mkt",  # Default source since these came from email list
                    lead_date=datetime.utcnow(),
                    property_type="Multi-Family",  # Default property type
                    deal_value=0,  # Default deal value (in cents)
                    notes=f"Imported from email list on {datetime.utcnow().strftime('%Y-%m-%d')}"
                )
                
                db.add(new_opportunity)
                db.commit()
                created_count += 1
                
                if created_count % 100 == 0:
                    logger.info(f"Created {created_count} opportunities so far...")
                    
            except Exception as e:
                logger.error(f"Error creating opportunity for {contact.email}: {e}")
                error_count += 1
                db.rollback()
                continue
        
        logger.info(f"\nConversion completed!")
        logger.info(f"Successfully created: {created_count} opportunities")
        logger.info(f"Skipped (already exists): {skipped_count} opportunities")
        logger.info(f"Errors: {error_count}")
        
    except Exception as e:
        logger.error(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Starting to create opportunities from contacts...")
    create_opportunities_from_contacts() 