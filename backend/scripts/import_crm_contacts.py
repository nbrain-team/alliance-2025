import os
import sys
import csv
import requests
from dotenv import load_dotenv
import argparse

# Add parent directory to path to import from core
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from core.database import Base, Contact
import logging

# Load environment variables
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def import_contacts_from_csv(csv_file_path):
    """Import contacts from CSV file into the CRM database."""
    
    # Get database URL from environment
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise ValueError("No DATABASE_URL found in environment. Please set it.")
    
    # Create database connection
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Read CSV file
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            
            imported_count = 0
            skipped_count = 0
            error_count = 0
            
            for row in csv_reader:
                try:
                    # Extract email and name from CSV row
                    email = row.get('Email', '').strip()
                    name = row.get('Name', '').strip()
                    
                    # Skip if email is empty
                    if not email:
                        logger.warning(f"Skipping row with empty email")
                        skipped_count += 1
                        continue
                    
                    # Use email as name if name is empty
                    if not name:
                        name = email.split('@')[0]
                    
                    # Check if contact already exists
                    existing_contact = db.query(Contact).filter(Contact.email == email).first()
                    if existing_contact:
                        logger.info(f"Contact already exists: {email}")
                        skipped_count += 1
                        continue
                    
                    # Create new contact
                    new_contact = Contact(
                        name=name,
                        email=email
                    )
                    
                    db.add(new_contact)
                    db.commit()
                    imported_count += 1
                    
                    if imported_count % 100 == 0:
                        logger.info(f"Imported {imported_count} contacts so far...")
                    
                except Exception as e:
                    logger.error(f"Error importing contact {row}: {e}")
                    error_count += 1
                    db.rollback()
                    continue
            
            logger.info(f"\nImport completed!")
            logger.info(f"Successfully imported: {imported_count} contacts")
            logger.info(f"Skipped (already exists): {skipped_count} contacts")
            logger.info(f"Errors: {error_count} contacts")
            
    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Import contacts from CSV to CRM')
    parser.add_argument('csv_file', nargs='?', 
                       default="/Users/dannydemichele/alliance-2025/alliance-2025/crm1.csv",
                       help='Path to CSV file containing contacts')
    
    args = parser.parse_args()
    csv_file_path = args.csv_file
    
    if not os.path.exists(csv_file_path):
        logger.error(f"CSV file not found: {csv_file_path}")
        sys.exit(1)
    
    logger.info(f"Starting import from: {csv_file_path}")
    import_contacts_from_csv(csv_file_path) 