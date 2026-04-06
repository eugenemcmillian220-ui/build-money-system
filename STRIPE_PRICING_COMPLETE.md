# Complete Stripe Pricing Implementation

## Overview
This document provides a comprehensive overview of the Stripe pricing implementation for the AI App Builder platform.

## Pricing Structure

### Elite Empire (Phases 1-17 Access)

| Plan | Monthly | Yearly (20% off) | Credits/Month | Key Features |
|------|---------|------------------|---------------|--------------|
| **Elite Starter** | $99 | $79/mo ($948/yr) | 10,000 | Governance & Edge, Full Phases 1-17, Autonomous Governance (HITL), Edge Scale Orchestration, Global CDN Deployment |
| **Elite Pro** | $249 | $199/mo ($2,388/yr) | 35,000 | VC & Diplomacy, Autonomous VC Investment Engine, Agentic B2B Diplomacy, Revenue Share Intelligence |
| **Elite Enterprise** | $999 | $799/mo ($9,588/yr) | 150,000 | Legal, Hive & M&A, Hive Mind Collective Intelligence, Autonomous M&A Engine, Legal & IP Vault, White-Label Ready |

### Basic Foundation (Phases 1-3 Access)

| Plan | Monthly | Yearly (20% off) | Credits/Month | Key Features |
|------|---------|------------------|---------------|--------------|
| **Basic Mini** | $5 | $4/mo ($48/yr) | 300 | Single Component Generation, Basic Multi-file Output |
| **Basic Starter** | $19 | $15/mo ($180/yr) | 1,000 | Full Component Generation, Supabase Integration |
| **Basic Pro** | $49 | $39/mo ($468/yr) | 3,000 | Unlimited Projects, Priority Queue |
| **Basic Premium** | $99 | $79/mo ($948/yr) | 7,000 | Custom Templates, Early Feature Access |

### Lifetime Licenses (One-Time Payment)

| License | Price | Credits/Month | Description |
|---------|-------|---------------|-------------|
| **Lifetime Starter** | $790 | 1,000 | Phases 1-3 Lifetime Access, No Recurring Fees |
| **Lifetime Pro** | $2,390 | 5,000 | Phases 1-17 Lifetime Access, All Elite Features, Priority Support Forever |
| **On-Prem Perpetual** | $4,999 | Unlimited | Self-hosted, Full Source Code, Unlimited Internal Users |

### Credit Top-Ups

| Pack | Credits | Price | Savings |
|------|---------|-------|---------|
| **Starter Pack** | 5,000 | $20 | - |
| **Pro Surge** | 15,000 | $50 | 17% off |
| **Empire Overdrive** | 50,000 | $150 | 25% off |

### Additional Revenue Streams

- **Marketplace Commission**: 25% on all agent-to-agent transactions
- **Affiliate Program**: 20% recurring commission on referrals
- **Minimum Payout Threshold**: $50

## File Structure

### Core Configuration
- `src/lib/stripe.ts` - Complete product catalog with all pricing tiers
- `src/lib/billing-engine.ts` - Billing engine for processing payments and credits
- `src/lib/billing.ts` - Legacy billing system
- `src/lib/economy.ts` - Agent economy and credit management

### API Endpoints
- `src/app/api/billing/checkout/route.ts` - Checkout session creation
- `src/app/api/billing/webhook/route.ts` - Stripe webhook handling
- `src/app/api/billing/route.ts` - General billing operations

### UI Components
- `src/app/pricing/page.tsx` - Main pricing page (Server Component)
- `src/app/pricing/pricing-client.tsx` - Client-side pricing component
- `src/components/billing/pricing-table.tsx` - Complete pricing table with tabs

### Setup Scripts
- `scripts/setup-stripe.ts` - Creates all Stripe products and prices
- `scripts/migrate-billing-tables.sql` - Database migrations for billing tables

### Documentation
- `STRIPE_SETUP.md` - Stripe Dashboard configuration guide
- `PRICING_IMPLEMENTATION.md` - Implementation summary

## Environment Variables

