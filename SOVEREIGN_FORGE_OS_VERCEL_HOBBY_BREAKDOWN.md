## Sovereign Forge OS — Vercel Hobby Plan Breakdown

The core problem: **Vercel Hobby caps serverless functions at 10 seconds**. Your 25-phase pipeline has multiple stages that chain LLM calls, database writes, and agent work — each far exceeding that. Here's how to break it across **7 atomic API route stages**, mapped to the exact agent swarm.

---

### The Rule
Each stage = one `/api/stage-N` route that **completes under 8s** (buffer below the 10s cap), writes progress to Supabase, and returns. The client polls or the next stage is triggered via a lightweight webhook.

---

### Stage 1 — `POST /api/stage-1/classify`
**Agents:** Classifier + Scout  
**Work:** Intent parsing, tech stack selection, competitor R&D pull  
**Output:** `build_spec` row created in Supabase with `status: "classified"`  
**Provider:** OpenCode Go  
**Why safe:** Two fast LLM calls, no generation — comfortably under 5s.

---

### Stage 2 — `POST /api/stage-2/architect`
**Agents:** Developer (architecture pass only), SQL Forge  
**Work:** Generate file tree, component manifest, and DB schema (no code yet)  
**Output:** `build_spec.architecture` JSON + Supabase migration SQL  
**Provider:** OpenCode Go  
**Why safe:** Structured JSON output from OpenCode Go — stays under 7s with streaming off.

---

### Stage 3 — `POST /api/stage-3/generate`
**Agents:** Developer (code generation), Sculptor  
**Work:** Actual Next.js 15 / Tailwind v4 file generation — chunked by module (auth, dashboard, API routes as separate sub-calls if needed)  
**Provider:** OpenCode Go → OpenCode Zen fallback  
**Why split further:** This is your biggest timeout risk. Break by module: `auth`, `dashboard`, `api` as separate invocations from the client, or use **Vercel Edge streaming** (`runtime: 'edge'`) to bypass the 10s wall entirely for this route.

---

### Stage 4 — `POST /api/stage-4/harden`
**Agents:** Sentinel, Security Auditor  
**Work:** Pen-test simulation, OWASP scan, input sanitization audit on generated code  
**Output:** `security_report` written to Supabase  
**Provider:** OpenCode Zen  
**Why safe:** Text analysis pass, no generation — fast.

---

### Stage 5 — `POST /api/stage-5/qa`
**Agents:** Phantom (UX smoke test), Scrutinizer, Healer  
**Work:** AI user simulation scoring, deep code audit, error fix suggestions  
**Output:** `qa_report` + optionally patched files written back  
**Provider:** OpenCode Zen  
**Note:** If Healer needs to re-generate code, it calls Stage 3 again — keep the loop explicit.

---

### Stage 6 — `POST /api/stage-6/business`
**Agents:** Legal Vault, Herald, Economy Auditor, Chronicler  
**Work:** TOS/Privacy/patent drafts, marketing copy, ROI calc, full API docs  
**Output:** `legal_docs` + `marketing_assets` + `api_docs` in Supabase  
**Provider:** GitHub Models (all 4 agents run as `Promise.all` — free tier handles parallel calls cleanly)  
**Why safe:** All text generation, parallelizable — run them as `Promise.all` within the single route.

---

### Stage 7 — `POST /api/stage-7/govern`
**Agents:** Autonomous CEO, Empire Broker, DAO governance setup (if Phase 19+ active)  
**Work:** Portfolio meta-management, M&A synergy detection, UGT token distribution config  
**Output:** `governance_record` written to Supabase, build marked `status: "complete"`  
**Provider:** Hugging Face (`https://router.huggingface.co/v1`)

---

### Architecture Pattern for Each Route

