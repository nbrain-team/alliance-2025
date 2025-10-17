# Architecture Overview

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Client Layer                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │   Web Browser    │  │   Mobile App     │  │  External API │  │
│  │   (React SPA)    │  │   (Future)       │  │   Consumers   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘  │
└───────────┼──────────────────────┼──────────────────────┼─────────┘
            │                      │                      │
            │      HTTPS/REST      │                      │
            └──────────┬───────────┴──────────────────────┘
                       │
┌──────────────────────▼────────────────────────────────────────────┐
│                      API Gateway Layer                             │
│                    (Express.js Server)                             │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Authentication Middleware                        │ │
│  │         JWT Token Validation, CORS, Rate Limiting             │ │
│  └───────────────────────┬──────────────────────────────────────┘ │
│                          │                                          │
│  ┌───────────────────────▼──────────────────────────────────────┐ │
│  │                    Route Controllers                          │ │
│  │  ┌────────────┬────────────┬────────────┬────────────┐      │ │
│  │  │ Campaigns  │ Templates  │ Messaging  │  Analytics │      │ │
│  │  │   /api     │   /api     │   /api     │    /api    │      │ │
│  │  └────────────┴────────────┴────────────┴────────────┘      │ │
│  └───────────────────────┬──────────────────────────────────────┘ │
└────────────────────────────┼──────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼──────┐  ┌─────────▼────────┐
│  Service Layer  │  │  Data Layer   │  │ External Services│
│  ┌───────────┐  │  │  ┌─────────┐  │  │  ┌────────────┐  │
│  │ SMS       │  │  │  │ Prisma  │  │  │  │ Bonzo API  │  │
│  │ Provider  │  │  │  │ ORM     │  │  │  ├────────────┤  │
│  ├───────────┤  │  │  └────┬────┘  │  │  │ Twilio API │  │
│  │ Email     │  │  │       │       │  │  ├────────────┤  │
│  │ Service   │  │  │       │       │  │  │ElevenLabs  │  │
│  ├───────────┤  │  │       │       │  │  ├────────────┤  │
│  │ Voicemail │  │  │       │       │  │  │Slybroadcast│  │
│  │ Provider  │  │  │       │       │  │  ├────────────┤  │
│  ├───────────┤  │  │       │       │  │  │ Gmail API  │  │
│  │ TTS       │  │  │       │       │  │  └────────────┘  │
│  │ Service   │  │  │       │       │  │                  │
│  └───────────┘  │  │       │       │  └──────────────────┘
└─────────────────┘  │       │       │
                     │       │       │
              ┌──────▼───────▼───────▼──────┐
              │      PostgreSQL Database     │
              │  ┌─────────────────────────┐ │
              │  │ Users, Campaigns,       │ │
              │  │ Contacts, Templates,    │ │
              │  │ Messages, Conversations │ │
              │  └─────────────────────────┘ │
              └──────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend Application (React SPA)

**Purpose**: User interface for campaign management, messaging, and analytics.

**Technology**:
- React 18 (functional components + hooks)
- TypeScript (type safety)
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- React Router v6 (routing)

**Key Pages**:
- **Dashboard**: Platform overview with key metrics
- **Campaigns**: List and manage campaigns
- **CampaignBuilder**: Visual funnel workflow builder
- **Templates**: Create and manage reusable templates
- **Inbox**: Unified message inbox
- **Leads**: Contact management
- **Analytics**: Campaign performance metrics

**State Management**:
```typescript
// Zustand store structure
interface AppStore {
  user: User | null;
  campaigns: Campaign[];
  contacts: Contact[];
  templates: Template[];
  conversations: Conversation[];
  // ... getters and setters
}
```

**API Communication**:
- REST API client (`lib/api.ts`)
- JWT token stored in localStorage
- Automatic token refresh
- Error handling with toast notifications

---

### 2. Backend API (Express.js)

**Purpose**: RESTful API server handling business logic, data access, and external service integration.

**Technology**:
- Node.js + TypeScript
- Express.js (web framework)
- Prisma (ORM)
- Zod (runtime validation)
- JWT (authentication)

**Architecture Pattern**: Layered Architecture
```
Controllers → Services → Database
     ↓
  Middleware
```

**Key Modules**:

#### Authentication & Authorization
```typescript
// JWT-based authentication
app.use(authMiddleware); // Decodes JWT from Authorization header

function authMiddleware(req, res, next) {
  // Extract token from header
  // Verify token with JWT_SECRET
  // Attach user to request object
}
```

