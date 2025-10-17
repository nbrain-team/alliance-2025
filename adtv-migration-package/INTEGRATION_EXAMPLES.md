# Integration Examples

This document provides practical code examples for integrating the ADTV Event Automation platform into your existing project.

## Table of Contents
1. [Standalone API Integration](#standalone-api-integration)
2. [Monorepo Integration](#monorepo-integration)
3. [Module Extraction](#module-extraction)
4. [Shared Authentication](#shared-authentication)
5. [Database Integration](#database-integration)
6. [Frontend Integration](#frontend-integration)

---

## Standalone API Integration

Deploy ADTV as a separate service and integrate via REST API calls.

### Create API Client Wrapper

```typescript
// src/services/adtv-client.ts

export class ADTVClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async request(method: string, path: string, body?: any) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ADTV API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Campaign methods
  async createCampaign(data: {
    name: string;
    ownerName: string;
    ownerEmail: string;
    eventType: string;
    eventDate: string;
    templateId?: string;
  }) {
    return this.request('POST', '/api/campaigns', data);
  }

  async listCampaigns() {
    return this.request('GET', '/api/campaigns');
  }

  async getCampaign(id: string) {
    return this.request('GET', `/api/campaigns/${id}`);
  }

  async updateCampaign(id: string, data: any) {
    return this.request('PATCH', `/api/campaigns/${id}`, data);
  }

  // Contact methods
  async addContact(campaignId: string, contact: {
    name: string;
    email?: string;
    phone?: string;
  }) {
    return this.request('POST', `/api/campaigns/${campaignId}/contacts`, contact);
  }

  async bulkAddContacts(campaignId: string, contacts: any[]) {
    return this.request('POST', `/api/campaigns/${campaignId}/contacts/bulk`, {
      contacts
    });
  }

  // Messaging methods
  async sendSms(to: string, text: string, contactId?: string) {
    return this.request('POST', '/api/sms/send', { to, text, contactId });
  }

  async sendEmail(to: string, subject: string, body: string, contactId?: string) {
    return this.request('POST', '/api/email/send', { to, subject, body, contactId });
  }

  async dropVoicemail(to: string, ttsScript: string, contactId?: string) {
    return this.request('POST', '/api/voicemail/drop', { to, ttsScript, contactId });
  }

  // Analytics methods
  async getCampaignStats(campaignId: string) {
    return this.request('GET', `/api/campaigns/${campaignId}/stats`);
  }

  async getPlatformStats() {
    return this.request('GET', '/api/stats');
  }

  // Template methods
  async listTemplates() {
    return this.request('GET', '/api/templates');
  }

  async getTemplate(id: string) {
    return this.request('GET', `/api/templates/${id}`);
  }
}

// Usage example
const adtv = new ADTVClient(
  process.env.ADTV_API_URL || 'https://adtv-server.onrender.com',
  process.env.ADTV_API_TOKEN
);

export default adtv;
```

### Use in Your Application

```typescript
// src/features/events/event-service.ts

import adtv from '@/services/adtv-client';

export class EventService {
  async createEventCampaign(eventData: any) {
    // Create campaign in ADTV
    const campaign = await adtv.createCampaign({
      name: eventData.title,
      ownerName: eventData.organizerName,
      ownerEmail: eventData.organizerEmail,
      eventType: eventData.type,
      eventDate: eventData.date,
      templateId: 'template_id_here' // Optional
    });

    // Import attendees
    await adtv.bulkAddContacts(campaign.id, eventData.attendees.map(a => ({
      name: a.name,
      email: a.email,
      phone: a.phone
    })));

    return campaign;
  }

  async sendEventReminder(campaignId: string, customMessage?: string) {
    const stats = await adtv.getCampaignStats(campaignId);
    
    // Send SMS to all contacts in campaign
    // This would typically be done via campaign execution endpoint
    return adtv.request('POST', `/api/campaigns/${campaignId}/execute-sms`, {
      text: customMessage
    });
  }

  async getEventAnalytics(campaignId: string) {
    return adtv.getCampaignStats(campaignId);
  }
}
```

### React Hook Example

```typescript
// src/hooks/useADTVCampaign.ts

import { useState, useEffect } from 'react';
import adtv from '@/services/adtv-client';

export function useADTVCampaign(campaignId: string | null) {
  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [campaignData, statsData] = await Promise.all([
          adtv.getCampaign(campaignId),
          adtv.getCampaignStats(campaignId)
        ]);
        setCampaign(campaignData);
        setStats(statsData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [campaignId]);

  const sendMessage = async (type: 'sms' | 'email', data: any) => {
    setLoading(true);
    try {
      if (type === 'sms') {
        await adtv.sendSms(data.to, data.text, data.contactId);
      } else {
        await adtv.sendEmail(data.to, data.subject, data.body, data.contactId);
      }
      // Refresh stats
      const newStats = await adtv.getCampaignStats(campaignId!);
      setStats(newStats);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { campaign, stats, loading, error, sendMessage };
}

// Usage in component
function CampaignDashboard({ campaignId }: { campaignId: string }) {
  const { campaign, stats, loading, error, sendMessage } = useADTVCampaign(campaignId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{campaign?.name}</h1>
      <p>Total Contacts: {stats?.totals.contacts}</p>
      <p>Messages Sent: {stats?.totals.messages}</p>
      {/* ... */}
    </div>
  );
}
```

---

## Monorepo Integration

Integrate ADTV into an existing monorepo with shared code.

### Directory Structure

```
your-project/
├── packages/
│   ├── database/           ← Shared Prisma schema
│   ├── auth/               ← Shared authentication
│   └── types/              ← Shared TypeScript types
├── apps/
│   ├── your-existing-app/
│   ├── adtv-server/        ← ADTV backend
│   └── adtv-web/           ← ADTV frontend
└── package.json            ← Workspace configuration
```

### Workspace Configuration

```json
// package.json
{
  "name": "your-project",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "pnpm run --parallel dev",
    "build": "pnpm run -r build",
    "db:migrate": "pnpm --filter @yourorg/database prisma migrate deploy"
  }
}
```

### Shared Database Package

```typescript
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Your existing models
model User {
  id    String @id @default(cuid())
  email String @unique
  name  String
  // ... your fields
  
  // ADTV extension
  adtvProfile ADTVUser?
}

// ADTV models (copy from ADTV schema.prisma)
model ADTVUser {
  id         String   @id @default(cuid())
  userId     String   @unique  // Reference to your User
  user       User     @relation(fields: [userId], references: [id])
  role       String   @default("bdr")
  smsFromNumber String?
  vmCallerId String?
  campaigns  Campaign[]
}

model Campaign {
  id        String   @id @default(cuid())
  name      String
  ownerName String
  // ... rest of ADTV Campaign model
}

// ... rest of ADTV models
```

### Shared Authentication

```typescript
// packages/auth/src/middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).user = decoded;
    }
  } catch (err) {
    // Invalid token, continue without user
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Use in both apps
// apps/your-app/src/server.ts
import { authMiddleware } from '@yourorg/auth';
app.use(authMiddleware);

// apps/adtv-server/src/index.ts
import { authMiddleware } from '@yourorg/auth';
app.use(authMiddleware);
```

### Shared Types Package

```typescript
// packages/types/src/adtv.ts

export interface Campaign {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  eventType: 'In-Person' | 'Virtual';
  eventDate: Date;
  status: 'draft' | 'active' | 'completed';
  totalContacts: number;
}

export interface Contact {
  id: string;
  campaignId: string;
  name: string;
  email?: string;
  phone?: string;
  status: string;
}

export interface CampaignStats {
  totals: {
    contacts: number;
    messages: number;
    inbound: number;
    outbound: number;
  };
  statusCounts: Record<string, number>;
  funnel: {
    rsvpConfirmed: number;
    attended: number;
    esignSent: number;
    signed: number;
  };
}

// Use in both apps
// apps/adtv-server/src/routes.ts
import { Campaign, CampaignStats } from '@yourorg/types';

// apps/your-app/src/features/events.ts
import { Campaign } from '@yourorg/types';
```

---

## Module Extraction

Extract specific ADTV features as reusable npm packages.

### Create Messaging Package

```typescript
// packages/adtv-messaging/src/index.ts

export { sendSms, SendSmsInput, SendSmsResult } from './sms-provider';
export { sendEmail } from './email-provider';
export { sendVoicemailDrop } from './voicemail-provider';
export { generateTtsMp3 } from './tts-provider';

// packages/adtv-messaging/package.json
{
  "name": "@yourorg/adtv-messaging",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "dependencies": {
    "twilio": "^4.22.0",
    "nodemailer": "^7.0.6"
  }
}
```

### Use in Your App

```typescript
// your-app/src/services/notifications.ts

import { sendSms, sendEmail } from '@yourorg/adtv-messaging';

export class NotificationService {
  async notifyUser(userId: string, message: string, channels: string[]) {
    const user = await db.user.findUnique({ where: { id: userId } });
    
    if (channels.includes('sms') && user.phone) {
      await sendSms({ to: user.phone, text: message });
    }
    
    if (channels.includes('email') && user.email) {
      await sendEmail({
        to: user.email,
        subject: 'Notification',
        body: message
      });
    }
  }
}
```

---

## Shared Authentication

Share JWT tokens between ADTV and your existing app.

### Unified Auth Service

```typescript
// packages/auth/src/token-service.ts

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  scope?: string[];  // Optional: limit what token can access
}

export function generateToken(payload: TokenPayload, expiresIn = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

// Use same secret in both apps
// your-app/.env
JWT_SECRET=same_secret_here

// adtv-server/.env
JWT_SECRET=same_secret_here
```

### Cross-App Authentication

```typescript
// your-app/src/auth/adtv-sync.ts

import { ADTVClient } from '@/services/adtv-client';

export async function loginWithADTVAccess(email: string, password: string) {
  // Login to your app
  const user = await yourAppLogin(email, password);
  
  // Generate token with ADTV scope
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    scope: ['adtv:campaigns', 'adtv:messaging']
  });
  
  // Create ADTV client with token
  const adtv = new ADTVClient(process.env.ADTV_API_URL!, token);
  
  return { user, token, adtv };
}
```

---

## Database Integration

### Foreign Key Reference Pattern

```typescript
// your-app/prisma/schema.prisma

model Event {
  id              String @id @default(cuid())
  title           String
  date            DateTime
  
  // Reference to ADTV campaign
  adtvCampaignId  String?
  
  // Store campaign data locally (optional, for caching)
  campaignData    Json?
  lastSyncedAt    DateTime?
}

// Sync function
export async function syncEventWithADTV(eventId: string) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  
  if (!event.adtvCampaignId) {
    // Create campaign in ADTV
    const campaign = await adtv.createCampaign({
      name: event.title,
      eventDate: event.date.toISOString(),
      // ... other fields
    });
    
    // Store reference
    await db.event.update({
      where: { id: eventId },
      data: {
        adtvCampaignId: campaign.id,
        campaignData: campaign,
        lastSyncedAt: new Date()
      }
    });
  } else {
    // Update existing campaign
    await adtv.updateCampaign(event.adtvCampaignId, {
      name: event.title,
      eventDate: event.date.toISOString()
    });
  }
}
```

### Webhook Integration

```typescript
// your-app/src/webhooks/adtv-webhooks.ts

import express from 'express';

const router = express.Router();

// Receive campaign updates from ADTV
router.post('/adtv/campaign-updated', async (req, res) => {
  const { campaignId, status, stats } = req.body;
  
  // Update your local event
  await db.event.updateMany({
    where: { adtvCampaignId: campaignId },
    data: {
      campaignData: stats,
      lastSyncedAt: new Date()
    }
  });
  
  res.json({ ok: true });
});

// Receive message notifications
router.post('/adtv/message-received', async (req, res) => {
  const { contactId, message, from } = req.body;
  
  // Process inbound message
  await handleInboundMessage(from, message);
  
  res.json({ ok: true });
});

export default router;
```

---

## Frontend Integration

### Embed ADTV Dashboard in Your App

```typescript
// your-app/src/pages/EventCampaigns.tsx

import React from 'react';

export function EventCampaignsPage() {
  const adtvUrl = process.env.REACT_APP_ADTV_WEB_URL;
  const token = localStorage.getItem('auth_token');
  
  return (
    <div className="campaigns-container">
      <h1>Event Campaigns</h1>
      
      {/* Option 1: iFrame embed */}
      <iframe
        src={`${adtvUrl}/campaigns?token=${token}`}
        width="100%"
        height="800px"
        frameBorder="0"
      />
      
      {/* Option 2: Popup window */}
      <button onClick={() => {
        window.open(
          `${adtvUrl}/campaigns?token=${token}`,
          'ADTV Campaigns',
          'width=1200,height=800'
        );
      }}>
        Open Campaign Manager
      </button>
    </div>
  );
}
```

### Create Custom UI with ADTV API

```typescript
// your-app/src/components/CampaignWidget.tsx

import React, { useState, useEffect } from 'react';
import adtv from '@/services/adtv-client';

export function CampaignWidget({ campaignId }: { campaignId: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adtv.getCampaignStats(campaignId)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="campaign-stats">
      <h3>Campaign Performance</h3>
      <div className="stat-grid">
        <div className="stat">
          <span className="label">Total Contacts</span>
          <span className="value">{stats.totals.contacts}</span>
        </div>
        <div className="stat">
          <span className="label">Messages Sent</span>
          <span className="value">{stats.totals.outbound}</span>
        </div>
        <div className="stat">
          <span className="label">Responses</span>
          <span className="value">{stats.totals.inbound}</span>
        </div>
        <div className="stat">
          <span className="label">RSVP Confirmed</span>
          <span className="value">{stats.funnel.rsvpConfirmed}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Environment Configuration

### Shared Environment Variables

```bash
# .env (both apps)

# Shared
DATABASE_URL=postgresql://...
JWT_SECRET=same_secret_for_both
NODE_ENV=production

# ADTV-specific
ADTV_API_URL=https://adtv-server.onrender.com
SMS_PROVIDER=bonzo
BONZO_API_KEY=...
# ... other ADTV env vars

# Your app-specific
YOUR_APP_API_KEY=...
```

### Configuration Service

```typescript
// packages/config/src/index.ts

export const config = {
  database: {
    url: process.env.DATABASE_URL!
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET!,
    tokenExpiry: '7d'
  },
  adtv: {
    apiUrl: process.env.ADTV_API_URL || 'http://localhost:4000',
    enabled: process.env.ADTV_ENABLED !== 'false'
  },
  messaging: {
    smsProvider: process.env.SMS_PROVIDER || 'mock',
    bonzoApiKey: process.env.BONZO_API_KEY,
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID
  }
};

// Use in both apps
import { config } from '@yourorg/config';
```

---

## Testing Integration

### Integration Test Suite

```typescript
// tests/integration/adtv-integration.test.ts

import { ADTVClient } from '@/services/adtv-client';

describe('ADTV Integration', () => {
  let adtv: ADTVClient;
  let testCampaignId: string;

  beforeAll(() => {
    adtv = new ADTVClient(process.env.ADTV_API_URL!);
  });

  test('should create campaign', async () => {
    const campaign = await adtv.createCampaign({
      name: 'Test Campaign',
      ownerName: 'Test Owner',
      ownerEmail: 'test@example.com',
      eventType: 'Virtual',
      eventDate: '2025-12-01T10:00:00Z'
    });

    expect(campaign).toHaveProperty('id');
    expect(campaign.name).toBe('Test Campaign');
    testCampaignId = campaign.id;
  });

  test('should add contacts to campaign', async () => {
    const result = await adtv.bulkAddContacts(testCampaignId, [
      { name: 'Contact 1', email: 'contact1@example.com', phone: '+1234567890' },
      { name: 'Contact 2', email: 'contact2@example.com' }
    ]);

    expect(result.count).toBe(2);
  });

  test('should fetch campaign stats', async () => {
    const stats = await adtv.getCampaignStats(testCampaignId);

    expect(stats.totals.contacts).toBe(2);
  });

  test('should send SMS', async () => {
    const result = await adtv.sendSms('+1234567890', 'Test message');

    expect(result.ok).toBe(true);
  });
});
```

---

These examples cover the main integration patterns. Choose the approach that best fits your project structure and requirements. For more details, see `SETUP_INSTRUCTIONS.md`.


