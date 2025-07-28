#!/usr/bin/env python3
"""
Migration script to add additional_data column to deal_submissions table.
Run this script to update existing databases.
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text, inspect
from core.database import engine, SessionLocal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_additional_data_column():
    """Add additional_data column to deal_submissions table if it doesn't exist."""
    db = SessionLocal()
    try:
        inspector = inspect(engine)
        
        # Check if the table exists
        if not inspector.has_table('deal_submissions'):
            logger.info("Table 'deal_submissions' does not exist. Skipping migration.")
            return
        
        # Check if the column already exists
        columns = [col['name'] for col in inspector.get_columns('deal_submissions')]
        
        if 'additional_data' not in columns:
            logger.info("Adding 'additional_data' column to 'deal_submissions' table...")
            db.execute(text("""
                ALTER TABLE deal_submissions 
                ADD COLUMN additional_data JSON
            """))
            db.commit()
            logger.info("Successfully added 'additional_data' column.")
        else:
            logger.info("Column 'additional_data' already exists. No changes needed.")
            
    except Exception as e:
        logger.error(f"Error during migration: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Starting migration: Adding additional_data column to deal_submissions table")
    add_additional_data_column()
    logger.info("Migration completed successfully!") 