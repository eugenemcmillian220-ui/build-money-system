# AI App Builder - Production Deployment Guide

Complete guide for deploying all 6 phases of the AI App Builder to production.

## Overview

The AI App Builder is a production-ready Next.js application that generates complete Next.js applications from natural language prompts. It includes:

- **Phase 1**: Single component generation
- **Phase 2**: Multi-file app generation with live preview
- **Phase 3**: Database persistence with Supabase
- **Phase 4**: Vercel deployment and GitHub export
- **Phase 5**: Production systems (security, feedback, self-improvement)
- **Phase 6**: Autonomous AI company builder

## Quick Start

### Prerequisites

- Node.js 20.19+ or 22.13+
- npm or yarn or pnpm
- Supabase account
- OpenRouter API key
- (Optional) GitHub account with personal access token
- (Optional) Vercel account with API token

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

### Optional (Highly Recommended)

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

### 3. Configure Row Level Security (RLS)

The schema includes RLS policies that:
- Allow users to see their own projects
- Allow authenticated access to feedback
- Protect admin-only operations
- Enable public access where appropriate

Modify policies based on your authentication needs.

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t ai-app-builder .
docker run -p 3000:3000 --env-file .env ai-app-builder
```

### Manual Node.js Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

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
- `GET /api/self-improve` - Get performance report
- `POST /api/self-improve` - Run self-improvement
- `GET /api/feedback` - Get feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/learning` - Get learning data
- `POST /api/learning` - Add learning data
- `POST /api/debug` - Analyze project
- `GET /api/scaling` - Get scaling metrics
- `POST /api/scaling` - Manage scaling
- `POST /api/swarm` - Run agent swarm

### AI Company Builder (Phase 6)

- `POST /api/validate-idea` - Validate business idea
- `POST /api/build-company` - Build complete company plan
- `GET /api/growth` - Get growth channels
- `POST /api/growth` - Generate growth strategy
- `GET /api/monetization` - Get pricing tiers
- `POST /api/monetization` - Generate monetization plan
- `GET /api/marketplace` - Browse marketplace
- `POST /api/marketplace` - Create/purchase listing
- `GET /api/analytics` - Get metrics
- `POST /api/analytics` - Track metric
- `GET /api/billing` - Get billing info
- `POST /api/billing` - Manage subscriptions

## Testing

### Run Unit Tests

```bash
# Phase 5 tests
npx tsx tests/phase5.test.ts

# Phase 6 tests
npx tsx tests/phase6.test.ts
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Build Test

```bash
npm run build
```

## Monitoring & Maintenance

### Health Checks

```bash
# Quick status check
curl https://your-app.vercel.app/api/status

# Comprehensive health check
curl https://your-app.vercel.app/api/health
```

### Logs

Check logs in:
- Vercel dashboard (if deployed to Vercel)
- Supabase logs (database operations)
- Application logs (server console)

### Database Backup

Supabase automatically backs up your database. For manual backups:

```sql
-- Export data
COPY projects TO '/tmp/projects_backup.csv' WITH (FORMAT csv, HEADER);
```

### Performance Optimization

1. Enable Vercel Edge Functions for API routes
2. Use Vercel KV for caching
3. Configure CDN for static assets
4. Monitor API response times
5. Set up alerts for error rates

## Security

### API Key Authentication

Protected endpoints require authentication via `Authorization` header:

```bash
curl -X POST https://your-app.vercel.app/api/self-improve \
  -H "Authorization: Bearer sk-admin-key-1"
```

### Rate Limiting

Configure rate limits in `src/lib/security.ts`:

```typescript
const defaultConfig: SecurityConfig = {
  enableRateLimiting: true,
  maxRequestsPerMinute: 60,
  blockedKeywords: ['system-prompt-leak', 'exec(', 'eval(', 'process.env'],
};
```

### Input Validation

All inputs are validated with Zod schemas and sanitized through the security layer.

### Path Traversal Prevention

File paths are validated to prevent `..` attacks:

```typescript
validateFilePaths(files) // Throws on invalid paths
```

## Scaling

### Horizontal Scaling

- Deploy multiple instances behind a load balancer
- Use Vercel's automatic scaling
- Enable database connection pooling

### Database Scaling

- Upgrade Supabase plan for more CPU/RAM
- Enable Read Replicas for read-heavy workloads
- Use Supabase Edge Functions for compute

### Caching

- Cache API responses with Redis or Vercel KV
- Cache generated code in database
- Use CDN for static assets

## Troubleshooting

### Common Issues

**Issue**: OPENROUTER_API_KEY not configured
**Solution**: Add the API key to `.env.local` and redeploy

**Issue**: Database connection failed
**Solution**: Verify Supabase URL and keys are correct, database is active

**Issue**: GitHub export fails
**Solution**: Ensure GITHUB_TOKEN has 'repo' scope and hasn't expired

**Issue**: Vercel deployment stuck
**Solution**: Check deployment logs, verify VERCEL_TOKEN is valid

**Issue**: Type errors in production build
**Solution**: Run `npm run typecheck` locally first

## Support

- Documentation: See `PHASES.md` for detailed phase descriptions
- Issues: Open an issue on GitHub
- Tests: Run phase-specific tests to verify functionality

## License

[Your License Here]

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## Production Checklist

Before going to production:

- [ ] All environment variables configured
- [ ] Supabase schema applied
- [ ] Database connectivity verified
- [ ] GitHub and Vercel tokens configured (if using)
- [ ] Admin API keys set for protected endpoints
- [ ] RLS policies reviewed and configured
- [ ] SSL/TLS enabled
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Monitoring configured (Vercel Analytics, etc.)
- [ ] Backup procedures in place
- [ ] Rate limits configured
- [ ] Security headers configured
- [ ] Domain configured and DNS propagated
- [ ] All tests passing
- [ ] Type checking passing
- [ ] Linting passing
- [ ] Production build successful

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│              Client (Browser)                    │
│  React 19 · Next.js 15 · Tailwind CSS v4      │
└─────────────────┬─────────────────────────────────┘
                  │
┌─────────────────▼─────────────────────────────────┐
│         Next.js API Routes (16)                │
│  Route Handlers · Validation · Error Handling     │
└─────────────────┬─────────────────────────────────┘
                  │
┌─────────────────▼─────────────────────────────────┐
│          Business Logic Layer                    │
│  Agent · LLM · Security · Orchestration        │
└─────────────────┬─────────────────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
┌───▼────┐  ┌───▼────┐  ┌──▼────────┐
│ Supabase│  │OpenRouter│  │Vercel/Git │
│ (DB)   │  │(AI API) │  │Hub APIs   │
└────────┘  └────────┘  └───────────┘
```

## All Phases Status: ✅ PRODUCTION READY

Phase 1: ✅ Single component generation
Phase 2: ✅ Multi-file app generation
Phase 3: ✅ Database persistence
Phase 4: ✅ Deployment & export
Phase 5: ✅ Production systems
Phase 6: ✅ AI company builder
