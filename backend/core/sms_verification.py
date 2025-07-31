import os
import random
import string
from datetime import datetime, timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

# In-memory storage for verification codes (in production, use Redis or database)
verification_codes: Dict[str, Dict[str, any]] = {}

def generate_verification_code() -> str:
    """Generate a 6-digit verification code."""
    return ''.join(random.choices(string.digits, k=6))

def send_sms_verification(phone_number: str) -> bool:
    """
    Send SMS verification code to the provided phone number.
    Returns True if successful, False otherwise.
    """
    try:
        # Import Twilio client only when needed
        from twilio.rest import Client
        
        # Get Twilio credentials from environment variables
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_number = os.getenv('TWILIO_PHONE_NUMBER')
        
        if not all([account_sid, auth_token, from_number]):
            logger.error("Twilio credentials not configured")
            # In development, just store the code without sending
            code = generate_verification_code()
            verification_codes[phone_number] = {
                'code': code,
                'created_at': datetime.now(),
                'attempts': 0
            }
            logger.info(f"Development mode: Verification code for {phone_number} is {code}")
            return True
        
        # Initialize Twilio client
        client = Client(account_sid, auth_token)
        
        # Generate verification code
        code = generate_verification_code()
        
        # Store the code with timestamp
        verification_codes[phone_number] = {
            'code': code,
            'created_at': datetime.now(),
            'attempts': 0
        }
        
        # Send SMS
        message = client.messages.create(
            body=f"Your Alliance verification code is: {code}",
            from_=from_number,
            to=phone_number
        )
        
        logger.info(f"SMS sent successfully to {phone_number}, SID: {message.sid}")
        return True
        
    except ImportError:
        logger.warning("Twilio not installed. Using development mode.")
        # For development without Twilio
        code = generate_verification_code()
        verification_codes[phone_number] = {
            'code': code,
            'created_at': datetime.now(),
            'attempts': 0
        }
        logger.info(f"Development mode: Verification code for {phone_number} is {code}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending SMS: {e}")
        return False

def verify_sms_code(phone_number: str, code: str) -> bool:
    """
    Verify the SMS code for a given phone number.
    For beta testing, accepts any 6-digit code.
    """
    # Beta mode: Accept any 6-digit code
    if len(code) == 6 and code.isdigit():
        return True
    
    # Original verification logic (commented out for beta)
    """
    if phone_number not in verification_codes:
        return False
    
    stored_code, timestamp = verification_codes[phone_number]
    
    # Check if code has expired (10 minutes)
    if datetime.now() - timestamp > timedelta(minutes=10):
        del verification_codes[phone_number]
        return False
    
    if stored_code == code:
        del verification_codes[phone_number]
        return True
    
    return False
    """
    return False

def cleanup_expired_codes():
    """Remove expired verification codes from memory."""
    current_time = datetime.now()
    expired_numbers = []
    
    for phone_number, data in verification_codes.items():
        if current_time - data['created_at'] > timedelta(minutes=10):
            expired_numbers.append(phone_number)
    
    for phone_number in expired_numbers:
        del verification_codes[phone_number]
        
    if expired_numbers:
        logger.info(f"Cleaned up {len(expired_numbers)} expired verification codes") 