```ts
// Each route follows this pattern:
export const maxDuration = 9; // explicit cap

export async function POST(req: Request) {
  const { buildId } = await req.json();
  await supabase.from('builds').update({ status: 'stage-N-running' }).eq('id', buildId);

  const result = await runAgents(buildId); // scoped to THIS stage only

  await supabase.from('builds').update({
    [`stage_N_output`]: result,
    status: 'stage-N-complete'
  }).eq('id', buildId);

  return Response.json({ next: '/api/stage-N+1', buildId });
}
```

The client receives `next` and fires the subsequent call — no single function blocks for the full pipeline.

---

### For Stage 3 Specifically — Use Edge Runtime

```ts
export const runtime = 'edge'; // no timeout cap on Hobby for Edge functions
```

Edge functions on Vercel Hobby have **no execution time limit** (they're streaming-native). Stage 3 is your only real risk — move it to Edge and stream the generated code back token-by-token to the UI.

---

### LLM Provider Stack

```ts
// src/lib/llm-router.ts
const PROVIDERS = [
  {
    name: 'opencode-go',       // paid primary — stages 1, 2, 3
    url: `${process.env.OPENCODE_BASE_URL}/chat/completions`,
    headers: { Authorization: `Bearer ${process.env.OPENCODE_GO_API_KEY}` },
    model: 'opencode-go',
  },
  {
    name: 'opencode-zen',      // free fallback — stages 3 fallback, 4, 5
    url: `${process.env.OPENCODE_BASE_URL}/chat/completions`,
    headers: { Authorization: `Bearer ${process.env.OPENCODE_ZEN_API_KEY}` },
    model: 'opencode-zen',
  },
  {
    name: 'github-models',     // free — stage 6 parallel calls
    url: `${process.env.GITHUB_MODELS_BASE_URL}/chat/completions`,
    headers: { Authorization: `Bearer ${process.env.GITHUB_MODELS_TOKEN}` },
    model: 'gpt-4o-mini',
  },
  {
    name: 'huggingface',       // free — stage 7
    url: `${process.env.HUGGINGFACE_BASE_URL}/chat/completions`,
    headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
    model: 'mistralai/Mistral-7B-Instruct-v0.3',
  },
];
```

---

### Environment Variables

```bash
# LLM Providers (OpenAI-compatible, raw HTTP via axios — no SDKs)
OPENCODE_GO_API_KEY=...
OPENCODE_ZEN_API_KEY=...
OPENCODE_BASE_URL=https://api.opencode.ai/v1

GITHUB_MODELS_TOKEN=ghp_...
GITHUB_MODELS_BASE_URL=https://models.inference.ai.azure.com

HUGGINGFACE_API_KEY=hf_...
HUGGINGFACE_BASE_URL=https://router.huggingface.co/v1
```

---

### Summary

| Stage | Route | Agents | Provider | Risk |
|---|---|---|---|---|
| 1 | `/stage-1/classify` | Classifier, Scout | OpenCode Go | ✅ Safe |
| 2 | `/stage-2/architect` | Developer (arch), SQL Forge | OpenCode Go | ✅ Safe |
| 3 | `/stage-3/generate` | Developer (code), Sculptor | OpenCode Go → Zen fallback | ⚠️ Use Edge runtime |
| 4 | `/stage-4/harden` | Sentinel, Security Auditor | OpenCode Zen | ✅ Safe |
| 5 | `/stage-5/qa` | Phantom, Scrutinizer, Healer | OpenCode Zen | ✅ Safe |
| 6 | `/stage-6/business` | Legal, Herald, Economy, Chronicler | GitHub Models | ✅ Safe (Promise.all) |
| 7 | `/stage-7/govern` | CEO, Broker, DAO | Hugging Face | ✅ Safe |

**7 stages** is the sweet spot — granular enough to beat the timeout, coarse enough that your `build_spec` state machine stays manageable. OpenCode Go (paid) handles all heavy generation, free providers absorb everything else so you're not burning paid credits on analysis and governance passes.
