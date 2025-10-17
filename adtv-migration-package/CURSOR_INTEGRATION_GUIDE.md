# CURSOR INTEGRATION GUIDE

**For AI Assistant (Cursor): Read this first to understand the ADTV Event Automation platform and how to integrate it.**

## 🎯 Platform Purpose

ADTV Event Automation is a complete campaign management and multi-channel communication platform designed for event marketing. It handles:
- Campaign creation and management
- Multi-channel outreach (SMS, Email, Voicemail)
- Contact management and tracking
- Unified inbox for conversations
- Analytics and reporting

## 📋 Quick Context

### Tech Stack
- **Backend**: Node.js + TypeScript + Express + Prisma + PostgreSQL
- **Frontend**: React 18 + TypeScript + Vite + Tailwind + Zustand
- **Services**: Bonzo (SMS), Twilio (SMS backup), Gmail API, Slybroadcast (Voicemail), ElevenLabs (TTS)
- **Deployment**: Render (Web Service + Static Site + PostgreSQL)

### Architecture Pattern
```
React SPA → Express API → Prisma ORM → PostgreSQL
             ↓
        External Services (Bonzo, Twilio, etc.)
```

## 🗂 Package Structure

```
adtv-migration-package/
├── 📚 Documentation/
│   ├── SETUP_INSTRUCTIONS.md     # 35,000+ word complete guide
│   ├── INTEGRATION_EXAMPLES.md   # Code examples for integration
│   ├── MIGRATION_CHECKLIST.md    # Step-by-step checklist
│   ├── ARCHITECTURE_OVERVIEW.md  # System design & data flow
│   ├── QUICK_START.md            # 15-minute quick start
│   ├── PACKAGE_CONTENTS.md       # Full manifest
│   └── README.md                 # Package overview
│
├── 💻 Source Code/
│   ├── apps/server/              # Backend API
│   │   ├── src/index.ts          # Main server (1,620 lines)
│   │   ├── src/services/         # External integrations
│   │   ├── prisma/schema.prisma  # Database schema
│   │   └── scripts/              # Utility scripts
│   │
│   └── apps/web/                 # Frontend SPA
│       ├── src/pages/            # Route pages
│       ├── src/components/       # Reusable components
│       ├── src/lib/api.ts        # API client
│       └── src/store/            # State management
│
├── 🔧 Configuration/
│   └── env.template              # Environment variables
│
└── 📊 Data/
    └── templates.csv             # Sample message templates
```

## 🔑 Key Concepts

### 1. Campaign System
- **Template**: Reusable workflow graph (nodes + edges)
- **Campaign**: Instance of a template with specific event details
- **Campaign Graph**: Cloned from template, can be customized
- **Contact**: Person enrolled in a campaign

### 2. Workflow Nodes
- `stage`: Funnel stage (e.g., "Initial Outreach")
- `sms_send`: Send SMS message
- `email_send`: Send email
- `voicemail_drop`: Drop voicemail
- `wait`: Wait period

### 3. Messaging
- **Provider Abstraction**: Unified interface across SMS providers
- **Merge Tags**: `{{contact.name}}`, `{{campaign.event_date}}`
- **Conversation**: Per-contact message thread
- **Message**: Individual message with direction (in/out)

### 4. Data Models (Simplified)
```typescript
Campaign {
  id, name, eventDate, eventType
  templateId → Template
  contacts → Contact[]
  nodes → CampaignNode[]
  edges → CampaignEdge[]
}

Contact {
  id, name, email, phone, status
  campaignId → Campaign
  conversations → Conversation[]
}

Message {
  id, text, direction (in/out)
  conversationId → Conversation
  provider (bonzo/twilio/smtp)
}
```

## 🔌 Integration Approaches

### Approach 1: Standalone API (Recommended)
Deploy ADTV as separate services, integrate via REST API.

```typescript
// Your existing project
import { ADTVClient } from './adtv-client';

const adtv = new ADTVClient('https://adtv-server.onrender.com');

// Create campaign
await adtv.createCampaign({
  name: 'My Event',
  eventDate: '2025-12-01T10:00:00Z',
  ownerEmail: 'owner@example.com'
});

// Send SMS
await adtv.sendSms('+1234567890', 'Hello!');
```

**Pros**: Minimal changes to existing project, easy to test
**Cons**: Separate deployment, network latency

### Approach 2: Monorepo Integration
Merge into existing monorepo, share database and auth.

```
your-project/
├── packages/
│   ├── database/     ← Merge schemas
│   └── auth/         ← Share JWT tokens
└── apps/
    ├── your-app/
    ├── adtv-server/  ← Add here
    └── adtv-web/     ← Add here
```

**Pros**: Deep integration, shared code, single deployment
**Cons**: More setup, potential conflicts

### Approach 3: Module Extraction
Extract specific features as npm packages.

```typescript
// Extract messaging module
import { sendSms, sendEmail } from '@yourorg/adtv-messaging';

await sendSms({ to: '+1234567890', text: 'Hello' });
```

**Pros**: Use only what you need, lightweight
**Cons**: Requires refactoring, lose some features

## 🔐 Environment Variables (Critical)

