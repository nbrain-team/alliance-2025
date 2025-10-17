# Migration Checklist

Use this checklist to track your progress when migrating and integrating the ADTV Event Automation platform.

## Pre-Migration Planning

- [ ] Review complete `SETUP_INSTRUCTIONS.md`
- [ ] Review `ARCHITECTURE_OVERVIEW.md` to understand system design
- [ ] Review `INTEGRATION_EXAMPLES.md` for integration patterns
- [ ] Decide on integration approach:
  - [ ] Standalone deployment (separate services)
  - [ ] Monorepo integration (shared codebase)
  - [ ] Module extraction (specific features only)
- [ ] Identify which ADTV features you need:
  - [ ] Campaign management
  - [ ] SMS messaging
  - [ ] Email messaging
  - [ ] Voicemail drops
  - [ ] Analytics dashboard
  - [ ] Template builder
  - [ ] Unified inbox
- [ ] Document existing systems that will integrate with ADTV
- [ ] Plan data migration strategy (if applicable)

## Account Setup

### Render Account
- [ ] Create Render account (if not already have one)
- [ ] Add payment method (if using paid plans)
- [ ] Choose deployment region (closest to users)

### External Services (Optional - based on needs)
- [ ] **Bonzo** (SMS - Primary)
  - [ ] Create Bonzo account
  - [ ] Get API key from dashboard
  - [ ] Note down from number
- [ ] **Twilio** (SMS - Backup)
  - [ ] Create Twilio account
  - [ ] Get Account SID and Auth Token
  - [ ] Purchase phone number or create messaging service
- [ ] **Slybroadcast** (Voicemail)
  - [ ] Create Slybroadcast account
  - [ ] Get API credentials
  - [ ] Note down caller ID
- [ ] **ElevenLabs** (Text-to-Speech)
  - [ ] Create ElevenLabs account
  - [ ] Get API key
  - [ ] Choose voice ID
- [ ] **Google Cloud** (Gmail OAuth - Optional)
  - [ ] Create Google Cloud project
  - [ ] Enable Gmail API
  - [ ] Create OAuth credentials
  - [ ] Add authorized redirect URI

## Code Setup

### Copy Files
- [ ] Create destination directory in your project
- [ ] Copy `apps/server` directory
- [ ] Copy `apps/web` directory
- [ ] Copy `templates.csv` to project root
- [ ] Copy `env.template` and rename to `.env`

### Server Setup
- [ ] Navigate to `apps/server`
- [ ] Run `pnpm install`
- [ ] Verify `package.json` scripts are correct
- [ ] Verify `tsconfig.json` is present
- [ ] Check `prisma/schema.prisma` is present

### Frontend Setup
- [ ] Navigate to `apps/web`
- [ ] Run `pnpm install`
- [ ] Verify `package.json` scripts are correct
- [ ] Verify `vite.config.ts` is present
- [ ] Check `tailwind.config.ts` is present

## Database Configuration

### Local Development Database
- [ ] Install PostgreSQL locally (if not already)
- [ ] Create database: `createdb adtv_events`
- [ ] Update `DATABASE_URL` in `.env`
- [ ] Test connection: `cd apps/server && pnpm prisma db pull`

### Render Production Database
- [ ] Log into Render dashboard
- [ ] Click "New +" → "PostgreSQL"
- [ ] Configure database:
  - [ ] Name: `adtv-events-db`
  - [ ] Choose plan (Free for testing, paid for production)
  - [ ] Choose region (same as web service)
- [ ] Click "Create Database"
- [ ] Wait for provisioning to complete
- [ ] Copy "Internal Database URL" from dashboard
- [ ] Save URL securely for next steps

### Database Schema
- [ ] Navigate to `apps/server`
- [ ] Run `pnpm prisma generate`
- [ ] Run migrations: `pnpm prisma migrate deploy`
  - [ ] OR push schema: `pnpm prisma db push` (development only)
- [ ] Verify tables created: `pnpm prisma studio`
- [ ] Check tables exist:
  - [ ] User
  - [ ] Campaign
  - [ ] Contact
  - [ ] Template
  - [ ] Node
  - [ ] Edge
  - [ ] CampaignNode
  - [ ] CampaignEdge
  - [ ] Conversation
  - [ ] Message
  - [ ] ContentTemplate
  - [ ] TemplateVersion

## Environment Configuration

### Generate Secrets
- [ ] Generate JWT secret: `openssl rand -base64 32`
- [ ] Generate webhook token (optional): `openssl rand -hex 32`
- [ ] Save secrets securely

