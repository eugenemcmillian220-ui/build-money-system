# Production Environment Variables

Configure these environment variables for production deployment on Vercel.

## Required for All Phases

### Core Infrastructure
```bash
# Supabase (Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
```

### LLM/LLM Configuration (Required for Phases 1-6)
```bash
# OpenRouter (Primary LLM Provider)
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free

# Optional: Additional LLM Providers for Free Rotation
GEMINI_API_KEY=your-gemini-key-here
GROQ_API_KEY=your-groq-key-here
DEEPSEEK_API_KEY=your-deepseek-key-here
CEREBRAS_API_KEY=your-cerebras-key-here

# OpenAI (for embeddings, optional)
OPENAI_API_KEY=sk-proj-your-key-here
```

## Phase-Specific Requirements

### Phase 4: Deployment & GitHub Export
```bash
# Vercel Deployment
VERCEL_TOKEN=vcp_your-vercel-token-here
VERCEL_PROJECT_ID=prj_your-project-id-here
VERCEL_ORGANIZATION_ID=team_your-org-id-here

# GitHub Export
GITHUB_TOKEN=ghp_your-github-token-here
```

### Phase 6: AI Company Builder & Billing
```bash
# Stripe Payments
STRIPE_SECRET_KEY=sk_test_your-stripe-key-here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here
STRIPE_PRICE_ID=price_your-price-id-here

# App Configuration
NEXT_PUBLIC_MAX_FREE_PROJECTS=3
NEXT_PUBLIC_MAX_FREE_TOKENS=100000
```

### Phase 8: AI Development OS
```bash
# E2B Sandbox (Code Execution)
E2B_API_KEY=e2b_sk_your-e2b-key-here
```

### Phase 10-18: Advanced Features
```bash
# Cron Jobs
CRON_SECRET=your-cron-secret-here

# Slack (Optional)
SLACK_TOKEN=your-slack-bot-token-here
```

## Environment Setup Steps

### 1. Supabase Setup
1. Create a new project at https://supabase.com
2. Go to Settings → API to get URL and keys
3. Run the SQL schema from `supabase/schema.sql`
4. Enable Row Level Security (already in schema)

### 2. OpenRouter Setup
1. Create account at https://openrouter.ai
2. Get API key from dashboard
3. Configure default model (use free tier for testing)

### 3. Vercel Deployment Setup
1. Create account at https://vercel.com
2. Create a new project
3. Get token from Account Settings → Tokens
4. Copy Project ID from project settings

### 4. GitHub Setup
1. Generate Personal Access Token at GitHub Settings
2. Grant `repo` and `workflow` permissions

### 5. Stripe Setup
1. Create account at https://stripe.com
2. Get publishable and secret keys
3. Set up webhooks for payment events

### 6. E2B Setup (Optional)
1. Create account at https://e2b.dev
2. Get API key for code execution sandbox

## Production Deployment

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Environment Variables in Vercel
1. Go to your project settings
2. Navigate to Environment Variables
3. Add all variables listed above
4. Redeploy after adding variables

## Minimum Working Configuration

For core functionality (Phases 1-3), only these are required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENROUTER_API_KEY`

All other environment variables are optional and enable specific features.

## Security Notes

- Never commit `.env` files to version control
- Use Vercel environment variables for production secrets
- Rotate API keys regularly
- Use separate keys for development and production
- Enable IP restrictions where possible
