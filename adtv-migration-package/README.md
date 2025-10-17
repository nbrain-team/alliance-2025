# 🚀 ADTV Event Automation - Migration Package

## What's Included

This package contains a complete, production-ready event marketing automation platform with:

- ✅ **Backend API** (Express + TypeScript + Prisma)
- ✅ **Frontend Web App** (React + TypeScript + Vite)
- ✅ **Database Schema** (PostgreSQL migrations)
- ✅ **Multi-Channel Messaging** (SMS, Email, Voicemail)
- ✅ **Campaign Management** (Templates, Funnels, Analytics)
- ✅ **Complete Documentation** (Setup, API, Deployment)

## 📁 Package Structure

```
adtv-migration-package/
├── SETUP_INSTRUCTIONS.md          ← START HERE - Complete integration guide
├── README.md                       ← This file
├── env.template                    ← Environment variables template
├── INTEGRATION_EXAMPLES.md         ← Code examples for integration
├── MIGRATION_CHECKLIST.md          ← Step-by-step migration checklist
├── ARCHITECTURE_OVERVIEW.md        ← System architecture deep-dive
├── templates.csv                   ← Sample message templates
│
├── apps/
│   ├── server/                     ← Backend API
│   │   ├── src/
│   │   │   ├── index.ts           ← Main server file
│   │   │   └── services/          ← External service integrations
│   │   │       ├── smsProvider.ts
│   │   │       ├── bonzoApi.ts
│   │   │       ├── elevenLabs.ts
│   │   │       ├── voicemailProvider.ts
│   │   │       └── mediaStore.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma      ← Database schema
│   │   │   └── migrations/        ← Database migrations
│   │   ├── scripts/               ← Utility scripts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── pnpm-lock.yaml
│   │
│   └── web/                        ← Frontend application
│       ├── src/
│       │   ├── main.tsx           ← App entry point
│       │   ├── pages/             ← Route pages
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Campaigns.tsx
│       │   │   ├── CampaignBuilder.tsx
│       │   │   ├── Templates.tsx
│       │   │   ├── Inbox.tsx
│       │   │   ├── Leads.tsx
│       │   │   └── ...
│       │   ├── components/        ← Reusable components
│       │   ├── lib/
│       │   │   └── api.ts         ← API client
│       │   ├── shared/            ← Layout components
│       │   ├── store/             ← State management
│       │   └── styles.css         ← Global styles
│       ├── public/
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── pnpm-lock.yaml
│
└── docs/                           ← Additional documentation
```

## 🎯 Quick Start

### 1. Read the Setup Guide

Open **`SETUP_INSTRUCTIONS.md`** - this is your complete integration guide with:
- Tech stack details
- Architecture overview
- Environment setup
- Database configuration
- Render deployment steps
- Testing procedures
- Troubleshooting guide

### 2. Choose Integration Approach

**Option A: Standalone Deployment** (Recommended)
- Deploy as separate services on Render
- Integrate via REST API calls
- Minimal changes to existing project

**Option B: Monorepo Integration**
- Merge into existing monorepo
- Share database and authentication
- Deeper integration but more setup

**Option C: Module Extraction**
- Extract specific features as npm packages
- Use only what you need
- Maximum flexibility

See `INTEGRATION_EXAMPLES.md` for code examples of each approach.

### 3. Follow the Checklist

Use **`MIGRATION_CHECKLIST.md`** for a step-by-step migration process with checkboxes.

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `SETUP_INSTRUCTIONS.md` | **Complete setup and integration guide** |
| `INTEGRATION_EXAMPLES.md` | Code examples for different integration patterns |
| `MIGRATION_CHECKLIST.md` | Step-by-step checklist with tasks |
| `ARCHITECTURE_OVERVIEW.md` | Deep dive into system design and data flow |
| `env.template` | Environment variables template |

## 🔑 Key Features

### Campaign Management
- Create campaigns from reusable templates
- Import contacts via CSV bulk upload
- Track campaign status and performance
- Multi-stage funnel workflows