#### Campaign Management
- **Create Campaign**: Clone template graph, initialize contacts
- **Update Campaign**: Modify campaign details, status
- **Execute Campaign**: Process workflow nodes, send messages
- **Campaign Graph**: Store and retrieve funnel workflows

#### Template System
- **Template CRUD**: Create, read, update, delete templates
- **Graph Management**: Store nodes and edges
- **Version Control**: Track template modifications per campaign
- **CSV Import/Export**: Serialize templates for portability

#### Messaging Layer
- **Provider Abstraction**: Unified interface for SMS, Email, Voicemail
- **Merge Tags**: Dynamic content personalization
- **Conversation Tracking**: Log all messages with metadata
- **Webhook Handlers**: Process inbound messages

#### Analytics Engine
- **Real-time Stats**: Campaign performance metrics
- **Time-series Data**: Message activity by day
- **Funnel Metrics**: Status progression tracking

---

### 3. Database Layer (PostgreSQL + Prisma)

**Purpose**: Persistent data storage with type-safe ORM access.

**Schema Design Principles**:
- Normalized relational design
- Foreign key relationships
- Indexes on frequently queried fields
- JSON columns for flexible data (configJson, rawJson)

**Core Data Models**:

#### User Management
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  role          String   // bdr | admin
  passwordHash  String
  
  // Per-user messaging credentials
  smsFromNumber String?
  vmCallerId    String?
  smtpHost      String?
  smtpPort      Int?
  
  // Google OAuth
  googleAccessToken  String?
  googleRefreshToken String?
  
  campaigns     Campaign[]
}
```

#### Campaign System
```prisma
model Campaign {
  id            String   @id @default(cuid())
  name          String
  status        String   // draft | active | completed
  
  // Event details
  eventType     String
  eventDate     DateTime
  ownerName     String
  ownerEmail    String
  
  // Template reference
  templateId    String?
  template      Template? @relation(fields: [templateId], references: [id])
  
  // Cloned workflow
  nodes         CampaignNode[]
  edges         CampaignEdge[]
  
  // Contacts
  contacts      Contact[]
  
  // Analytics
  totalContacts    Int @default(0)
  enrichedContacts Int @default(0)
  emailsGenerated  Int @default(0)
}
```

#### Template & Graph System
```prisma
model Template {
  id        String   @id @default(cuid())
  name      String
  status    String   @default("draft")
  version   Int      @default(1)
  
  nodes     Node[]
  edges     Edge[]
  versions  TemplateVersion[]
}

model Node {
  id         String   @id @default(cuid())
  templateId String
  template   Template @relation(fields: [templateId], references: [id])
  
  key        String   // Graph identifier (e.g., "N10")
  type       String   // stage | sms_send | email_send | voicemail_drop | wait
  name       String
  configJson String?  // Node-specific config (template_id, wait_time, etc.)
  
  posX       Float?   // Canvas position
  posY       Float?
}

model Edge {
  id            String   @id @default(cuid())
  templateId    String
  template      Template @relation(fields: [templateId], references: [id])
  
  fromKey       String   // Source node
  toKey         String   // Target node
  conditionJson String?  // Routing logic
}
```

#### Messaging System
```prisma
model Contact {
  id        String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id])
  
  name      String
  email     String?
  phone     String?
  company   String?
  
  status    String   // No Activity | Needs BDR | Received RSVP | etc.
  stageKey  String?  // Current position in funnel
  
  conversations Conversation[]
}