### Server Environment Variables (`apps/server/.env`)
- [ ] **Core**
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET`
  - [ ] `PORT` (default: 4000)
  - [ ] `PUBLIC_BASE_URL`
- [ ] **SMS** (choose provider)
  - [ ] `SMS_PROVIDER` (bonzo or twilio)
  - [ ] Bonzo:
    - [ ] `BONZO_API_BASE_URL`
    - [ ] `BONZO_API_KEY`
    - [ ] `BONZO_FROM_NUMBER`
    - [ ] `BONZO_ON_BEHALF_OF`
    - [ ] `BONZO_SEND_AS`
    - [ ] `BONZO_SEND_PATH`
  - [ ] Twilio:
    - [ ] `TWILIO_ACCOUNT_SID`
    - [ ] `TWILIO_AUTH_TOKEN`
    - [ ] `TWILIO_FROM_NUMBER` OR `TWILIO_MESSAGING_SERVICE_SID`
- [ ] **Email**
  - [ ] `SMTP_HOST`
  - [ ] `SMTP_PORT`
  - [ ] `SMTP_SECURE`
  - [ ] `SMTP_USER`
  - [ ] `SMTP_PASS`
- [ ] **Voicemail** (optional)
  - [ ] `VOICEMAIL_PROVIDER`
  - [ ] `SLYBROADCAST_API_BASE_URL`
  - [ ] `SLYBROADCAST_USERNAME`
  - [ ] `SLYBROADCAST_PASSWORD`
  - [ ] `SLYBROADCAST_CALLER_ID`
- [ ] **TTS** (optional, for voicemail)
  - [ ] `ELEVENLABS_API_KEY`
  - [ ] `ELEVENLABS_VOICE_ID`
  - [ ] `ELEVENLABS_MODEL_ID`
- [ ] **Google OAuth** (optional)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_REDIRECT_URI`

### Frontend Environment Variables (`apps/web/.env`)
- [ ] `VITE_API_URL` (backend URL)

## Local Testing

### Test Backend
- [ ] Start server: `cd apps/server && pnpm dev`
- [ ] Check health endpoint: `curl http://localhost:4000/health`
- [ ] Verify response: `{"ok":true}`
- [ ] Check server logs for errors
- [ ] Test database connection (server should start without errors)

### Test Database
- [ ] Open Prisma Studio: `cd apps/server && pnpm prisma studio`
- [ ] Verify all tables are visible
- [ ] Try creating a test record
- [ ] Verify templates load: `curl http://localhost:4000/api/content-templates`

### Test SMS (Optional)
- [ ] Send test SMS: 
  ```bash
  curl -X POST http://localhost:4000/api/sms/send \
    -H "Content-Type: application/json" \
    -d '{"to":"+1YOUR_PHONE","text":"Test from ADTV"}'
  ```
- [ ] Check response for success
- [ ] Verify SMS received (if using real provider)
- [ ] Check server logs for provider calls

### Test Email (Optional)
- [ ] Send test email:
  ```bash
  curl -X POST http://localhost:4000/api/test-email \
    -H "Content-Type: application/json" \
    -d '{"to":"your@email.com","subject":"Test","text":"Hello from ADTV"}'
  ```
- [ ] Check response for success
- [ ] Verify email received
- [ ] Check spam folder if not in inbox

### Test Frontend
- [ ] Start frontend: `cd apps/web && pnpm dev`
- [ ] Open browser to `http://localhost:5173`
- [ ] Verify app loads without errors
- [ ] Check browser console for errors
- [ ] Test navigation:
  - [ ] Dashboard page loads
  - [ ] Campaigns page loads
  - [ ] Templates page loads
  - [ ] Inbox page loads
- [ ] Check API connectivity (Network tab in DevTools)

### Integration Tests (Optional)
- [ ] Create test campaign via UI
- [ ] Import test contacts (CSV)
- [ ] Send test message to one contact
- [ ] Verify message appears in inbox
- [ ] Check analytics update

## Render Deployment

### Backend Deployment
- [ ] Log into Render dashboard
- [ ] Click "New +" → "Web Service"
- [ ] Connect Git repository
- [ ] Configure service:
  - [ ] Name: `adtv-events-server`
  - [ ] Region: (same as database)
  - [ ] Branch: `main`
  - [ ] Root Directory: `apps/server`
  - [ ] Runtime: `Node`
  - [ ] Build Command: `pnpm install && pnpm build`
  - [ ] Start Command: `pnpm start`
  - [ ] Plan: Starter or higher
- [ ] Add all environment variables from local `.env`
  - [ ] Use Render's Internal Database URL for `DATABASE_URL`
  - [ ] Update `PUBLIC_BASE_URL` to Render service URL
- [ ] Click "Create Web Service"
- [ ] Wait for deployment (may take 5-10 minutes)
- [ ] Check deployment logs for errors
- [ ] Verify deploy succeeded

### Backend Verification
- [ ] Test health endpoint: `curl https://adtv-events-server.onrender.com/health`
- [ ] Expected response: `{"ok":true}`
- [ ] Check "Logs" tab for any errors
- [ ] Verify database connection in logs
- [ ] Test API endpoint: `curl https://adtv-events-server.onrender.com/api/templates`

