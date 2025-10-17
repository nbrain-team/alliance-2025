# Cursor AI Starting Prompt

Copy and paste this prompt into your other Cursor project to get AI assistance with migration:

---

## 📋 PROMPT TO COPY:

```
I need help migrating and embedding the ADTV Event Automation platform into this project.

CONTEXT:
I have a complete, production-ready event marketing automation platform (ADTV) that I want to integrate into this existing project. The ADTV platform includes campaign management, multi-channel messaging (SMS/Email/Voicemail), contact tracking, unified inbox, and analytics.

WHAT I NEED:
Help me integrate ADTV into this project so I can:
1. Use its campaign management features
2. Send SMS/Email/Voicemail through its APIs
3. Track contacts and conversations
4. View analytics and reports
5. [Add any other specific needs]

INTEGRATION APPROACH:
[Choose one or tell me which is best:]
- Option A: Deploy ADTV separately and integrate via REST API (standalone)
- Option B: Merge ADTV into my existing monorepo (deep integration)
- Option C: Extract only specific features I need (module extraction)

DOCUMENTATION LOCATION:
All ADTV documentation and source code is in: `adtv-migration-package/`

KEY FILES TO READ FIRST:
1. adtv-migration-package/CURSOR_INTEGRATION_GUIDE.md - Start here (designed for you, Cursor!)
2. adtv-migration-package/INTEGRATION_EXAMPLES.md - Code examples
3. adtv-migration-package/SETUP_INSTRUCTIONS.md - Complete reference
4. adtv-migration-package/ARCHITECTURE_OVERVIEW.md - System design

INSTRUCTIONS FOR YOU (CURSOR):
1. Read CURSOR_INTEGRATION_GUIDE.md first - it contains everything you need
2. Ask me which integration approach I prefer (A, B, or C above)
3. Help me understand what changes need to be made to THIS project
4. Guide me step-by-step through the integration
5. Reference the documentation files as needed
6. Show me code examples from INTEGRATION_EXAMPLES.md
7. Help me troubleshoot any issues

MY CURRENT PROJECT:
[Describe your current project here - tech stack, architecture, what it does]
- Tech Stack: [e.g., React, Node.js, Express, PostgreSQL, etc.]
- Architecture: [e.g., Monorepo with pnpm, Standalone apps, etc.]
- Current Features: [e.g., User management, Products, etc.]
- Deployment: [e.g., Render, AWS, Vercel, etc.]

WHAT I WANT TO ACHIEVE:
[Be specific about your goals]
- Example: "Add event campaign creation to my admin dashboard"
- Example: "Use ADTV's SMS sending for my notification system"
- Example: "Embed ADTV's campaign builder in my platform"
- Example: "Share authentication between my platform and ADTV"

FIRST QUESTION:
Based on my project description above, which integration approach (A, B, or C) would you recommend and why?

Then, please read the CURSOR_INTEGRATION_GUIDE.md file and help me get started.
```

---

## 📝 How to Use This Prompt

### Step 1: Customize the Prompt
Before pasting, fill in these sections:
- **INTEGRATION APPROACH**: Choose your preferred approach or ask for recommendation
- **MY CURRENT PROJECT**: Describe your existing project's tech stack and architecture
- **WHAT I WANT TO ACHIEVE**: List your specific integration goals

### Step 2: Copy to Other Project
1. Open your target project in Cursor
2. Create a new chat or conversation
3. Paste the customized prompt above
4. Wait for Cursor to read the documentation files

### Step 3: Follow Cursor's Guidance
Cursor will:
- Read CURSOR_INTEGRATION_GUIDE.md automatically
- Recommend an integration approach
- Provide step-by-step instructions
- Show you relevant code examples
- Reference the appropriate documentation files

---

## 💡 Example Customized Prompts

### Example 1: Standalone API Integration