### Multi-Channel Outreach
- **SMS**: Bonzo (primary) + Twilio (fallback)
- **Email**: SMTP (any provider) + Gmail OAuth
- **Voicemail**: Slybroadcast with ElevenLabs TTS

### Analytics & Tracking
- Real-time campaign metrics
- Message engagement tracking
- Contact status funnel
- Historical data visualization

### Unified Inbox
- Consolidated SMS and email conversations
- Per-contact message threading
- Quick reply functionality
- Status change on inbound messages

### Template System
- Visual funnel builder (drag-and-drop)
- Reusable message templates
- Merge tags for personalization
- Version control for template modifications

## 🛠 Tech Stack Summary

**Backend**: Node.js, TypeScript, Express, Prisma, PostgreSQL
**Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand
**Services**: Bonzo, Twilio, Slybroadcast, ElevenLabs, Gmail API
**Deployment**: Render (Web Service + Static Site + PostgreSQL)

## 🔐 Security Notes

- All environment variables should be set in Render dashboard (never commit)
- JWT tokens for authentication (configurable secret)
- Webhook token validation for inbound messages
- CORS configured for your domains
- All passwords hashed with bcrypt
- OAuth tokens stored encrypted in database

## 📦 Deployment Checklist

- [ ] Create Render PostgreSQL database
- [ ] Deploy backend web service
- [ ] Set all environment variables
- [ ] Run database migrations
- [ ] Deploy frontend static site
- [ ] Configure custom domains (optional)
- [ ] Set up webhook URLs (Twilio, Bonzo)
- [ ] Test SMS, Email, Voicemail sending
- [ ] Create admin user account
- [ ] Import initial templates
- [ ] Verify analytics dashboard

## 🆘 Getting Help

1. **Setup Issues**: Check `SETUP_INSTRUCTIONS.md` → Troubleshooting section
2. **Integration Questions**: See `INTEGRATION_EXAMPLES.md`
3. **Architecture Questions**: Read `ARCHITECTURE_OVERVIEW.md`
4. **API Reference**: See `SETUP_INSTRUCTIONS.md` → API Endpoints section

## 📊 System Requirements

### Development
- Node.js 18+
- pnpm 8+
- PostgreSQL 12+
- Git

### Production (Render)
- Render account
- PostgreSQL database (paid plan recommended)
- Web Service (Starter or higher)
- Static Site

### External Services (Optional)
- Bonzo account (for SMS)
- Twilio account (for SMS fallback)
- Slybroadcast account (for voicemail)
- ElevenLabs account (for TTS)
- Google Cloud project (for Gmail OAuth)

## 🎉 Next Steps

1. **Read** `SETUP_INSTRUCTIONS.md` in detail
2. **Copy** code to your project location
3. **Configure** environment variables
4. **Deploy** to Render following the guide
5. **Test** all integrations
6. **Monitor** logs and metrics

## ⚡ Key Integration Points

If integrating into existing project, these are the main connection points:

### API Client
```typescript
// From any project, call ADTV API
import { ADTVClient } from './adtv-client';

const client = new ADTVClient('https://adtv-server.onrender.com');
await client.createCampaign({ name: 'My Campaign', ... });
await client.sendSms('+1234567890', 'Hello!');
```

### Database Integration
```prisma
// Extend your schema to reference ADTV campaigns
model YourModel {
  id          String @id
  adtvCampaignId String?  // Foreign key to ADTV Campaign
}
```

### Shared Authentication
```typescript
// Use same JWT secret in both platforms
// User tokens will work across both systems
```

See `INTEGRATION_EXAMPLES.md` for complete code examples.

---

**Questions?** Review the comprehensive documentation in this package.

**Ready to Deploy?** Start with `SETUP_INSTRUCTIONS.md` and follow the Render deployment guide.

**Need Custom Integration?** Check `INTEGRATION_EXAMPLES.md` for various patterns.

✨ **Happy Building!** ✨


