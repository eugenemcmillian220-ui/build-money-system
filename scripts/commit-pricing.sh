#!/bin/bash
set -e

cd /vercel/share/v0-project

echo "[v0] Committing pricing system implementation..."

# Configure git if needed
git config user.email "v0[bot]@users.noreply.github.com" || true
git config user.name "v0[bot]" || true

# Check current branch
echo "[v0] Current branch: $(git branch --show-current)"

# Add all changes
git add -A

# Show what we're committing
echo "[v0] Changes to commit:"
git diff --cached --name-only

# Commit with descriptive message
git commit -m "feat: implement comprehensive pricing system with Elite Empire and Basic Foundation tiers

- Add Elite Empire tiers (Phases 1-17): Starter, Pro, Enterprise
- Add Basic Foundation tiers (Phases 1-3): Mini, Starter, Pro, Premium
- Implement lifetime licenses: Starter ($790), Pro ($2,390), On-Prem ($4,999)
- Add credit top-up packs with bulk discounts
- Implement 25% marketplace commission tracking
- Implement 20% affiliate program with referral tracking
- Update Stripe service with lifetime license and affiliate support
- Add affiliate and marketplace transaction database migrations
- Create public pricing page with all tier options
- Update webhook to handle lifetime licenses and affiliate commissions
- Add comprehensive billing engine methods for lifecycle management

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"

echo "[v0] Commit successful!"
git log --oneline -5