```
I need help migrating and embedding the ADTV Event Automation platform into this project.

CONTEXT:
I have a complete event marketing automation platform (ADTV) in the adtv-migration-package/ folder. I want to integrate it as a standalone service that my main app can call via REST API.

WHAT I NEED:
- Deploy ADTV as separate services on Render
- Call ADTV APIs from my existing Node.js backend
- Display campaign analytics in my React admin dashboard
- Send SMS notifications through ADTV's messaging system

INTEGRATION APPROACH:
Option A: Deploy ADTV separately and integrate via REST API (standalone)

MY CURRENT PROJECT:
- Tech Stack: React, Node.js, Express, PostgreSQL, Tailwind CSS
- Architecture: Monorepo with pnpm workspaces
- Current Features: User management, Product catalog, Order processing
- Deployment: Render (already have backend + frontend deployed)

WHAT I WANT TO ACHIEVE:
1. Deploy ADTV to Render as separate services
2. Create API client wrapper in my backend to call ADTV
3. Add "Campaigns" menu item in my admin that shows ADTV campaigns
4. Use ADTV's SMS API to send order notifications
5. Share JWT authentication between my platform and ADTV

FIRST QUESTION:
Please read the CURSOR_INTEGRATION_GUIDE.md file in adtv-migration-package/ and help me:
1. Deploy ADTV to Render
2. Create the API client wrapper
3. Set up shared authentication

Let's start with deployment. What environment variables do I need?
```

### Example 2: Monorepo Integration

```
I need help migrating and embedding the ADTV Event Automation platform into this project.

CONTEXT:
I have a monorepo with multiple apps and packages. I want to deeply integrate ADTV so we share database, authentication, and UI components.

WHAT I NEED:
- Merge ADTV into my existing monorepo structure
- Share Prisma database schema between my app and ADTV
- Use same JWT tokens for authentication
- Embed ADTV campaign builder in my main app's UI

INTEGRATION APPROACH:
Option B: Merge ADTV into my existing monorepo (deep integration)

MY CURRENT PROJECT:
- Tech Stack: React, Node.js, Express, Prisma, PostgreSQL, Tailwind CSS
- Architecture: pnpm monorepo with packages/ and apps/ folders
- Structure:
  - packages/database (shared Prisma schema)
  - packages/auth (shared JWT auth)
  - packages/ui (shared React components)
  - apps/web (main frontend)
  - apps/api (main backend)
- Deployment: Render for all services

WHAT I WANT TO ACHIEVE:
1. Add adtv-server and adtv-web to my apps/ folder
2. Merge ADTV's Prisma schema with my existing schema
3. Share authentication system (same JWT secret)
4. Import ADTV React components into my main app
5. Deploy everything together as one system

FIRST QUESTION:
Please read the CURSOR_INTEGRATION_GUIDE.md file in adtv-migration-package/ and help me:
1. Understand how to merge the Prisma schemas
2. Set up shared workspace dependencies
3. Migrate ADTV's database models into my existing database

Let's start with the database schema merge. What do I need to do?
```

### Example 3: Module Extraction

```
I need help migrating and embedding the ADTV Event Automation platform into this project.

CONTEXT:
I don't need the full ADTV platform, just the SMS and Email sending features. I want to extract these as reusable modules.

WHAT I NEED:
- Extract SMS provider service (Bonzo/Twilio abstraction)
- Extract Email sending service (SMTP/Gmail)
- Use these in my existing notification system
- Keep it lightweight - no database, no full platform

INTEGRATION APPROACH:
Option C: Extract only specific features I need (module extraction)

MY CURRENT PROJECT:
- Tech Stack: Node.js, TypeScript, Express, MongoDB
- Architecture: Simple Express API with service layer
- Current Features: User notifications (currently basic nodemailer)
- Deployment: Heroku

WHAT I WANT TO ACHIEVE:
1. Create a messaging/ folder in my src/services/
2. Copy ADTV's SMS provider abstraction
3. Copy ADTV's email service
4. Use them in my existing notification service
5. Configure Bonzo for SMS instead of my current provider

FIRST QUESTION:
Please read the CURSOR_INTEGRATION_GUIDE.md file in adtv-migration-package/ and help me:
1. Identify which files from ADTV I need to copy
2. Understand dependencies I need to install
3. Show me how to configure the services

What files should I copy and what dependencies do I need to add?
```