model Conversation {
  id        String   @id @default(cuid())
  contactId String
  contact   Contact  @relation(fields: [contactId], references: [id])
  
  channel   String   // sms | email
  messages  Message[]
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  
  direction      String   // in | out
  text           String
  subject        String?
  
  provider       String?  // smtp | twilio | bonzo | gmail | slybroadcast
  providerMessageId String?
  providerThreadId  String?
  
  createdAt      DateTime @default(now())
}
```

**Relationships**:
- Campaign ←→ Template (many-to-one, optional)
- Campaign ←→ Contact (one-to-many)
- Campaign ←→ CampaignNode (one-to-many)
- Contact ←→ Conversation (one-to-many)
- Conversation ←→ Message (one-to-many)
- Template ←→ Node/Edge (one-to-many)

**Indexes** (for performance):
```sql
CREATE INDEX idx_contacts_campaign ON "Contact"("campaignId");
CREATE INDEX idx_messages_conversation ON "Message"("conversationId");
CREATE INDEX idx_contacts_phone ON "Contact"("phone");
CREATE INDEX idx_contacts_email ON "Contact"("email");
CREATE INDEX idx_messages_direction ON "Message"("direction");
```

---

### 4. Service Layer

**Purpose**: Encapsulate external service integrations and business logic.

#### SMS Provider Service

**Responsibility**: Abstract SMS sending across multiple providers.

```typescript
// smsProvider.ts
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  const provider = process.env.SMS_PROVIDER;
  
  if (provider === 'bonzo') {
    return sendViaBonzo(input);
  } else if (provider === 'twilio') {
    return sendViaTwilio(input);
  } else {
    return { sent: false, provider: 'mock' }; // Local testing
  }
}
```

**Bonzo Integration**:
- API: `POST /v3/prospects/create-or-update-and-message`
- Features: Prospect creation, opt-in management, message sending
- Auth: Bearer token

**Twilio Integration**:
- API: Twilio REST API
- Features: SMS sending, delivery status, webhooks
- Auth: Account SID + Auth Token

#### Email Service

**SMTP Integration**:
```typescript
// Uses nodemailer
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS }
});
```

**Gmail OAuth Integration**:
- API: Google Gmail API
- Features: Read emails, sync replies, send via OAuth
- Auth: OAuth 2.0 with refresh tokens

#### Voicemail Provider Service

**Slybroadcast Integration**:
- API: `POST /gateway/vmb.php`
- Features: Direct-to-voicemail drops
- Requires: Audio file URL

**ElevenLabs TTS Integration**:
- API: `POST /v1/text-to-speech/:voice_id`
- Features: Convert text scripts to MP3 audio
- Used for: Dynamic voicemail generation

**Flow**:
1. Generate MP3 from TTS script (ElevenLabs)
2. Store MP3 temporarily on server
3. Pass public URL to Slybroadcast
4. Slybroadcast delivers voicemail

#### Media Storage Service

**Temporary MP3 Storage**:
```typescript
// In-memory store (development)
const mediaStore = new Map<string, Buffer>();

export function storeVoicemailMp3(buffer: Buffer): string {
  const id = generateId();
  mediaStore.set(id, buffer);
  return id; // Used in URL: /media/vm/{id}.mp3
}
```

**Production**: Replace with S3/GCS/CDN

---

## Data Flow

### Campaign Creation Flow

```
User (Frontend)
    │
    │ POST /api/campaigns
    │ { name, templateId, eventDate, ... }
    ▼
Express Controller
    │
    │ Validate input (Zod)
    ▼
Database (Prisma)
    │
    │ 1. Create Campaign record
    │ 2. Clone Template nodes → CampaignNodes
    │ 3. Clone Template edges → CampaignEdges
    │ 4. Return Campaign object
    ▼
Frontend
    │
    │ Navigate to CampaignDetail page
    └─→ User can now import contacts and execute
```

### Message Sending Flow

```
User Action (Send SMS)
    │
    │ POST /api/campaigns/:id/execute-sms
    ▼
API Controller
    │
    │ 1. Fetch Campaign
    │ 2. Fetch Contacts
    │ 3. Fetch SMS Node config
    ▼
For each Contact:
    │
    │ 4. Resolve SMS text from ContentTemplate
    │ 5. Render merge tags ({{contact.name}}, etc.)
    │
    ▼
SMS Service
    │
    │ 6. Send via Bonzo/Twilio API
    │
    ▼
Log Message
    │
    │ 7. Ensure Conversation exists
    │ 8. Create Message record (direction: 'out')
    │
    ▼
Return Response
    │
    └─→ { ok: true, sent: 42 }
```

### Inbound Webhook Flow

```
SMS Received (Twilio/Bonzo)
    │
    │ POST /api/twilio/inbound-sms
    │ { From: "+1234567890", Body: "Hello" }
    ▼
Webhook Handler
    │
    │ 1. Extract phone number (last 10 digits)
    │ 2. Find Contact by phone (fuzzy match)
    │
    ▼
If Contact Found:
    │
    │ 3. Find or create Conversation (channel: 'sms')
    │ 4. Create Message (direction: 'in')
    │ 5. Update Contact status → 'Needs BDR'
    │
    ▼
Return TwiML
    │
    └─→ <Response></Response> (empty, no auto-reply)
```

### Analytics Aggregation Flow

```
Dashboard Load
    │
    │ GET /api/stats
    ▼
