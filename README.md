# AI App Builder

A production-ready autonomous AI platform that builds, deploys, monitors, and optimizes full-stack applications from natural language prompts.

## Overview

AI App Builder is a comprehensive platform with 10 production-ready phases:

- **Phase 1**: Single component generation
- **Phase 2**: Multi-file app generation with live preview
- **Phase 3**: Database persistence with Supabase
- **Phase 4**: Deployment to Vercel and export to GitHub
- **Phase 5**: Production systems (security, feedback, self-improvement)
- **Phase 6**: Autonomous AI company builder
- **Phase 7**: Autonomous deployment, revenue optimization, and task scheduling
- **Phase 8**: AI Development Operating System (Sandbox, Multi-Tenancy, Memory, Mobile, Collab, Search, White-label)
- **Phase 9**: Autonomous Enterprise Layer (Vision-to-Code, Compliance Vault, PII Scanning, SRE)
- **Phase 10**: Multi-Agent Economy & Marketplace (Credit System, Agent Ledger, Skills Marketplace)

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **AI/LLM**: OpenRouter API (supports models like GPT-4o-mini), OpenAI Embeddings (v3-small)
- **Sandbox**: E2B Firecracker microVMs for live code execution
- **Deployment**: Vercel (one-click deploy), GitHub (export)
- **Language**: TypeScript with Zod validation
- **Preview**: react-live for real-time component preview

## Quick Start

### Prerequisites

- Node.js 20.19+ or 22.13+
- npm or yarn or pnpm
- Supabase account
- OpenRouter API key

### Installation

```bash
# Clone repository
git clone <repository-url>
cd ai-app-builder

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

## Environment Variables

### Required

```bash
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter AI API
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Optional (Recommended)

```bash
# Application URL
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# GitHub Export (for Phase 4)
GITHUB_TOKEN=ghp_your_github_token

# Vercel Deployment (for Phase 4)
VERCEL_TOKEN=your_vercel_token
VERCEL_TEAM_ID=your_team_id  # Optional

# Admin API Keys (for Phase 5 protected endpoints)
ADMIN_API_KEYS=sk-admin-key-1,sk-admin-key-2

# Stripe Payments (for Phase 6 billing)
STRIPE_SECRET_KEY=sk_test_...

# Phase 8 Features
E2B_API_KEY=e2b_...              # Required for Sandbox
OPENAI_API_KEY=sk-proj-...        # Required for Memory & Search
CRON_SECRET=your_cron_secret      # Required for Cron loops
```

### Development

```bash
# Skip environment validation during build
SKIP_ENV_VALIDATION=true
```

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to be ready
4. Go to Settings → API to get your URL and keys

### 2. Run Schema

Copy the entire content of `supabase/schema.sql` and run it in:

- Supabase SQL Editor (recommended), OR
- `psql` command line connected to your database

The schema creates:
- `projects` table for generated apps
- `deployments` table for deployment tracking
- `feedback` table for user feedback
- `learning_store` table for AI improvement data
- Proper indexes and RLS policies
- Storage buckets for project assets

## API Endpoints

### Core Generation

- `POST /api/generate` - Generate code (single or multi-file)
- `POST /api/generate-advanced` - Advanced generation with fixing passes

### Project Management

- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Deployment & Export

- `POST /api/deploy` - Deploy to Vercel
- `GET /api/deploy?deploymentId=xxx` - Get deployment status
- `POST /api/github` - Export to GitHub
- `GET /api/github` - Check GitHub status

### Production Systems (Phase 5)

- `GET /api/status` - System status
- `GET /api/health` - Comprehensive health check
- `GET/POST /api/self-improve` - Self-improvement system
- `GET/POST /api/feedback` - Feedback collection
- `GET/POST /api/learning` - Learning data management
- `POST /api/debug` - Code analysis
- `GET/POST /api/scaling` - Scaling management
- `POST /api/swarm` - Agent swarm execution

### AI Company Builder (Phase 6)

- `POST /api/validate-idea` - Validate business idea
- `POST /api/build-company` - Build complete company plan
- `GET/POST /api/growth` - Growth strategies
- `GET/POST /api/monetization` - Pricing and monetization
- `GET/POST /api/marketplace` - Marketplace operations
- `GET/POST /api/analytics` - Metrics tracking
- `GET/POST /api/billing` - Subscription management