### Minimum Required
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_32_chars
PUBLIC_BASE_URL=https://your-server.onrender.com
```

### SMS (Choose One)
```bash
# Bonzo (Primary)
SMS_PROVIDER=bonzo
BONZO_API_KEY=...

# OR Twilio (Backup)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

### Email
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...  # Use app password for Gmail
```

See `env.template` for complete list.

## 📡 Key API Endpoints

### Authentication
- `POST /api/auth/login` - Login, get JWT token
- `GET /api/auth/me` - Get current user

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign (clones template graph)
- `PATCH /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/contacts/bulk` - Import contacts
- `POST /api/campaigns/:id/execute` - Execute campaign (send messages)
- `GET /api/campaigns/:id/stats` - Get analytics

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `PUT /api/templates/:id/graph` - Update template graph
- `GET /api/templates/:id/export/csv` - Export template
- `POST /api/templates/:id/import/csv` - Import template

### Messaging
- `POST /api/sms/send` - Send SMS
- `POST /api/email/send` - Send email
- `POST /api/voicemail/drop` - Drop voicemail
- `POST /api/twilio/inbound-sms` - Twilio webhook
- `POST /api/bonzo/inbound-sms` - Bonzo webhook

### Analytics
- `GET /api/stats` - Platform-wide stats
- `GET /api/campaigns/:id/stats` - Campaign stats

Full API reference in `SETUP_INSTRUCTIONS.md`.

## 🗄 Database Schema Highlights

### Key Tables
- **User**: BDR/admin accounts with credentials
- **Campaign**: Event campaigns with metadata
- **Contact**: Campaign prospects
- **Template**: Reusable workflow templates
- **Node/Edge**: Workflow graph components
- **CampaignNode/CampaignEdge**: Per-campaign graph clones
- **Conversation**: Message threads
- **Message**: Individual messages
- **ContentTemplate**: Reusable message templates

### Important Relationships
- Campaign ←→ Template (many-to-one, optional)
- Campaign → Contact (one-to-many)
- Contact → Conversation → Message (one-to-many-to-many)
- Template → Node/Edge (one-to-many)

Full schema in `apps/server/prisma/schema.prisma`.

## 🚀 Deployment to Render

### 1. Create Database
```bash
Render Dashboard → New + → PostgreSQL
Name: adtv-events-db
Plan: Free (testing) or paid (production)
Copy Internal Database URL
```

### 2. Deploy Backend
```bash
Render Dashboard → New + → Web Service
Repository: [Your Git repo]
Root Directory: apps/server
Build: pnpm install && pnpm build
Start: pnpm start
Environment Variables: [Add from env.template]
```

### 3. Deploy Frontend
```bash
Render Dashboard → New + → Static Site
Repository: [Your Git repo]
Root Directory: apps/web
Build: pnpm install && pnpm build
Publish: dist
Environment Variables: VITE_API_URL=[Backend URL]
```

Full deployment guide in `SETUP_INSTRUCTIONS.md`.

## 🧪 Testing Checklist

### Local Testing
```bash
# Health check
curl http://localhost:4000/health

# List templates
curl http://localhost:4000/api/templates

# Send test SMS (mock)
curl -X POST http://localhost:4000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to":"+1234567890","text":"Test"}'
```

### Render Testing
```bash
# Health check
curl https://adtv-server.onrender.com/health

# Frontend loads
open https://adtv-web.onrender.com
```

## 🔧 Common Integration Tasks

### Task 1: Call ADTV API from Existing App
```typescript
// 1. Create client wrapper (see INTEGRATION_EXAMPLES.md)
// 2. Set ADTV_API_URL in your app's .env
// 3. Call endpoints:
const campaign = await adtv.createCampaign({...});
await adtv.sendSms(phone, message);
```

### Task 2: Share Authentication
```typescript
// 1. Use same JWT_SECRET in both apps
// 2. Generate token in your app:
const token = jwt.sign({ id, email, role }, JWT_SECRET);
// 3. Use token for ADTV API calls:
const adtv = new ADTVClient(ADTV_URL, token);
```

### Task 3: Embed ADTV UI
```tsx
// iFrame approach
<iframe
  src={`${ADTV_URL}/campaigns?token=${token}`}
  width="100%"
  height="800px"
/>

// Popup approach
window.open(`${ADTV_URL}/campaigns`, 'ADTV', 'width=1200,height=800');
```

### Task 4: Extend Database Schema
```prisma
// In your project's schema.prisma
model YourModel {
  id             String @id
  adtvCampaignId String?  // Reference ADTV campaign
}