Analytics Controller
    │
    │ 1. Count total contacts
    │ 2. Count total campaigns
    │ 3. Fetch recent messages (last 500)
    │
    ▼
Aggregate Data:
    │
    │ 4. Count inbound/outbound messages
    │ 5. Count by status (RSVP, Attended, etc.)
    │ 6. Build time-series (messages per day, last 30 days)
    │
    ▼
Return Stats Object
    │
    └─→ {
          enrolled: 1523,
          messaged: 4231,
          respondedPos: 423,
          messagesByDay: [...]
        }
```

---

## Security Architecture

### Authentication Flow

```
1. User Login
   └─→ POST /api/auth/login { email, password }
       │
       ▼ Verify bcrypt password hash
       │
       ▼ Generate JWT token
       │   Payload: { id, email, role }
       │   Secret: JWT_SECRET
       │   Expiry: 7 days
       │
       └─→ Return { token, user }

2. Authenticated Requests
   └─→ Header: Authorization: Bearer <token>
       │
       ▼ authMiddleware extracts token
       │
       ▼ Verify with JWT_SECRET
       │
       └─→ Attach req.user = { id, email, role }
```

### Authorization Patterns

**Role-based** (future enhancement):
```typescript
function requireRole(role: string) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.delete('/api/campaigns/:id', requireRole('admin'), async (req, res) => {
  // Only admins can delete campaigns
});
```

**Resource-based** (current):
```typescript
// Users can only access their own campaigns (if senderUserId set)
const campaign = await prisma.campaign.findFirst({
  where: {
    id: campaignId,
    senderUserId: req.user.id
  }
});
```

### Input Validation

**Zod Schemas**:
```typescript
const createCampaignSchema = z.object({
  name: z.string().min(1),
  ownerEmail: z.string().email(),
  eventDate: z.string().datetime(),
  eventType: z.enum(['In-Person', 'Virtual']),
  // ...
});

// Usage
const body = createCampaignSchema.parse(req.body);
// Throws if validation fails
```

### CORS Configuration

```typescript
app.use(cors({
  origin: [
    'https://adtv-events-web.onrender.com',
    'http://localhost:5173'  // Development
  ],
  credentials: true
}));
```

### Environment Security

- All secrets in environment variables (never committed)
- `.env` files in `.gitignore`
- Render environment variables encrypted at rest
- Database credentials auto-generated by Render
- JWT secret generated with strong entropy

---

## Scalability Considerations

### Current Limitations

- **In-memory Media Store**: Voicemail MP3s stored in memory
  - **Impact**: Doesn't scale across multiple instances
  - **Solution**: Migrate to S3/GCS

- **Single Database Connection**: Prisma connects to single database
  - **Impact**: Connection pool limits concurrent requests
  - **Solution**: Add PgBouncer or connection pooler

- **Synchronous Message Sending**: Campaign execution blocks until all messages sent
  - **Impact**: Long wait times for large campaigns
  - **Solution**: Implement job queue (BullMQ, SQS)

### Horizontal Scaling

**Stateless Design**: API server is stateless (no session storage)
- Can run multiple instances behind load balancer
- Render auto-scales on Pro+ plans

**Database Scaling**:
- Read replicas for analytics queries
- Connection pooling (PgBouncer)
- Caching layer (Redis)

### Performance Optimization

**Database Indexes**:
```sql
-- Already indexed by Prisma @id
-- Add these for common queries:
CREATE INDEX idx_contacts_campaign ON "Contact"("campaignId");
CREATE INDEX idx_contacts_status ON "Contact"("status");
CREATE INDEX idx_messages_created ON "Message"("createdAt" DESC);
```

**Query Optimization**:
```typescript
// Bad: Fetch all fields
const contacts = await prisma.contact.findMany();