### Autonomous Systems (Phase 7)

- `POST/GET /api/auto-deploy` - Autonomous deployment with monitoring
- `PUT /api/auto-deploy/heal` - Trigger auto-healing
- `POST/GET /api/revenue-optimize` - Revenue optimization
- `POST/GET/DELETE /api/schedule` - AI task scheduling
- `POST/GET /api/fullstack` - Full-stack app generation

## Testing

Run phase-specific tests:

```bash
# Phase 5 tests
npx tsx tests/phase5.test.ts

# Phase 6 tests
npx tsx tests/phase6.test.ts

# Phase 7 tests
npx tsx tests/phase7.test.ts
```

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```bash
# Build and run
docker build -t ai-app-builder .
docker run -p 3000:3000 --env-file .env ai-app-builder
```

## Security Features

1. **Input Sanitization**: All user inputs sanitized through security layer
2. **Path Traversal Prevention**: File paths validated to prevent `..` attacks
3. **API Key Authentication**: Protected endpoints require valid API keys
4. **Rate Limiting**: Configurable rate limiting per user/IP
5. **Blocked Keywords**: Prevent injection attacks (eval, exec, etc.)
6. **Row Level Security**: Database access controlled via Supabase RLS
7. **Environment Variable Validation**: All env vars validated at startup

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser)                    │
│  React 19 · Next.js 15 · Tailwind CSS v4      │
└─────────────────┬─────────────────────────────────────────┘
                  │
┌─────────────────▼─────────────────────────────────────────┐
│         Next.js API Routes (26)                    │
│  Route Handlers · Validation · Error Handling     │
└─────────────────┬─────────────────────────────────────────┘
                  │
┌─────────────────▼─────────────────────────────────────────┐
│              Core Library Modules                      │
│  agent.ts  |  llm.ts  |  openrouter.ts  |  env.ts   │
│  security.ts  |  feedback-loop.ts  |  learning-store.ts  │
│  agent-swarm.ts  |  ai-debugger.ts  |  scaling.ts    │
│  self-improve.ts  |  company-orchestrator.ts          │
│  product-planner.ts  |  ai-team.ts  |  growth-engine.ts │
│  monetization.ts  |  marketplace.ts  |  analytics.ts │
│  billing.ts  |  idea-validator.ts                   │
│  auto-deployer.ts  |  revenue-optimizer.ts            │
│  ai-scheduler.ts  |  fullstack-generator.ts            │
└─────────────────┬─────────────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌──▼────┐  ┌──▼────────┐
│ Supabase│  │OpenRouter│  │Vercel/Git │
│ (DB)   │  │(AI API) │  │Hub APIs   │
└────────┘  └─────────┘  └───────────┘
```

## All Phases Status: ✅ PRODUCTION READY

- Phase 1: ✅ Single component generation
- Phase 2: ✅ Multi-file app generation
- Phase 3: ✅ Database persistence
- Phase 4: ✅ Deployment & export
- Phase 5: ✅ Production systems
- Phase 6: ✅ AI company builder
- Phase 7: ✅ Autonomous deployment & revenue optimization
- Phase 8: ✅ AI Development Operating System
- Phase 9: ✅ Autonomous Enterprise Layer
- Phase 10: ✅ Multi-Agent Economy & Marketplace

## Documentation

- **[PHASES.md](PHASES.md)** - Complete phase-by-phase breakdown with status checks
- **[PHASE7.md](PHASE7.md)** - Detailed Phase 7 features and API reference
- **[Phase 8 Documentation](public/docs/phase8.html)** - Comprehensive guide for Phase 8 features
- **[Phase 9 Documentation](public/docs/phase9.html)** - Autonomous Enterprise Layer documentation
- **[Phase 10 Documentation](public/docs/phase10.html)** - Multi-Agent Economy & Marketplace
- **[README_PRODUCTION.md](README_PRODUCTION.md)** - Full production deployment guide
- **[PRODUCTION_READINESS.md](PRODUCTION_READINESS.md)** - Production readiness summary

## License

MIT License - See LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