---

## 🎯 Quick Start Templates by Goal

### "I want to add campaign features to my app"
```
Read adtv-migration-package/CURSOR_INTEGRATION_GUIDE.md and help me:
1. Deploy ADTV as standalone services on Render
2. Create API client to call ADTV from my app
3. Add campaign management to my admin dashboard

My tech stack: [Your stack]
```

### "I want to send SMS/Email through ADTV"
```
Read adtv-migration-package/CURSOR_INTEGRATION_GUIDE.md and help me:
1. Extract ADTV's messaging services
2. Integrate SMS and Email sending into my notification system
3. Configure Bonzo/Twilio for SMS

My tech stack: [Your stack]
```

### "I want to embed ADTV's UI in my app"
```
Read adtv-migration-package/CURSOR_INTEGRATION_GUIDE.md and help me:
1. Set up ADTV on Render
2. Embed ADTV's campaign builder in my React app (iFrame or direct)
3. Share authentication between systems

My tech stack: [Your stack]
```

### "I want deep monorepo integration"
```
Read adtv-migration-package/CURSOR_INTEGRATION_GUIDE.md and help me:
1. Merge ADTV into my existing monorepo
2. Combine Prisma schemas
3. Share authentication and UI components

My monorepo structure: [Your structure]
```

---

## ✅ Checklist Before Using Prompt

Before pasting the prompt in your other project:

- [ ] Copy adtv-migration-package/ folder to target project
- [ ] Decide on integration approach (A, B, or C)
- [ ] Know your current project's tech stack
- [ ] Know what specific features you want from ADTV
- [ ] Have a rough idea of your goals
- [ ] Customize the prompt with your details
- [ ] Ready to follow Cursor's step-by-step guidance

---

## 🔑 Key Points for Cursor

When Cursor reads CURSOR_INTEGRATION_GUIDE.md, it will understand:

✅ **What ADTV is**: Event automation platform with campaigns, messaging, analytics
✅ **Tech stack**: Node.js, TypeScript, Express, React, PostgreSQL, Prisma
✅ **Integration options**: Standalone API, Monorepo, Module extraction
✅ **Architecture**: How components connect and data flows
✅ **API endpoints**: 60+ documented endpoints
✅ **Environment setup**: What variables are needed
✅ **Common patterns**: Code examples for each approach
✅ **Troubleshooting**: Solutions to common issues

Cursor will then guide you through the specific integration steps for your use case!

---

## 💬 Sample Conversation Flow

**You**: [Paste customized prompt]

**Cursor**: "I've read the CURSOR_INTEGRATION_GUIDE.md. Based on your project, I recommend Option A (Standalone API) because... Let's start by deploying ADTV to Render. Here's what you need..."

**You**: "Okay, what environment variables do I need?"

**Cursor**: "According to env.template, here are the required variables... [provides detailed list and explanations]"

**You**: "How do I create the API client?"

**Cursor**: "I'll show you the pattern from INTEGRATION_EXAMPLES.md... [provides code example]"

And so on! Cursor will walk you through everything step-by-step.

---

## 🚀 Ready to Start?

1. **Customize** one of the example prompts above
2. **Copy** adtv-migration-package/ to your target project
3. **Open** target project in Cursor
4. **Paste** your customized prompt
5. **Follow** Cursor's guidance

Cursor will handle the rest! 🎉

---

**This prompt is specifically designed to give Cursor AI all the context it needs to help you successfully integrate ADTV into your project.**

