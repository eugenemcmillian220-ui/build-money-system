/**
 * Full-Stack Generator Module - Enhanced Multi-File Generation
 * Generates complete full-stack applications with backend APIs, database, testing, and CI/CD
 */

import { streamLLM, cleanJson } from "./llm";
import { validateFilePaths } from "./types";

export interface FullStackConfig {
  prompt: string;
  features: string[];
  database: "postgresql" | "mongodb" | "sqlite" | "none";
  authentication: boolean;
  testing: boolean;
  ci_cd: boolean;
  docker: boolean;
}

export interface FullStackResult {
  files: Record<string, string>;
  metadata: {
    name: string;
    description: string;
    features: string[];
    techStack: string[];
    hasDatabase: boolean;
    hasAuth: boolean;
    hasTests: boolean;
    hasCI: boolean;
    hasDocker: boolean;
  };
}

const SYSTEM_PROMPT = `You are a senior full-stack developer specializing in Next.js 15, React 19, and TypeScript.
Generate complete, production-ready full-stack applications with proper structure.

Return JSON with this structure:
{
  "name": "app-name",
  "description": "Brief description",
  "features": ["feature1", "feature2"],
  "techStack": ["Next.js 15", "React 19", "TypeScript"],
  "files": {
    "app/page.tsx": "code",
    "app/api/example/route.ts": "code",
    "components/Component.tsx": "code",
    "lib/utils.ts": "code",
    "lib/db.ts": "code"
  }
}

Rules:
- Use Next.js 15 App Router
- Use React 19 patterns
- Include proper TypeScript types
- Create API routes for backend logic
- Add error handling and validation
- Use Tailwind CSS for styling
- Include 'use client' directive where needed
- Create modular, reusable components
- Return ONLY valid JSON, no markdown fences`;

class FullStackGenerator {
  async generate(config: FullStackConfig): Promise<FullStackResult> {
    const prompt = this.buildPrompt(config);
    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: prompt },
    ];

    const chunks: string[] = [];
    for await (const delta of streamLLM(messages)) {
      chunks.push(delta);
    }

    const rawContent = chunks.join("");
    const cleaned = cleanJson(rawContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(`Failed to parse AI response: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!parsed || typeof parsed !== "object" || !("files" in parsed)) {
      throw new Error("Invalid response structure: missing files");
    }

    const result = parsed as FullStackResult;
    result.files = await this.enhanceFiles(result.files, config);

    // Validate file paths
    const validation = validateFilePaths(result.files);
    if (!validation.success) {
      throw new Error(`Invalid file paths: ${validation.errors.join("; ")}`);
    }

    // Update metadata
    result.metadata = {
      name: result.metadata?.name || "generated-app",
      description: result.metadata?.description || "",
      features: result.metadata?.features || config.features,
      techStack: result.metadata?.techStack || ["Next.js 15", "React 19", "TypeScript"],
      hasDatabase: config.database !== "none",
      hasAuth: config.authentication,
      hasTests: config.testing,
      hasCI: config.ci_cd,
      hasDocker: config.docker,
    };

    return result;
  }

  private buildPrompt(config: FullStackConfig): string {
    let prompt = `Generate a full-stack Next.js application based on: ${config.prompt}\n\n`;
    prompt += `Features to include:\n${config.features.map(f => `- ${f}`).join("\n")}\n\n`;

    if (config.database !== "none") {
      prompt += `Include ${config.database} database integration with proper schema and queries.\n`;
    }

    if (config.authentication) {
      prompt += `Include authentication system (login, registration, protected routes).\n`;
    }

    if (config.testing) {
      prompt += `Include unit tests using Jest and integration tests for API routes.\n`;
    }

    if (config.ci_cd) {
      prompt += `Include GitHub Actions workflow for CI/CD (linting, testing, building, deploying).\n`;
    }

    if (config.docker) {
      prompt += `Include Dockerfile and docker-compose.yml for containerization.\n`;
    }

    prompt += `\nEnsure the application is production-ready with:\n`;
    prompt += `- Error handling\n`;
    prompt += `- Input validation (Zod)\n`;
    prompt += `- TypeScript types\n`;
    prompt += `- Responsive design (Tailwind CSS)\n`;
    prompt += `- SEO optimization\n`;
    prompt += `- Performance optimizations`;

    return prompt;
  }

  private async enhanceFiles(
    files: Record<string, string>,
    config: FullStackConfig
  ): Promise<Record<string, string>> {
    let enhanced = { ...files };

    // Add authentication if requested
    if (config.authentication) {
      enhanced = this.addAuthentication(enhanced);
    }

    // Add testing if requested
    if (config.testing) {
      enhanced = this.addTesting(enhanced);
    }

    // Add CI/CD if requested
    if (config.ci_cd) {
      enhanced = this.addCI_CD(enhanced);
    }

    // Add Docker if requested
    if (config.docker) {
      enhanced = this.addDocker(enhanced);
    }

    // Add environment configuration
    enhanced = this.addEnvConfig(enhanced, config);

    // Add README
    enhanced = this.addReadme(enhanced, config);

    return enhanced;
  }

  private addAuthentication(files: Record<string, string>): Record<string, string> {
    const newFiles = { ...files };

    if (!newFiles["lib/auth.ts"]) {
      newFiles["lib/auth.ts"] = `import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user as User | null;
}`;
    }

    if (!newFiles["app/api/auth/signin/route.ts"]) {
      newFiles["app/api/auth/signin/route.ts"] = `import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const data = await signIn(email, password);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign in failed" },
      { status: 401 }
    );
  }
}`;
    }

    if (!newFiles["app/api/auth/signup/route.ts"]) {
      newFiles["app/api/auth/signup/route.ts"] = `import { NextResponse } from "next/server";