### Frontend Deployment
- [ ] In Render dashboard, click "New +" → "Static Site"
- [ ] Connect same Git repository
- [ ] Configure site:
  - [ ] Name: `adtv-events-web`
  - [ ] Branch: `main`
  - [ ] Root Directory: `apps/web`
  - [ ] Build Command: `pnpm install && pnpm build`
  - [ ] Publish Directory: `dist`
- [ ] Add environment variable:
  - [ ] `VITE_API_URL` = `https://adtv-events-server.onrender.com`
- [ ] Click "Create Static Site"
- [ ] Wait for build and deployment
- [ ] Check build logs for errors
- [ ] Verify deploy succeeded

### Frontend Verification
- [ ] Visit deployed URL: `https://adtv-events-web.onrender.com`
- [ ] Verify site loads
- [ ] Check browser console for errors
- [ ] Test navigation through all pages
- [ ] Open DevTools Network tab
- [ ] Perform an action (e.g., view campaigns)
- [ ] Verify API calls go to correct backend URL
- [ ] Check API responses are successful (200 status)

## Post-Deployment Configuration

### CORS Configuration
- [ ] Update backend CORS settings if needed:
  ```typescript
  app.use(cors({
    origin: [
      'https://adtv-events-web.onrender.com',
      'https://your-custom-domain.com'
    ]
  }));
  ```
- [ ] Redeploy if changed

### Webhook URLs
- [ ] **Twilio** (if using):
  - [ ] Go to Twilio Console → Phone Numbers
  - [ ] Select your number
  - [ ] Set SMS webhook: `https://adtv-events-server.onrender.com/api/twilio/inbound-sms`
  - [ ] Method: POST
  - [ ] Save
- [ ] **Bonzo** (if using):
  - [ ] Go to Bonzo Dashboard → Settings → Webhooks
  - [ ] Add webhook URL: `https://adtv-events-server.onrender.com/api/bonzo/inbound-sms`
  - [ ] Add token parameter if using: `?token=YOUR_WEBHOOK_TOKEN`
  - [ ] Save

### Custom Domains (Optional)
- [ ] Purchase domain or use existing
- [ ] **Backend**:
  - [ ] Go to Render service → Settings → Custom Domain
  - [ ] Add domain (e.g., `api.yourdomain.com`)
  - [ ] Update DNS records as instructed
  - [ ] Wait for SSL certificate provisioning
  - [ ] Update `PUBLIC_BASE_URL` in environment variables
- [ ] **Frontend**:
  - [ ] Go to Render static site → Settings → Custom Domain
  - [ ] Add domain (e.g., `campaigns.yourdomain.com`)
  - [ ] Update DNS records
  - [ ] Wait for SSL certificate
  - [ ] Update `VITE_API_URL` in environment variables and redeploy

### SSL/HTTPS
- [ ] Verify Render auto-provisions SSL certificates
- [ ] Test HTTPS endpoints work
- [ ] Ensure no mixed content warnings in browser

## Data Seeding

### Content Templates
- [ ] Verify `templates.csv` in repo root
- [ ] Templates auto-load on first API call
- [ ] Or manually seed:
  ```bash
  curl https://adtv-events-server.onrender.com/api/content-templates
  ```
- [ ] Verify templates loaded: check response has items

### Create Admin User
- [ ] Create first user via API:
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
- [ ] Login to test:
  ```bash
  curl -X POST https://adtv-events-server.onrender.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@example.com","password":"secure_password"}'
  ```
- [ ] Save JWT token from response

### Create Sample Campaign (Optional)
- [ ] Create template first (via UI or API)
- [ ] Create campaign referencing template
- [ ] Import sample contacts
- [ ] Test campaign execution

## Integration with Existing Project

### API Integration
- [ ] Copy `ADTVClient` from `INTEGRATION_EXAMPLES.md`
- [ ] Add to your project: `src/services/adtv-client.ts`
- [ ] Set environment variable: `ADTV_API_URL`
- [ ] Test connection from your app

### Authentication Integration
- [ ] If sharing auth:
  - [ ] Use same `JWT_SECRET` in both apps
  - [ ] Implement shared auth middleware
  - [ ] Test token works across both systems

### Database Integration
- [ ] If sharing database:
  - [ ] Merge Prisma schemas
  - [ ] Run migrations
  - [ ] Update imports in both apps
  - [ ] Test queries work

### Frontend Integration
- [ ] If embedding:
  - [ ] Add iFrame or popup link in your UI
  - [ ] Pass auth token in URL or postMessage
  - [ ] Test embedded view works

## Testing & Verification