// Then sync campaign data
await syncWithADTV(yourModel.adtvCampaignId);
```

## 📚 Documentation Map

**Need to understand...** → **Read this file**

| Question | File |
|----------|------|
| How do I get this running quickly? | `QUICK_START.md` |
| What's the complete setup process? | `SETUP_INSTRUCTIONS.md` |
| How do I integrate this into my app? | `INTEGRATION_EXAMPLES.md` |
| What's the step-by-step checklist? | `MIGRATION_CHECKLIST.md` |
| How does the architecture work? | `ARCHITECTURE_OVERVIEW.md` |
| What environment variables do I need? | `env.template` |
| What's included in this package? | `PACKAGE_CONTENTS.md` |
| What are all the API endpoints? | `SETUP_INSTRUCTIONS.md` → API Endpoints |
| How do I troubleshoot issues? | `SETUP_INSTRUCTIONS.md` → Troubleshooting |
| What's the database schema? | `ARCHITECTURE_OVERVIEW.md` OR `apps/server/prisma/schema.prisma` |

## 🎯 AI Assistant Instructions

When helping with this platform:

### 1. Always Check Documentation First
Before answering questions, reference the appropriate file above.

### 2. Follow Integration Approach
Ask user which approach they prefer (Standalone, Monorepo, or Module Extraction) before providing code.

### 3. Use Exact Environment Variable Names
Variables must match exactly as defined in `env.template`.

### 4. Preserve Existing Code
Don't modify core ADTV files unless explicitly requested. Integration should be additive.

### 5. Test Locally First
Always recommend testing locally before deploying to Render.

### 6. Reference API Client Pattern
For standalone integration, always point to the `ADTVClient` class in `INTEGRATION_EXAMPLES.md`.

### 7. Database Changes Require Migrations
If suggesting database changes, mention Prisma migrations:
```bash
cd apps/server
npx prisma migrate dev --name your_change
```

### 8. Security First
- Never commit `.env` files
- Use strong JWT secrets (32+ chars)
- Use app passwords for Gmail
- Set CORS origins properly

## 🚨 Common Pitfalls to Avoid

1. **Missing JWT_SECRET**: Platform won't start without it
2. **Wrong DATABASE_URL**: Use Internal URL from Render (not External)
3. **CORS issues**: Add frontend domain to CORS config
4. **Gmail password**: Must use App Password, not regular password
5. **Phone number format**: Must be E.164 format (+1XXXXXXXXXX)
6. **Template not found**: Ensure templates.csv in repo root
7. **Webhook URLs**: Must be publicly accessible (not localhost)
8. **Build command**: Must include `pnpm install` in Render

## ✅ Pre-Integration Checklist

Before starting integration:
- [ ] Read `QUICK_START.md` for overview
- [ ] Choose integration approach (Standalone/Monorepo/Module)
- [ ] Review `INTEGRATION_EXAMPLES.md` for code patterns
- [ ] Check if external services needed (Bonzo, Twilio, etc.)
- [ ] Verify Node.js 18+ and PostgreSQL 12+ available
- [ ] Decide: Local development or Render deployment first?
- [ ] Review `MIGRATION_CHECKLIST.md` for full process

## 🎓 Learning Path

**Beginner** (First time seeing this):
1. Read `README.md` (5 min)
2. Read `QUICK_START.md` (10 min)
3. Try Option 1: Local Setup
4. Review `INTEGRATION_EXAMPLES.md` → Standalone API

**Intermediate** (Ready to integrate):
1. Review `INTEGRATION_EXAMPLES.md` → Your chosen approach
2. Follow `MIGRATION_CHECKLIST.md`
3. Reference `SETUP_INSTRUCTIONS.md` as needed
4. Use `env.template` for configuration

**Advanced** (Deep customization):
1. Study `ARCHITECTURE_OVERVIEW.md`
2. Review source code in `apps/server/src/`
3. Review Prisma schema
4. Plan modifications
5. Extend database schema if needed

## 💡 Key Insights for AI

### This Platform Is:
✅ Production-ready (deployed successfully on Render)
✅ Well-documented (40,000+ words of docs)
✅ Type-safe (TypeScript throughout)
✅ Provider-agnostic (multiple SMS/email options)
✅ Extensible (clear integration patterns)

### This Platform Is NOT:
❌ A library (it's a full application)
❌ Require AWS/Azure (designed for Render)
❌ Require Docker (uses native Node.js)
❌ Framework-specific (React is optional for frontend)

### When User Asks About...
- **"How to deploy"** → Point to Render deployment section
- **"How to integrate"** → Ask about integration approach first
- **"Environment variables"** → Reference `env.template`
- **"API endpoints"** → Reference `SETUP_INSTRUCTIONS.md` API section
- **"Database schema"** → Reference Prisma schema file
- **"Authentication"** → Explain JWT-based auth
- **"SMS sending"** → Explain provider abstraction
- **"Troubleshooting"** → Reference troubleshooting section

## 🔄 Next Steps After Reading This

1. **Cursor AI**: Ask user what they want to do:
   - Deploy standalone?
   - Integrate into existing project?
   - Extract specific features?
   - Understand architecture?

2. **Then**: Guide them to the appropriate documentation file

3. **Finally**: Provide code examples from `INTEGRATION_EXAMPLES.md` matching their needs

---

**This guide contains everything you need to help the user successfully integrate ADTV Event Automation into their project.**

**For detailed code examples, see `INTEGRATION_EXAMPLES.md`.**
**For complete setup instructions, see `SETUP_INSTRUCTIONS.md`.**
**For architecture details, see `ARCHITECTURE_OVERVIEW.md`.**

✨ **You're equipped to help with ADTV integration!** ✨


