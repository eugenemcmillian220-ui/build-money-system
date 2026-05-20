export type Agent = {
  systemPrompt: string
  buildPrompt: (spec: Record<string, unknown>, previousOutputs: string[]) => string
}

export type Phase = {
  ['name']: string
  agents: Agent[]
}

/**
 * SOVEREIGN FORGE OS — 25-PHASE PIPELINE
 *
 * Each phase runs one or more AI agents in sequence.
 * Agent outputs are passed as previousOutputs to the next agent.
 * All 25 phases run on Railway with no timeout ceiling.
 *
 * TODO: Replace each phase stub with real system prompts and
 * prompt-chaining logic specific to your pipeline design.
 * Phase names below reflect common SaaS build pipeline stages —
 * update to match your actual Sovereign Forge phase definitions.
 */
export const PIPELINE_PHASES: Phase[] = [
  {
    name: 'spec-analysis', agents: [{ systemPrompt: 'You are a senior product analyst. Extract core requirements from the spec.', buildPrompt: (spec) => `Analyze this product spec and extract: core features, target users, revenue model, tech constraints.\n\nSpec: ${JSON.stringify(spec)}` }],
  },
  { name: 'market-research', agents: [{ systemPrompt: 'You are a market research analyst. Identify competitors and positioning.', buildPrompt: (spec, prev) => `Based on this spec and analysis:\n${prev[0]}\n\nIdentify: top 3 competitors, differentiation angle, pricing benchmark.` }] },
  { name: 'user-persona-definition', agents: [{ systemPrompt: 'You are a UX strategist. Define user personas.', buildPrompt: (spec, prev) => `Spec: ${JSON.stringify(spec)}\nAnalysis: ${prev[0]}\n\nDefine 2 primary user personas with goals, pain points, and willingness to pay.` }] },
  { name: 'tech-stack-selection', agents: [{ systemPrompt: 'You are a senior software architect. Recommend the optimal tech stack.', buildPrompt: (spec) => `Spec: ${JSON.stringify(spec)}\n\nRecommend: frontend, backend, database, auth, payments, hosting. Justify each choice.` }] },
  { name: 'database-schema-design', agents: [{ systemPrompt: 'You are a database architect. Design the full schema.', buildPrompt: (spec, prev) => `Spec: ${JSON.stringify(spec)}\nStack: ${prev[0]}\n\nDesign complete PostgreSQL schema with tables, columns, indexes, and RLS policies.` }] },
  { name: 'api-architecture', agents: [{ systemPrompt: 'You are a backend architect. Design the API surface.', buildPrompt: (spec, prev) => `Spec: ${JSON.stringify(spec)}\nSchema: ${prev[1]}\n\nDesign all API routes with method, path, auth requirement, request/response shape.` }] },
  { name: 'auth-flow-design', agents: [{ systemPrompt: 'You are a security architect. Design the authentication and authorization flow.', buildPrompt: (spec) => `Spec: ${JSON.stringify(spec)}\n\nDesign: signup, login, session management, role-based access, protected routes.` }] },
  { name: 'pricing-strategy', agents: [{ systemPrompt: 'You are a SaaS pricing strategist. Design the monetization model.', buildPrompt: (spec, prev) => `Spec: ${JSON.stringify(spec)}\nPersonas: ${prev[2]}\n\nDesign: credit tiers, subscription plans, pricing page copy, Stripe product IDs.` }] },
  { name: 'stripe-integration-plan', agents: [{ systemPrompt: 'You are a payments engineer. Plan the full Stripe integration.', buildPrompt: (spec, prev) => `Pricing model: ${prev[0]}\n\nPlan: checkout flow, webhook events to handle, credit top-up logic, subscription lifecycle.` }] },
  { name: 'ui-component-plan', agents: [{ systemPrompt: 'You are a frontend architect. Plan the component structure.', buildPrompt: (spec) => `Spec: ${JSON.stringify(spec)}\n\nList all pages and their key components. Note which use server vs client rendering.` }] },
  { name: 'landing-page-copy', agents: [{ systemPrompt: 'You are a conversion copywriter. Write high-converting landing page copy.', buildPrompt: (spec, prev) => `Product: ${JSON.stringify(spec)}\nPersonas: ${prev[2]}\nPricing: ${prev[7]}\n\nWrite: hero, features, social proof, pricing, FAQ, CTA sections.` }] },
  { name: 'dashboard-layout-design', agents: [{ systemPrompt: 'You are a product designer. Design the main dashboard layout.', buildPrompt: (spec, prev) => `Spec: ${JSON.stringify(spec)}\nComponents: ${prev[0]}\n\nDescribe: sidebar nav, main content areas, key metrics, user actions on dashboard.` }] },
  { name: 'core-api-implementation', agents: [{ systemPrompt: 'You are a senior backend engineer. Write production-ready API route code.', buildPrompt: (spec, prev) => `API plan: ${prev[5]}\nSchema: ${prev[4]}\n\nWrite the 3 most critical API routes as complete TypeScript Next.js route handlers.` }] },
  { name: 'supabase-rls-policies', agents: [{ systemPrompt: 'You are a Supabase security engineer. Write complete RLS policies.', buildPrompt: (spec, prev) => `Schema: ${prev[4]}\nAuth flow: ${prev[6]}\n\nWrite all RLS policies for every table. Include service_role bypasses where needed.` }] },
  { name: 'webhook-handler-implementation', agents: [{ systemPrompt: 'You are a payments engineer. Write a production Stripe webhook handler.', buildPrompt: (spec, prev) => `Stripe plan: ${prev[8]}\n\nWrite complete idempotent webhook handler for: checkout.session.completed, invoice.paid, customer.subscription.deleted.` }] },
  { name: 'ai-feature-design', agents: [{ systemPrompt: 'You are an AI product engineer. Design the core AI-powered features.', buildPrompt: (spec) => `Spec: ${JSON.stringify(spec)}\n\nDesign the AI features: prompts, context management, output formatting, error handling.` }] },
  { name: 'prompt-engineering', agents: [{ systemPrompt: 'You are a prompt engineer. Write optimized system and user prompts.', buildPrompt: (spec, prev) => `AI features: ${prev[0]}\n\nWrite production system prompts for each AI feature. Include output format instructions.` }] },
  { name: 'test-plan', agents: [{ systemPrompt: 'You are a QA engineer. Write a comprehensive test plan.', buildPrompt: (spec, prev) => `Spec: ${JSON.stringify(spec)}\nAPI routes: ${prev[12]}\n\nWrite: unit tests for critical functions, integration test scenarios, E2E test cases.` }] },
  { name: 'error-handling-strategy', agents: [{ systemPrompt: 'You are a reliability engineer. Design the error handling strategy.', buildPrompt: (spec) => `Spec: ${JSON.stringify(spec)}\n\nDefine: error types, user-facing messages, logging strategy, retry logic, fallback states.` }] },
  { name: 'environment-config', agents: [{ systemPrompt: 'You are a DevOps engineer. Define the full environment configuration.', buildPrompt: (spec, prev) => `Stack: ${prev[3]}\n\nList all environment variables for: Vercel, Railway, Supabase. Include descriptions and example values.` }] },
  { name: 'deployment-pipeline', agents: [{ systemPrompt: 'You are a DevOps engineer. Design the CI/CD deployment pipeline.', buildPrompt: (spec, prev) => `Stack: ${prev[3]}\nEnv config: ${prev[0]}\n\nDesign: GitHub Actions workflow, Vercel deploy config, Railway deploy config, migration strategy.` }] },
  { name: 'readme-generation', agents: [{ systemPrompt: 'You are a technical writer. Write comprehensive project documentation.', buildPrompt: (spec, prev) => `Full build context:\nSpec: ${JSON.stringify(spec)}\nStack: ${prev[3]}\nAPI: ${prev[5]}\n\nWrite complete README with: overview, setup, env vars, architecture, deployment.` }] },
  { name: 'codebase-map', agents: [{ systemPrompt: 'You are a senior engineer. Generate a complete codebase architecture map.', buildPrompt: (spec, prev) => `All previous outputs: ${prev.slice(0, 5).join('\n---\n')}\n\nGenerate: full file tree, module responsibilities, data flow diagram in text format.` }] },
  { name: 'launch-checklist', agents: [{ systemPrompt: 'You are a SaaS launch strategist. Create a production launch checklist.', buildPrompt: (spec) => `Full build: ${JSON.stringify(spec)}\n\nCreate: pre-launch checklist, launch day tasks, post-launch monitoring, growth levers.` }] },
  { name: 'deliverable-compilation', agents: [{ systemPrompt: 'You are a project lead. Compile the final deliverable summary.', buildPrompt: (spec, prev) => `All 24 phase outputs completed.\n\nCompile: executive summary, what was built, key decisions made, next steps, estimated build time to ship.` }] },
]
