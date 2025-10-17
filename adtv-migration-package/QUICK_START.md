# Quick Start Guide

Get the ADTV Event Automation platform running in 15 minutes.

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 12+ (local) OR Render account
- Git

## Option 1: Local Development Setup (5 minutes)

### 1. Install Dependencies

```bash
# Server
cd apps/server
pnpm install

# Frontend
cd ../web
pnpm install
```

### 2. Configure Environment

```bash
# Copy template
cd apps/server
cp ../../env.template .env

# Edit .env - Minimum required:
DATABASE_URL=postgresql://user:password@localhost:5432/adtv_events
JWT_SECRET=$(openssl rand -base64 32)
```

### 3. Setup Database

```bash
# Create database
createdb adtv_events

# Run migrations
cd apps/server
pnpm prisma migrate deploy

# Verify
pnpm prisma studio
```

### 4. Start Services

```bash
# Terminal 1: Backend
cd apps/server
pnpm dev
# Server runs on http://localhost:4000

# Terminal 2: Frontend
cd apps/web
pnpm dev
# App runs on http://localhost:5173
```

### 5. Test

```bash
# Health check
curl http://localhost:4000/health
# Expected: {"ok":true}

# Open browser
open http://localhost:5173
```

**Done!** Platform is running locally.

---

## Option 2: Render Deployment (15 minutes)

### 1. Create Database

1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Name: `adtv-events-db`
4. Plan: Free (for testing)
5. Click "Create Database"
6. Copy "Internal Database URL"

### 2. Deploy Backend

1. Click "New +" → "Web Service"
2. Connect your Git repository
3. Configure:
   - **Name**: `adtv-events-server`
   - **Root Directory**: `apps/server`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`
   - **Plan**: Starter ($7/mo)
4. Add Environment Variables:
   ```
   DATABASE_URL=[Your database Internal URL]
   JWT_SECRET=[Generate with: openssl rand -base64 32]
   PORT=4000
   PUBLIC_BASE_URL=https://adtv-events-server.onrender.com
   ```
5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)

### 3. Deploy Frontend

1. Click "New +" → "Static Site"
2. Connect same repository
3. Configure:
   - **Name**: `adtv-events-web`
   - **Root Directory**: `apps/web`
   - **Build Command**: `pnpm install && pnpm build`
   - **Publish Directory**: `dist`
4. Add Environment Variable:
   ```
   VITE_API_URL=https://adtv-events-server.onrender.com
   ```
5. Click "Create Static Site"
6. Wait for build (3-5 minutes)

### 4. Test Deployment

```bash
# Test backend
curl https://adtv-events-server.onrender.com/health

# Test frontend
open https://adtv-events-web.onrender.com
```

**Done!** Platform is deployed to production.

---

## Option 3: Standalone API Integration (3 minutes)

Just want to use the API from your existing app? No full deployment needed.

### 1. Copy API Client

```bash
# Copy this file to your project
cp adtv-migration-package/INTEGRATION_EXAMPLES.md your-project/docs/
```

### 2. Create Client Wrapper

```typescript
// your-project/src/services/adtv.ts

export class ADTVClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async createCampaign(data: any) {
    const res = await fetch(`${this.baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
  
  async sendSms(to: string, text: string) {
    const res = await fetch(`${this.baseUrl}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text })
    });
    return res.json();
  }
}

// Usage
const adtv = new ADTVClient('https://adtv-events-server.onrender.com');
```

### 3. Use in Your App

```typescript
// Create campaign
const campaign = await adtv.createCampaign({
  name: 'My Event',
  ownerName: 'John Doe',
  ownerEmail: 'john@example.com',
  eventType: 'Virtual',
  eventDate: '2025-12-01T10:00:00Z'
});

// Send SMS
await adtv.sendSms('+1234567890', 'Hello from my app!');
```

**Done!** You're using ADTV API from your app.

---

## Next Steps

### Essential Configuration

#### Add SMS Provider (Recommended)

```bash
# Choose Bonzo or Twilio
# Add to .env:
SMS_PROVIDER=bonzo
BONZO_API_KEY=your_key_here
# ... other Bonzo vars from env.template
```

#### Add Email Provider (Recommended)

```bash
# Gmail example
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password  # Not your regular password!
```

**Get Gmail App Password**:
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to https://myaccount.google.com/apppasswords
4. Generate app password
5. Use that password as `SMTP_PASS`

### Optional Features

#### Voicemail Drops

```bash
VOICEMAIL_PROVIDER=slybroadcast
SLYBROADCAST_USERNAME=your@email.com
SLYBROADCAST_PASSWORD=your_password
SLYBROADCAST_CALLER_ID=+1XXXXXXXXXX

# For TTS generation
ELEVENLABS_API_KEY=your_key
ELEVENLABS_VOICE_ID=voice_id
```

#### Gmail OAuth (Inbox Sync)

```bash
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-server.onrender.com/api/auth/google/callback
```

---

## Common Tasks

### Create Admin User

```bash
curl -X POST https://adtv-events-server.onrender.com/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "secure_password",
    "role": "admin"
  }'
```

### Test SMS Sending

```bash
curl -X POST https://adtv-events-server.onrender.com/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","text":"Test message"}'
```

### Import Content Templates

Templates in `templates.csv` auto-load on first API call:

```bash
curl https://adtv-events-server.onrender.com/api/content-templates
```

### Check Analytics

```bash
curl https://adtv-events-server.onrender.com/api/stats
```

---

## Troubleshooting

### Database Connection Error

```bash
# Verify DATABASE_URL is correct
cd apps/server
npx prisma db execute --stdin <<< "SELECT 1;"
```

### SMS Not Sending

```bash
# Check provider configured
echo $SMS_PROVIDER

# Test with mock (no credentials needed)
unset SMS_PROVIDER
# Restart server
```

### Build Fails

```bash
# Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

### Port Already in Use

```bash
# Find process
lsof -i :4000

# Kill process
kill -9 [PID]

# Or use different port
PORT=4001 pnpm dev
```

---

## Documentation

| File | Purpose |
|------|---------|
| `SETUP_INSTRUCTIONS.md` | Complete setup guide with all details |
| `INTEGRATION_EXAMPLES.md` | Code examples for integration |
| `MIGRATION_CHECKLIST.md` | Step-by-step checklist |
| `ARCHITECTURE_OVERVIEW.md` | System design and architecture |
| `env.template` | Environment variables template |

---

## Support

**Questions?** Check the comprehensive docs:
- Setup issues → `SETUP_INSTRUCTIONS.md` → Troubleshooting
- Integration → `INTEGRATION_EXAMPLES.md`
- Architecture → `ARCHITECTURE_OVERVIEW.md`

**Still stuck?** Review recent chat history or contact your development team.

---

✨ **You're all set! Start building with ADTV!** ✨


