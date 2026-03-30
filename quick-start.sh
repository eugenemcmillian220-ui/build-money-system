#!/bin/bash

# AI App Builder - Quick Start Script
# This script helps you set up and run the application

set -e

echo "========================================"
echo "  AI App Builder - Quick Start"
echo "========================================"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="20.19"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Node.js version $REQUIRED_VERSION+ required. Current: $NODE_VERSION"
    echo "Please upgrade Node.js at https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo ""
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.local and add your API keys!"
    echo "   Required:"
    echo "   - OPENROUTER_API_KEY (get from https://openrouter.ai)"
    echo "   - NEXT_PUBLIC_SUPABASE_URL (from your Supabase project)"
    echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY (from your Supabase project)"
    echo ""
    echo "   Optional but recommended:"
    echo "   - GITHUB_TOKEN (for GitHub export)"
    echo "   - VERCEL_TOKEN (for Vercel deployment)"
    echo "   - ADMIN_API_KEYS (for protected endpoints)"
    echo ""
    read -p "Press Enter to continue after editing .env.local..."
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

# Run type checking
echo ""
echo "🔍 Running type check..."
npm run typecheck

# Run linting
echo ""
echo "🔍 Running linter..."
npm run lint

# Ask what to do
echo ""
echo "========================================"
echo "  What would you like to do?"
echo "========================================"
echo "1) Start development server"
echo "2) Run tests"
echo "3) Build for production"
echo "4) Check system health"
echo "5) Exit"
echo ""
read -p "Choose an option (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting development server..."
        echo "   Open http://localhost:3000 in your browser"
        echo ""
        npm run dev
        ;;
    2)
        echo ""
        echo "🧪 Running tests..."
        echo ""
        echo "Phase 5 Tests:"
        npx tsx tests/phase5.test.ts
        echo ""
        echo "Phase 6 Tests:"
        npx tsx tests/phase6.test.ts
        ;;
    3)
        echo ""
        echo "🏗️  Building for production..."
        npm run build
        echo ""
        echo "✅ Build complete! Start with: npm start"
        ;;
    4)
        echo ""
        echo "🏥 Checking system health..."
        echo ""
        echo "Required checks:"
        echo ""

        # Check OPENROUTER_API_KEY
        if [ -n "$OPENROUTER_API_KEY" ]; then
            echo "✅ OPENROUTER_API_KEY configured"
        else
            echo "❌ OPENROUTER_API_KEY not configured (add to .env.local)"
        fi

        # Check Supabase
        if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
            echo "✅ Supabase configured"
        else
            echo "❌ Supabase not configured (add to .env.local)"
        fi

        echo ""
        echo "Optional checks:"
        echo ""

        # Check GitHub
        if [ -n "$GITHUB_TOKEN" ]; then
            echo "✅ GitHub token configured"
        else
            echo "⚠️  GitHub token not configured (optional)"
        fi

        # Check Vercel
        if [ -n "$VERCEL_TOKEN" ]; then
            echo "✅ Vercel token configured"
        else
            echo "⚠️  Vercel token not configured (optional)"
        fi

        # Check Admin keys
        if [ -n "$ADMIN_API_KEYS" ]; then
            echo "✅ Admin API keys configured"
        else
            echo "⚠️  Admin API keys not configured (optional)"
        fi

        echo ""
        echo "💡 Tip: Run 'curl http://localhost:3000/api/health' after starting server for detailed status"
        ;;
    5)
        echo ""
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo ""
        echo "❌ Invalid option. Please choose 1-5."
        exit 1
        ;;
esac
