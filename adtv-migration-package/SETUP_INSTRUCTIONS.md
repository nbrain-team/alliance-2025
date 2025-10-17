# ADTV Event Automation - Migration & Integration Guide

## 📋 Table of Contents
1. [Platform Overview](#platform-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Environment Variables](#environment-variables)
5. [Database Schema](#database-schema)
6. [Integration Steps](#integration-steps)
7. [API Endpoints](#api-endpoints)
8. [Render Deployment](#render-deployment)
9. [Testing & Verification](#testing--verification)
10. [Troubleshooting](#troubleshooting)

---

## 📦 Platform Overview

**ADTV Event Automation** is a comprehensive campaign management and multi-channel communication platform designed for event marketing. It provides:

- **Campaign Management**: Create and manage event campaigns with templates
- **Multi-Channel Outreach**: SMS (Bonzo/Twilio), Email (SMTP/Gmail), Voicemail Drops (Slybroadcast)
- **Contact Management**: Import, track, and manage event prospects
- **Conversation Tracking**: Unified inbox for SMS and email conversations
- **Analytics Dashboard**: Campaign performance metrics and engagement tracking
- **Template System**: Reusable communication templates with version control
- **Funnel Builder**: Visual workflow builder with drag-and-drop nodes

---

## 🛠 Tech Stack

### Backend (Server)
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Package Manager**: pnpm
- **Key Dependencies**:
  - `@prisma/client` - Database ORM
  - `express` - Web framework
  - `cors` - CORS middleware
  - `jsonwebtoken` - Authentication
  - `bcryptjs` - Password hashing
  - `twilio` - SMS provider (fallback)
  - `nodemailer` - Email sending
  - `googleapis` - Gmail OAuth integration
  - `papaparse` - CSV parsing
  - `zod` - Runtime type validation

### Frontend (Web)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Charts**: Chart.js + react-chartjs-2
- **Flow Diagrams**: ReactFlow (for funnel builder)
- **Package Manager**: pnpm

### External Services
- **Bonzo** - Primary SMS provider with prospect management
- **Twilio** - Backup SMS provider with webhooks
- **Slybroadcast** - Voicemail drop service
- **ElevenLabs** - Text-to-speech for voicemail generation
- **Google OAuth** - Gmail integration for email sync

---

## 🏗 Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Vite)                    │
│  - Campaign Builder   - Inbox    - Analytics  - Templates   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────────────┐
│                   Backend (Express/Node)                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   API Routes (Express)                              │    │
│  │   - Auth & Users   - Campaigns   - Templates        │    │
│  │   - Contacts       - Messages    - Analytics        │    │
│  └───────┬──────────────────────────────────┬──────────┘    │
│          │                                   │               │
│  ┌───────▼────────┐                 ┌───────▼──────────┐    │
│  │   Services     │                 │   Prisma ORM     │    │
│  │ - SMS Provider │                 │   (Database)     │    │
│  │ - Email        │                 └───────┬──────────┘    │
│  │ - Voicemail    │                         │               │
│  │ - TTS          │                         │               │
│  └───────┬────────┘                         │               │
└──────────┼──────────────────────────────────┼───────────────┘
           │                                   │
    ┌──────▼───────┐                  ┌───────▼────────┐
    │   External   │                  │   PostgreSQL   │
    │   Services   │                  │    Database    │
    │ - Bonzo      │                  │                │
    │ - Twilio     │                  └────────────────┘
    │ - Slycast    │
    │ - ElevenLabs │
    │ - Gmail API  │
    └──────────────┘
```

### Key Features Architecture

**1. Campaign System**
- Templates define reusable workflow graphs (nodes + edges)
- Campaigns clone template graphs and allow customization
- Campaign execution processes nodes sequentially based on edges
- Template versioning for tracking modifications

**2. Multi-Channel Communication**
- Unified message logging across SMS/Email/Voicemail
- Provider abstraction layer (supports multiple SMS providers)
- Merge tag system for personalization ({{contact.first_name}}, etc.)
- Webhook handlers for inbound SMS

**3. Contact Management**
- CSV bulk import with deduplication
- Status tracking throughout funnel stages
- Automatic conversation creation per contact
- Bonzo prospect sync and opt-in management

---

## 🔐 Environment Variables

### Required Core Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Authentication
JWT_SECRET=your_secret_key_here

# Server Configuration
PORT=4000
PUBLIC_BASE_URL=https://your-domain.onrender.com

# Frontend Build Variables
VITE_API_URL=https://your-api-domain.onrender.com
```

### SMS Configuration (Choose One or Both)

#### Bonzo (Primary)
```bash
SMS_PROVIDER=bonzo
BONZO_API_BASE_URL=https://app.getbonzo.com/api
BONZO_API_KEY=your_bonzo_jwt_token
BONZO_AUTH_HEADER=Authorization
BONZO_AUTH_SCHEME=Bearer
BONZO_FROM_NUMBER=+1XXXXXXXXXX
BONZO_ON_BEHALF_OF=your@email.com
BONZO_SEND_AS=me
BONZO_SEND_PATH=/v3/prospects/create-or-update-and-message
```

#### Twilio (Fallback)
```bash
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1XXXXXXXXXX
# OR use messaging service
TWILIO_MESSAGING_SERVICE_SID=MGxxxxx
```

### Email Configuration

```bash
# SMTP (General Email Sending)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your@email.com
SMTP_PASS=your_app_password

# Google OAuth (Gmail Integration - Optional)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=https://your-domain.onrender.com/api/auth/google/callback
```

### Voicemail Configuration

```bash
VOICEMAIL_PROVIDER=slybroadcast
SLYBROADCAST_API_BASE_URL=https://www.mobile-sphere.com/gateway/vmb.php
SLYBROADCAST_USERNAME=your@email.com
SLYBROADCAST_PASSWORD=your_password
SLYBROADCAST_CALLER_ID=+1XXXXXXXXXX
SLYBROADCAST_DEFAULT_AUDIO_URL=https://example.com/fallback.mp3
```

### Text-to-Speech (For Voicemail)

```bash
ELEVENLABS_API_KEY=your_api_key
ELEVENLABS_VOICE_ID=WzEaNiZ7hcVOsge5QDNT
ELEVENLABS_MODEL_ID=eleven_flash_v2_5
```

### Webhook Security (Optional)

```bash
BONZO_WEBHOOK_TOKEN=your_secure_token
```

---

## 🗄 Database Schema

### Core Models

**User** - BDRs and admins with channel credentials
```typescript
- id: String (cuid)
- email: String (unique)
- name: String
- role: String (bdr | admin)
- passwordHash: String
- phone: String?
- smsFromNumber: String?      // Personal SMS sender
- vmCallerId: String?          // Voicemail caller ID
- smtpHost/Port/User/Pass     // Personal SMTP config
- googleAccessToken/RefreshToken  // Gmail OAuth
```

**Campaign** - Event campaign instances
```typescript
- id: String
- name: String
- ownerName/Email/Phone: String
- eventType: String (In-Person | Virtual)
- eventDate: DateTime
- launchDate: DateTime?
- city, state: String?
- videoLink, eventLink, calendlyLink: String?
- hotelName, hotelAddress: String?
- status: String (draft | active | completed)
- templateId: String?          // Reference to base template
- senderUserId: String?        // BDR assigned to campaign
- totalContacts: Int
- enrichedContacts: Int
- emailsGenerated: Int
```

**Contact** - Campaign prospects
```typescript
- id: String
- campaignId: String
- name: String
- email, phone: String?
- company, city, state, url: String?
- status: String (No Activity | Needs BDR | Received RSVP | etc.)
- stageKey: String?            // Position in funnel graph
- rawJson: String?             // Original import data
```

**Template** - Reusable campaign workflows
```typescript
- id: String
- name: String
- status: String (draft | active)
- version: Int
- nodes: Node[]                // Graph nodes
- edges: Edge[]                // Graph connections
```

**Node** - Template/Campaign workflow node
```typescript
- id: String
- templateId OR campaignId: String
- key: String                  // Graph identifier (e.g., "N10")
- type: String                 // stage | sms_send | email_send | voicemail_drop | wait
- name: String
- configJson: String?          // Node-specific config
- posX, posY: Float?          // Canvas position
```

**Edge** - Workflow connection
```typescript
- id: String
- templateId OR campaignId: String
- fromKey, toKey: String       // Node connections
- conditionJson: String?       // Conditional routing
```

**Conversation** - Message thread per contact
```typescript
- id: String
- contactId: String
- channel: String (sms | email)
- messages: Message[]
```

**Message** - Individual message
```typescript
- id: String
- conversationId: String
- direction: String (in | out)
- text: String
- subject: String?
- provider: String?            // smtp | twilio | bonzo | gmail | slybroadcast
- providerMessageId: String?
- providerThreadId: String?
- createdAt: DateTime
```

**ContentTemplate** - Reusable message templates
```typescript
- id: String
- type: String (email | sms | voicemail)
- name: String
- subject: String?             // For email
- body: String?                // For email
- text: String?                // For SMS
- ttsScript: String?           // For voicemail
```

**TemplateVersion** - Campaign-specific modifications
```typescript
- id: String
- baseTemplateId: String
- campaignId: String?
- versionName: String
- description: String?
- nodesJson: String            // Serialized nodes
- edgesJson: String            // Serialized edges
```

---

## 🔌 Integration Steps

### Step 1: Copy Code to New Project

```bash
# Create directory structure
mkdir -p your-project/apps/server
mkdir -p your-project/apps/web

# Copy server code
cp -r adtv-migration-package/apps/server/* your-project/apps/server/

# Copy frontend code
cp -r adtv-migration-package/apps/web/* your-project/apps/web/

# Copy root files
cp adtv-migration-package/templates.csv your-project/
cp adtv-migration-package/.env.example your-project/.env
```

### Step 2: Install Dependencies

```bash
# Server dependencies
cd your-project/apps/server
pnpm install

# Web dependencies
cd ../web
pnpm install
```

### Step 3: Database Setup

```bash
cd your-project/apps/server

# Create .env with DATABASE_URL
echo "DATABASE_URL=postgresql://user:pass@host:5432/dbname" > .env

# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate deploy

# Or push schema directly (development)
pnpm prisma db push
```

### Step 4: Configure Environment Variables

Create `/apps/server/.env`:

```bash
# Copy all required variables from "Environment Variables" section above
# Customize with your actual credentials
DATABASE_URL=postgresql://...
JWT_SECRET=your_generated_secret
PUBLIC_BASE_URL=https://your-server.onrender.com
SMS_PROVIDER=bonzo
# ... rest of configuration
```

Create `/apps/web/.env`:

```bash
VITE_API_URL=https://your-server.onrender.com
```

### Step 5: Test Locally

```bash
# Terminal 1 - Start backend
cd apps/server
pnpm dev

# Terminal 2 - Start frontend
cd apps/web
pnpm dev
```

Visit `http://localhost:5173` to verify the app loads.

### Step 6: Integration with Existing Project

#### Option A: Separate Services (Recommended)
Deploy as standalone services and integrate via API calls:

```typescript
// In your existing project
const adtvApi = {
  baseUrl: 'https://adtv-server.onrender.com',
  
  async createCampaign(data: CampaignData) {
    const response = await fetch(`${this.baseUrl}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  },
  
  async sendSms(to: string, text: string) {
    const response = await fetch(`${this.baseUrl}/api/sms/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text })
    });
    return response.json();
  }
};
```

#### Option B: Monorepo Integration
If your project uses a monorepo structure:

1. Add as workspace packages:
```json
// your-project/package.json
{
  "workspaces": [
    "packages/*",
    "apps/adtv-server",
    "apps/adtv-web"
  ]
}
```

2. Share database if compatible:
   - Merge Prisma schemas
   - Run migrations
   - Update imports

3. Share authentication:
   - Use same JWT_SECRET
   - Implement shared auth middleware
   - Sync user models

#### Option C: Module Integration
Extract specific features as npm packages:

```bash
# Create shared package
mkdir packages/adtv-messaging
cp apps/server/src/services/* packages/adtv-messaging/

# In your existing project
import { sendSms } from '@yourorg/adtv-messaging';
```

---

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with email/password |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/google/initiate` | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | OAuth callback |

### Campaigns

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/campaigns` | List all campaigns |
| POST | `/api/campaigns` | Create new campaign |
| PATCH | `/api/campaigns/:id` | Update campaign |
| GET | `/api/campaigns/:id/contacts` | Get campaign contacts |
| POST | `/api/campaigns/:id/contacts/bulk` | Bulk import contacts |
| GET | `/api/campaigns/:id/graph` | Get campaign workflow |
| GET | `/api/campaigns/:id/stats` | Get campaign analytics |
| POST | `/api/campaigns/:id/execute` | Execute campaign sends |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List all templates |
| POST | `/api/templates` | Create template |
| GET | `/api/templates/:id` | Get template details |
| PUT | `/api/templates/:id/graph` | Update template graph |
| DELETE | `/api/templates/:id` | Delete template |
| GET | `/api/templates/:id/versions` | List template versions |
| POST | `/api/templates/:id/versions` | Create version |
| GET | `/api/templates/:id/export/csv` | Export as CSV |
| POST | `/api/templates/:id/import/csv` | Import from CSV |

### Content Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/content-templates` | List message templates |
| POST | `/api/content-templates` | Create message template |
| DELETE | `/api/content-templates/:id` | Delete template |

### Messaging

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sms/send` | Send SMS message |
| GET | `/api/sms/status/:sid` | Check SMS status (Twilio) |
| POST | `/api/email/send` | Send email |
| POST | `/api/voicemail/drop` | Drop voicemail |
| POST | `/api/twilio/inbound-sms` | Twilio webhook |
| POST | `/api/bonzo/inbound-sms` | Bonzo webhook |

### Inbox

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List all conversations |
| POST | `/api/messages` | Send/log message |

### Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/contacts/:id` | Update contact |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create user (BDR/Admin) |
| POST | `/api/users/import/bdr` | Import BDRs from CSV |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Platform-wide stats |

### Utilities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/test-email` | Test SMTP config |
| POST | `/api/bonzo/backfill` | Sync contacts to Bonzo |
| POST | `/api/gmail/sync` | Sync Gmail replies |
| POST | `/media/upload/raw` | Upload MP3 for voicemail |
| GET | `/media/vm/:id.mp3` | Serve voicemail MP3 |

---

## ☁️ Render Deployment

### Database Setup on Render

1. **Create PostgreSQL Database**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "PostgreSQL"
   - Name: `adtv-events-db`
   - Plan: Choose based on needs (Free for testing)
   - Region: Same as your web service
   - Click "Create Database"

2. **Get Connection String**:
   - Copy "Internal Database URL" for same-region services
   - Or "External Database URL" for external connections
   - Format: `postgresql://user:password@host/database`

### Backend (Server) Deployment

1. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Name: `adtv-events-server`
   - Region: Choose closest to users
   - Branch: `main`
   - Root Directory: `apps/server`
   - Runtime: `Node`
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
   - Plan: At least Starter ($7/mo) for production

2. **Environment Variables**:
   ```bash
   DATABASE_URL=[Your Render Postgres Internal URL]
   JWT_SECRET=[Generate: openssl rand -base64 32]
   PORT=4000
   PUBLIC_BASE_URL=https://adtv-events-server.onrender.com
   
   # Add all SMS, Email, Voicemail variables from config section
   SMS_PROVIDER=bonzo
   BONZO_API_KEY=...
   # ... etc
   ```

3. **Configure Build**:
   - Ensure `package.json` has correct scripts:
   ```json
   {
     "scripts": {
       "build": "pnpm prisma:generate && pnpm prisma:deploy && tsc",
       "start": "node dist/index.js",
       "prisma:generate": "prisma generate",
       "prisma:deploy": "prisma migrate deploy || prisma db push"
     }
   }
   ```

4. **Deploy**: Click "Create Web Service"

### Frontend (Static Site) Deployment

1. **Create Static Site**:
   - Click "New +" → "Static Site"
   - Connect same Git repository
   - Name: `adtv-events-web`
   - Branch: `main`
   - Root Directory: `apps/web`
   - Build Command: `pnpm install && pnpm build`
   - Publish Directory: `dist`

2. **Environment Variables**:
   ```bash
   VITE_API_URL=https://adtv-events-server.onrender.com
   ```

3. **Deploy**: Click "Create Static Site"

### Post-Deployment Configuration

1. **CORS Setup** (if needed):
   ```typescript
   // apps/server/src/index.ts
   app.use(cors({
     origin: [
       'https://adtv-events-web.onrender.com',
       'https://your-custom-domain.com'
     ],
     credentials: true
   }));
   ```

2. **Webhook Configuration**:
   - **Twilio**: Set webhook URL to `https://adtv-events-server.onrender.com/api/twilio/inbound-sms`
   - **Bonzo**: Set webhook URL to `https://adtv-events-server.onrender.com/api/bonzo/inbound-sms`
   - Add `?token=YOUR_BONZO_WEBHOOK_TOKEN` if using token auth

3. **Custom Domain** (Optional):
   - In Render dashboard, go to service settings
   - Add custom domain
   - Update DNS records as instructed
   - Update `PUBLIC_BASE_URL` and `VITE_API_URL`

---

## ✅ Testing & Verification

### Local Testing

#### 1. Database Connection
```bash
cd apps/server
pnpm prisma studio
# Opens Prisma Studio at http://localhost:5555
# Verify tables exist and are empty
```

#### 2. Server Health
```bash
curl http://localhost:4000/health
# Expected: {"ok":true}
```

#### 3. SMS Test
```bash
curl -X POST http://localhost:4000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","text":"Test message"}'
```

#### 4. Email Test
```bash
curl -X POST http://localhost:4000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","text":"Hello"}'
```

#### 5. Template Import
```bash
# Verify templates.csv loads
curl http://localhost:4000/api/content-templates
# Should return array of templates from CSV
```

### Render Testing

#### 1. Service Health
```bash
curl https://adtv-events-server.onrender.com/health
# Expected: {"ok":true}
```

#### 2. Database Connectivity
```bash
# In Render shell (Dashboard → Service → Shell)
pnpm prisma studio
# Or run query
npx prisma db execute --stdin < prisma/migrations/migration.sql
```

#### 3. Environment Variables
```bash
# In Render shell
printenv | grep -E '(DATABASE_URL|JWT_SECRET|SMS_PROVIDER|BONZO)'
# Verify all required vars are set (values will be masked)
```

#### 4. Integration Test Script
Create `apps/server/scripts/test_integration.ts`:

```typescript
import fetch from 'node-fetch';

const BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';

async function test() {
  console.log('Testing ADTV Platform Integration...\n');
  
  // 1. Health check
  const health = await fetch(`${BASE_URL}/health`).then(r => r.json());
  console.log('✓ Health:', health);
  
  // 2. List templates
  const templates = await fetch(`${BASE_URL}/api/templates`).then(r => r.json());
  console.log('✓ Templates:', templates.length);
  
  // 3. List campaigns
  const campaigns = await fetch(`${BASE_URL}/api/campaigns`).then(r => r.json());
  console.log('✓ Campaigns:', campaigns.length);
  
  // 4. Content templates
  const content = await fetch(`${BASE_URL}/api/content-templates`).then(r => r.json());
  console.log('✓ Content Templates:', content.length);
  
  console.log('\n✅ All tests passed!');
}

test().catch(console.error);
```

Run:
```bash
cd apps/server
ts-node scripts/test_integration.ts
```

### Frontend Testing

1. **Local Build Test**:
```bash
cd apps/web
pnpm build
pnpm preview
# Visit http://localhost:4173
```

2. **Production Build Test**:
   - Check Render deployment logs
   - Visit deployed URL
   - Open browser console for errors
   - Test navigation: Dashboard → Campaigns → Templates → Inbox

3. **API Connectivity**:
   - Open Network tab in DevTools
   - Create a test campaign
   - Verify API calls succeed
   - Check response data format

---

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Errors

**Problem**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` format:
   ```
   postgresql://USER:PASSWORD@HOST:PORT/DATABASE
   ```
2. Check Render database is in same region as service
3. Use **Internal Database URL** from Render dashboard
4. Verify database is not paused (free tier)

**Test**:
```bash
cd apps/server
npx prisma db execute --stdin <<< "SELECT 1;"
```

#### Prisma Migration Issues

**Problem**: `Migration failed to apply`

**Solutions**:
1. Use `prisma db push` for development:
   ```bash
   pnpm prisma db push --skip-generate
   ```
2. Reset database (⚠️ DESTRUCTIVE):
   ```bash
   pnpm prisma migrate reset
   ```
3. Check existing schema:
   ```bash
   pnpm prisma db pull
   ```

#### SMS Not Sending

**Problem**: SMS sends fail silently

**Solutions**:
1. Verify provider configuration:
   ```bash
   # Check environment
   echo $SMS_PROVIDER
   echo $BONZO_API_KEY
   ```
2. Test with mock provider:
   ```bash
   # Remove SMS_PROVIDER to use mock
   unset SMS_PROVIDER
   ```
3. Check Bonzo API response:
   ```typescript
   // Enable debug logging in smsProvider.ts
   console.log('Bonzo response:', res.status, await res.text());
   ```
4. Verify phone number format (E.164):
   ```
   ✓ +14155551234
   ✗ (415) 555-1234
   ```

#### Email Sending Fails

**Problem**: SMTP authentication error

**Solutions**:
1. For Gmail, use App Password:
   - Go to Google Account → Security
   - Enable 2FA
   - Generate App Password
   - Use that password in `SMTP_PASS`

2. Verify SMTP settings:
   ```bash
   curl -X POST https://your-server.onrender.com/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"test@example.com","subject":"Test","text":"Hello"}'
   ```

3. Check port/security combo:
   ```bash
   # Port 465 → SMTP_SECURE=true
   # Port 587 → SMTP_SECURE=false (use STARTTLS)
   ```

#### Voicemail Drops Not Working

**Problem**: Voicemail queues but doesn't send

**Solutions**:
1. Verify Slybroadcast credentials
2. Check audio URL is publicly accessible:
   ```bash
   curl -I https://your-server.onrender.com/media/vm/test.mp3
   # Should return 200 OK
   ```
3. Test ElevenLabs TTS:
   ```bash
   # Check API key
   echo $ELEVENLABS_API_KEY
   ```
4. Use static audio file as fallback:
   ```bash
   SLYBROADCAST_DEFAULT_AUDIO_URL=https://example.com/message.mp3
   ```

#### Build Failures on Render

**Problem**: `Build failed: Cannot find module`

**Solutions**:
1. Verify package.json includes all dependencies:
   ```bash
   # Test locally
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   pnpm build
   ```

2. Check build command includes install:
   ```bash
   # Render Build Command:
   pnpm install && pnpm build
   ```

3. Verify package manager version:
   ```json
   // package.json
   {
     "packageManager": "pnpm@10.12.4"
   }
   ```

4. Check Render logs for specific error:
   - Dashboard → Service → Logs → Build logs

#### Frontend Can't Connect to Backend

**Problem**: CORS errors or 404 on API calls

**Solutions**:
1. Verify `VITE_API_URL` is set correctly:
   ```bash
   # In Render Static Site environment
   VITE_API_URL=https://adtv-events-server.onrender.com
   ```

2. Check CORS configuration in server:
   ```typescript
   // apps/server/src/index.ts
   app.use(cors()); // Or specify origins
   ```

3. Rebuild frontend after env var change:
   ```bash
   # Render rebuilds automatically on push
   # Or manually trigger in dashboard
   ```

4. Test API directly:
   ```bash
   curl https://adtv-events-server.onrender.com/health
   ```

#### JWT Authentication Issues

**Problem**: `unauthorized` or `invalid token`

**Solutions**:
1. Verify JWT_SECRET is set and consistent:
   ```bash
   # Should be 32+ character random string
   openssl rand -base64 32
   ```

2. Check token in localStorage:
   ```javascript
   // Browser console
   localStorage.getItem('auth_token')
   ```

3. Test login endpoint:
   ```bash
   curl -X POST https://your-server.onrender.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

4. Verify authMiddleware is applied:
   ```typescript
   // Should be before routes
   app.use(authMiddleware);
   ```

#### Template CSV Not Loading

**Problem**: Content templates return empty array

**Solutions**:
1. Verify templates.csv location:
   ```bash
   # Should be in repo root
   ls -la templates.csv
   ```

2. Check CSV format:
   ```csv
   Name,Type,Content
   "Welcome Email","Email","Subject: Welcome\n\nHello {{contact.first_name}}"
   "SMS Reminder","SMS","Hi {{contact.first_name}}, reminder for {{campaign.event_date}}"
   ```

3. Seed database from CSV:
   ```bash
   cd apps/server
   # CSV will auto-seed on first /api/content-templates call
   curl http://localhost:4000/api/content-templates
   ```

4. Manually create templates via API:
   ```bash
   curl -X POST http://localhost:4000/api/content-templates \
     -H "Content-Type: application/json" \
     -d '{"type":"sms","name":"Test","text":"Hello {{contact.first_name}}"}'
   ```

---

## 📞 Support & Maintenance

### Monitoring

**Render Metrics**:
- Dashboard → Service → Metrics
- Monitor: CPU, Memory, Response time, Errors

**Database Health**:
```bash
# Check connection count
SELECT count(*) FROM pg_stat_activity;

# Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Application Logs**:
```bash
# Render Dashboard → Service → Logs
# Or via Render CLI
render logs -f [service-id]
```

### Backup Strategy

**Database Backups** (Render Postgres):
- Automatic daily backups (Pro plans)
- Manual backup:
  ```bash
  pg_dump $DATABASE_URL > backup.sql
  ```

**Configuration Backups**:
- Store `.env.example` with dummy values
- Document all Render environment variables
- Keep copy of webhook URLs

### Scaling Considerations

**Horizontal Scaling**:
- Render auto-scales on Pro+ plans
- Add Redis for session/cache layer
- Use Render load balancer

**Database Scaling**:
- Monitor connection pool
- Add read replicas for analytics
- Consider connection pooler (PgBouncer)

**Performance Optimization**:
1. Add database indexes:
   ```sql
   CREATE INDEX idx_contacts_campaign ON "Contact"("campaignId");
   CREATE INDEX idx_messages_convo ON "Message"("conversationId");
   ```

2. Implement caching:
   ```typescript
   import { Redis } from 'ioredis';
   const redis = new Redis(process.env.REDIS_URL);
   ```

3. Optimize queries:
   ```typescript
   // Use select to limit fields
   await prisma.contact.findMany({
     select: { id: true, name: true, email: true }
   });
   ```

---

## 📚 Additional Resources

- **Render Documentation**: https://docs.render.com
- **Prisma Documentation**: https://www.prisma.io/docs
- **React Documentation**: https://react.dev
- **Bonzo API**: https://docs.getbonzo.com
- **Twilio API**: https://www.twilio.com/docs
- **ElevenLabs API**: https://docs.elevenlabs.io

---

## 📝 Version History

- **v1.0.0** (2025-10-17): Initial migration package with full platform
- Includes: Campaign management, multi-channel messaging, analytics, template system

---

**For questions or issues during integration, refer to this document or contact your development team.**

✨ **Happy Integrating!** ✨