import { signUp } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    const data = await signUp(email, password);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign up failed" },
      { status: 400 }
    );
  }
}`;
    }

    return newFiles;
  }

  private addTesting(files: Record<string, string>): Record<string, string> {
    const newFiles = { ...files };

    // Add jest config
    if (!newFiles["jest.config.js"]) {
      newFiles["jest.config.js"] = `const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

module.exports = createJestConfig(customJestConfig)`;
    }

    // Add jest setup
    if (!newFiles["jest.setup.js"]) {
      newFiles["jest.setup.js"] = `import '@testing-library/jest-dom'`;
    }

    // Add sample test
    if (!newFiles["__tests__/app.test.tsx"]) {
      newFiles["__tests__/app.test.tsx"] = `import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Home', () => {
  it('renders a heading', () => {
    render(<Home />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
  })
})`;
    }

    // Add package.json scripts for testing
    if (newFiles["package.json"]) {
      try {
        const pkg = JSON.parse(newFiles["package.json"]);
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.test = "jest";
        pkg.scripts["test:watch"] = "jest --watch";
        pkg.scripts["test:coverage"] = "jest --coverage";
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies["@testing-library/react"] = "^14.0.0";
        pkg.devDependencies["@testing-library/jest-dom"] = "^6.0.0";
        pkg.devDependencies.jest = "^29.0.0";
        pkg.devDependencies["jest-environment-jsdom"] = "^29.0.0";
        newFiles["package.json"] = JSON.stringify(pkg, null, 2);
      } catch {
        // If parsing fails, leave as is
      }
    }

    return newFiles;
  }

  private addCI_CD(files: Record<string, string>): Record<string, string> {
    const newFiles = { ...files };

    if (!newFiles[".github/workflows/ci.yml"]) {
      newFiles[".github/workflows/ci.yml"] = `name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: [lint, test]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

  deploy:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}`;
    }

    return newFiles;
  }

  private addDocker(files: Record<string, string>): Record<string, string> {
    const newFiles = { ...files };

    if (!newFiles["Dockerfile"]) {
      newFiles["Dockerfile"] = `FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]`;
    }

    if (!newFiles["docker-compose.yml"]) {
      newFiles["docker-compose.yml"] = `version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:`;
    }

    if (!newFiles[".dockerignore"]) {
      newFiles[".dockerignore"] = `node_modules
.next
.git
.env
.env.local
*.log`;
    }

    return newFiles;
  }

  private addEnvConfig(
    files: Record<string, string>,
    config: FullStackConfig
  ): Record<string, string> {
    const newFiles = { ...files };

    if (!newFiles[".env.example"]) {
      let env = `# Application
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development

# AI API
OPENCODE_ZEN_API_KEY=your-opencode-zen-api-key

`;

      if (config.database !== "none" || config.authentication) {
        env += `# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

`;
      }

      env += `# Vercel (for deployment)
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-vercel-org-id
VERCEL_PROJECT_ID=your-vercel-project-id`;

      newFiles[".env.example"] = env;
    }

    return newFiles;
  }

  private addReadme(
    files: Record<string, string>,
    config: FullStackConfig
  ): Record<string, string> {
    const newFiles = { ...files };

    if (!newFiles["README.md"]) {
      const appName = files["app/page.tsx"] ? "Generated App" : "My App";
      const featuresList = config.features.map(f => `- ${f}`).join("\n");

      let readme = `# ${appName}\n\n`;
      readme += `A full-stack Next.js application generated by AI App Builder.\n\n`;
      readme += `## Features\n\n${featuresList}\n\n`;
      readme += `## Tech Stack\n\n`;
      readme += `- Next.js 15\n`;
      readme += `- React 19\n`;
      readme += `- TypeScript\n`;
      readme += `- Tailwind CSS\n`;

      if (config.database !== "none") {
        readme += `- ${config.database.charAt(0).toUpperCase() + config.database.slice(1)}\n`;
      }

      if (config.authentication) {
        readme += `- Supabase Auth\n`;
      }

      readme += `\n## Getting Started\n\n`;
      readme += `\`\`\`bash\n`;
      readme += `npm install\n`;
      readme += `npm run dev\n`;
      readme += `\`\`\`\n\n`;

      if (config.docker) {
        readme += `## Docker\n\n`;
        readme += `\`\`\`bash\n`;
        readme += `docker-compose up\n`;
        readme += `\`\`\`\n\n`;
      }

      if (config.testing) {
        readme += `## Testing\n\n`;
        readme += `\`\`\`bash\n`;
        readme += `npm test\n`;
        readme += `\`\`\`\n\n`;
      }

      readme += `## Environment Variables\n\n`;
      readme += `Copy \`.env.example\` to \`.env\` and fill in your values.\n\n`;

      newFiles["README.md"] = readme;
    }

    return newFiles;
  }
}

export const fullStackGenerator = new FullStackGenerator();