### Required
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Price IDs (Generated after setup)
```bash
# Basic Tiers
STRIPE_PRICE_BASIC_MINI_MONTHLY=price_...
STRIPE_PRICE_BASIC_MINI_YEARLY=price_...
STRIPE_PRICE_BASIC_STARTER_MONTHLY=price_...
STRIPE_PRICE_BASIC_STARTER_YEARLY=price_...
STRIPE_PRICE_BASIC_PRO_MONTHLY=price_...
STRIPE_PRICE_BASIC_PRO_YEARLY=price_...
STRIPE_PRICE_BASIC_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_BASIC_PREMIUM_YEARLY=price_...

# Elite Tiers
STRIPE_PRICE_ELITE_STARTER_MONTHLY=price_...
STRIPE_PRICE_ELITE_STARTER_YEARLY=price_...
STRIPE_PRICE_ELITE_PRO_MONTHLY=price_...
STRIPE_PRICE_ELITE_PRO_YEARLY=price_...
STRIPE_PRICE_ELITE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ELITE_ENTERPRISE_YEARLY=price_...

# Lifetime Licenses
STRIPE_PRICE_LIFETIME_STARTER=price_...
STRIPE_PRICE_LIFETIME_PRO=price_...
STRIPE_PRICE_ONPREM_PERPETUAL=price_...

# Credit Packs
STRIPE_PRICE_CREDITS_5K=price_...
STRIPE_PRICE_CREDITS_15K=price_...
STRIPE_PRICE_CREDITS_50K=price_...
```

## Database Tables

### Lifetime Licenses
```sql
CREATE TABLE lifetime_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  license_id TEXT NOT NULL,
  license_name TEXT NOT NULL,
  purchase_date TIMESTAMPTZ DEFAULT NOW(),
  stripe_session_id TEXT,
  monthly_credits INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  UNIQUE(org_id, license_id)
);
```

### Affiliates
```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  affiliate_code TEXT UNIQUE NOT NULL,
  total_earnings INTEGER DEFAULT 0,
  pending_payout INTEGER DEFAULT 0,
  payout_threshold INTEGER DEFAULT 5000,
  status TEXT DEFAULT 'active'
);
```

### Affiliate Commissions
```sql
CREATE TABLE affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_org_id UUID NOT NULL REFERENCES organizations(id),
  referred_org_id UUID NOT NULL REFERENCES organizations(id),
  transaction_type TEXT NOT NULL,
  transaction_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_rate DECIMAL(5,4) DEFAULT 0.20,
  status TEXT DEFAULT 'pending'
);
```

### Marketplace Transactions
```sql
CREATE TABLE marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_org_id UUID NOT NULL REFERENCES organizations(id),
  seller_org_id UUID NOT NULL REFERENCES organizations(id),
  transaction_id TEXT NOT NULL,
  gross_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_rate DECIMAL(5,4) DEFAULT 0.25,
  seller_amount INTEGER NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'completed'
);
```

## Webhook Events Handled

1. **checkout.session.completed** - Process successful payments
2. **customer.subscription.updated** - Handle subscription changes
3. **customer.subscription.deleted** - Handle cancellations
4. **invoice.payment_succeeded** - Grant credits on renewal
5. **invoice.payment_failed** - Handle payment failures

## Setup Instructions

1. **Run the Stripe setup script:**
   ```bash
   npx ts-node scripts/setup-stripe.ts
   ```

2. **Add environment variables to Vercel:**
   Copy the generated price IDs from the script output

3. **Run database migration:**
   ```bash
   psql -d "your_database_url" -f scripts/migrate-billing-tables.sql
   ```

4. **Configure Stripe Webhook:**
   - Endpoint: `https://your-domain.com/api/billing/webhook`
   - Events: checkout.session.completed, customer.subscription.updated, invoice.payment_succeeded, invoice.payment_failed

## Key Features

✅ **No Free Tier** - Premium only pricing model
✅ **Annual Savings** - 20% discount on yearly subscriptions
✅ **Lifetime Licenses** - One-time permanent access options
✅ **Credit Top-ups** - Add more credits with volume discounts
✅ **Affiliate Tracking** - 20% recurring commission program
✅ **Marketplace Commission** - 25% on agent-to-agent transactions
✅ **Phases 1-17 Access** - Elite tiers unlock all advanced features
✅ **White-label Ready** - Enterprise tier includes white-label capabilities
✅ **Self-hosted Option** - On-prem perpetual license available

## Testing

Test cards for Stripe:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires 3D Secure**: `4000 0025 0000 3155`

## Production Checklist

- [ ] Stripe account configured
- [ ] All products created in Stripe Dashboard
- [ ] Environment variables set in Vercel
- [ ] Database migrations applied
- [ ] Webhook endpoint configured
- [ ] Test checkout flow completed
- [ ] Affiliate system tested
- [ ] Marketplace commission flow verified