// Good: Select only needed fields
const contacts = await prisma.contact.findMany({
  select: { id: true, name: true, email: true }
});
```

**Caching Strategy** (future):
```typescript
// Cache content templates in Redis
const templates = await redis.get('content_templates');
if (!templates) {
  const fromDb = await prisma.contentTemplate.findMany();
  await redis.setex('content_templates', 3600, JSON.stringify(fromDb));
  return fromDb;
}
return JSON.parse(templates);
```

---

## Deployment Architecture

### Render Services

```
┌─────────────────────────────────────────────────────────────┐
│                         Render Cloud                         │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │  Static Site    │  │   Web Service    │  │ PostgreSQL │  │
│  │  (Frontend)     │  │   (Backend API)  │  │  Database  │  │
│  │                 │  │                  │  │            │  │
│  │  - React build  │  │  - Node.js app   │  │  - Primary │  │
│  │  - CDN served   │  │  - Auto-scale    │  │  - Backups │  │
│  │  - SSL/HTTPS    │  │  - SSL/HTTPS     │  │  - Metrics │  │
│  └────────┬────────┘  └─────────┬────────┘  └──────┬─────┘  │
│           │                     │                   │        │
│           │  API Calls          │  SQL Queries      │        │
│           └────────────────────►│◄──────────────────┘        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                                │
                                │ Webhooks, API Calls
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌─────────┐  ┌─────────┐  ┌────────────┐  ┌────────────┐  │
│  │  Bonzo  │  │ Twilio  │  │ElevenLabs  │  │    Gmail   │  │
│  └─────────┘  └─────────┘  └────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Build & Deploy Pipeline

```
Code Change
    │
    ▼
Git Push to GitHub
    │
    ▼
Render Detects Push
    │
    ├─────────────────┬──────────────────┐
    │                 │                  │
    ▼                 ▼                  ▼
Backend Build    Frontend Build    (Database: No rebuild)
    │                 │
    │ 1. pnpm install │ 1. pnpm install
    │ 2. prisma gen   │ 2. vite build
    │ 3. tsc build    │ 3. output to dist/
    │ 4. start server │
    │                 │
    ▼                 ▼
Deploy to Instances   Deploy to CDN
    │                 │
    └────────┬────────┘
             │
             ▼
      Health Checks
             │
             ▼
        Live Traffic
```

---

## Error Handling

### API Error Responses

**Standard Format**:
```json
{
  "error": "Human-readable error message"
}
```

**HTTP Status Codes**:
- `200 OK`: Success
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Missing/invalid auth token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource doesn't exist
- `500 Internal Server Error`: Server error

### Try-Catch Patterns

```typescript
app.post('/api/campaigns', async (req, res) => {
  try {
    const body = campaignSchema.parse(req.body); // Throws if invalid
    const campaign = await prisma.campaign.create({ data: body });
    res.json(campaign);
  } catch (e: any) {
    res.status(400).json({ error: e?.message || 'Create failed' });
  }
});
```

### Webhook Error Handling

```typescript
app.post('/api/twilio/inbound-sms', async (req, res) => {
  try {
    // Process webhook
  } catch (e) {
    // Always return 200 to Twilio (don't retry on errors)
    return res.status(200).type('text/xml').send('<Response></Response>');
  }
});
```

---

## Monitoring & Observability

### Logging Strategy

**Console Logging** (current):
```typescript
console.log('[execute] Starting campaign', campaignId);
console.error('[sms] Send failed', { to, error: e.message });
```

**Production Logging** (recommended):
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Metrics

**Render Dashboard**:
- CPU usage (%)
- Memory usage (MB)
- Response time (ms)
- Error rate (5xx responses)
- Instance count

**Application Metrics** (future):
```typescript
// Prometheus metrics
const messagesSentCounter = new promClient.Counter({
  name: 'adtv_messages_sent_total',
  help: 'Total messages sent',
  labelNames: ['provider', 'channel']
});
```

### Health Checks

```typescript
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'Database unreachable' });
  }
});
```

---

## Future Architecture Enhancements

### Job Queue for Async Processing

**Problem**: Campaign execution blocks HTTP request
**Solution**: Offload to background jobs

```
User Request
    │
    ▼
API: Queue Job → Return immediately
    │
    ▼
Job Worker (BullMQ/SQS)
    │
    ▼
Process Campaign → Send Messages
    │
    ▼
Update Status → Notify User
```

### Real-time Updates (WebSockets)

**Problem**: Users must refresh to see new messages
**Solution**: WebSocket connections

```typescript
import { Server } from 'socket.io';

const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('join_campaign', (campaignId) => {
    socket.join(`campaign_${campaignId}`);
  });
});

// On inbound message
io.to(`campaign_${campaignId}`).emit('new_message', message);
```

### API Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Database Sharding

**When**: > 10M contacts
**Strategy**: Shard by Campaign ID

```
Campaign A (ID: 1-1000) → Database Shard 1
Campaign B (ID: 1001-2000) → Database Shard 2
```

---

This architecture is designed for scalability, maintainability, and ease of integration. It follows industry best practices while remaining pragmatic for the current scale.