### Functional Testing
- [ ] **Campaign Management**
  - [ ] Create campaign from template
  - [ ] Import contacts via CSV
  - [ ] View campaign details
  - [ ] Update campaign settings
  - [ ] Delete test campaign
- [ ] **Messaging**
  - [ ] Send SMS to test number
  - [ ] Send email to test address
  - [ ] Drop voicemail (if configured)
  - [ ] Verify messages logged in database
- [ ] **Inbox**
  - [ ] View conversations list
  - [ ] Open conversation thread
  - [ ] Send reply
  - [ ] Verify inbound webhook (send SMS to your number)
- [ ] **Analytics**
  - [ ] View platform-wide stats
  - [ ] View campaign-specific stats
  - [ ] Check charts render
  - [ ] Verify data accuracy
- [ ] **Templates**
  - [ ] Create new template
  - [ ] Build funnel graph
  - [ ] Save template
  - [ ] Export template to CSV
  - [ ] Import template from CSV

### Performance Testing
- [ ] Test with 100 contacts
- [ ] Test with 1000 contacts (if applicable)
- [ ] Check response times in logs
- [ ] Monitor Render metrics dashboard
- [ ] Check database query performance

### Error Handling
- [ ] Test with invalid phone numbers
- [ ] Test with invalid email addresses
- [ ] Test with missing required fields
- [ ] Verify error messages are user-friendly
- [ ] Check errors logged properly

## Monitoring & Maintenance

### Set Up Monitoring
- [ ] **Render Dashboard**
  - [ ] Monitor CPU usage
  - [ ] Monitor memory usage
  - [ ] Monitor response times
  - [ ] Set up email alerts for errors
- [ ] **Database Monitoring**
  - [ ] Check connection count
  - [ ] Monitor table sizes
  - [ ] Review slow queries (if available)
- [ ] **Application Logs**
  - [ ] Review error logs daily
  - [ ] Set up log aggregation (optional)
  - [ ] Create alerts for critical errors

### Backup Strategy
- [ ] **Database**
  - [ ] Verify Render auto-backups enabled
  - [ ] Test manual backup: `pg_dump $DATABASE_URL > backup.sql`
  - [ ] Store backup securely
  - [ ] Document restore procedure
- [ ] **Environment Variables**
  - [ ] Export all environment variables to secure document
  - [ ] Update password manager with credentials
  - [ ] Document webhook URLs
- [ ] **Code**
  - [ ] Ensure code committed to Git
  - [ ] Tag release version
  - [ ] Document deployment commit SHA

### Documentation
- [ ] Document custom configuration
- [ ] Document integration points with your app
- [ ] Update team wiki/docs with ADTV info
- [ ] Create runbook for common operations
- [ ] Document troubleshooting steps

## Security Checklist

- [ ] All environment variables stored in Render (not in code)
- [ ] `.env` files added to `.gitignore`
- [ ] JWT secret is strong (32+ characters)
- [ ] Database uses strong password
- [ ] HTTPS enabled on all endpoints
- [ ] CORS configured for specific origins
- [ ] Webhook tokens configured (if applicable)
- [ ] All passwords use app passwords (Gmail)
- [ ] No credentials in logs
- [ ] Security headers configured (optional)
- [ ] Rate limiting configured (optional)

## Performance Optimization (Optional)

- [ ] Add database indexes:
  ```sql
  CREATE INDEX idx_contacts_campaign ON "Contact"("campaignId");
  CREATE INDEX idx_messages_convo ON "Message"("conversationId");
  CREATE INDEX idx_contacts_phone ON "Contact"("phone");
  ```
- [ ] Configure connection pooling (for high traffic)
- [ ] Set up Redis cache (optional)
- [ ] Enable CDN for frontend static assets
- [ ] Optimize Prisma queries (use `select` instead of full object)
- [ ] Add database replicas for read scaling

## Go-Live Checklist

- [ ] All tests passing
- [ ] Production environment variables set
- [ ] Database migrations completed
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] Team trained on platform
- [ ] Support process defined
- [ ] Rollback plan documented
- [ ] Success metrics defined
- [ ] Announce launch to stakeholders

## Post-Launch

- [ ] Monitor logs for errors (first 24 hours)
- [ ] Check performance metrics
- [ ] Verify webhooks receiving data
- [ ] Test key user flows
- [ ] Collect user feedback
- [ ] Address any issues immediately
- [ ] Schedule first maintenance window
- [ ] Plan future enhancements

---

## Notes

Use this checklist as a guide. Not all items may apply to your specific integration. Adjust based on your needs and environment.

For questions or issues, refer to:
- `SETUP_INSTRUCTIONS.md` - Complete setup guide
- `INTEGRATION_EXAMPLES.md` - Code examples
- `ARCHITECTURE_OVERVIEW.md` - System design details

---

**Checklist Progress**: [  ] / [Total Items]

**Status**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

**Notes**:
_Add any custom notes or decisions here_


