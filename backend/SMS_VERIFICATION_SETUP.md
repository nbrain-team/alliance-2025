# SMS Verification Setup Guide

## Overview
The Deal Scorer chatbot includes SMS verification for cell phone numbers using Twilio. This feature is optional and will work in development mode without Twilio credentials.

## Development Mode (No Twilio Required)
If Twilio credentials are not configured, the system will:
1. Generate a 6-digit verification code
2. Log the code to the console
3. Accept the code when entered in the chat

Check your backend logs for messages like:
```
Development mode: Verification code for +1234567890 is 123456
```

## Production Setup with Twilio

### 1. Create a Twilio Account
1. Sign up at https://www.twilio.com
2. Verify your email and phone number
3. Get your free trial phone number

### 2. Get Your Credentials
From the Twilio Console (https://console.twilio.com):
- Account SID: Found on the dashboard
- Auth Token: Found on the dashboard (click to reveal)
- Phone Number: Your Twilio phone number (format: +1234567890)

### 3. Install Twilio SDK
Uncomment the twilio line in `backend/requirements.txt`:
```
# twilio  # Uncomment to enable SMS verification (optional)
```

Then install:
```bash
pip install twilio
```

### 4. Set Environment Variables
Add to your `.env` file:
```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

For Render deployment, add these as environment variables in your service settings.

## How It Works

1. User enters their cell phone number
2. System sends a 6-digit code via SMS
3. User enters the code in the chat
4. System verifies the code and continues if valid

## Security Features

- Codes expire after 10 minutes
- Maximum 5 verification attempts per code
- Codes are removed after successful verification
- In-memory storage (use Redis for production scaling)

## Testing

To test without sending real SMS:
1. Don't set Twilio environment variables
2. Check backend logs for the verification code
3. Enter the code in the chat interface

## Troubleshooting

### "Twilio credentials not configured"
This is normal in development mode. Check logs for the verification code.

### "Failed to send verification code"
- Verify your Twilio credentials are correct
- Check that your Twilio account has SMS capability
- Ensure the phone number format is correct (include country code)

### "That code doesn't match"
- Codes are case-sensitive (numbers only)
- Check if the code has expired (10 minutes)
- Verify you're using the most recent code sent 