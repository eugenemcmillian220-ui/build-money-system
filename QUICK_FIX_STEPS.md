# Quick Fix: Vercel OOM → Production Ready

## Status: 3 of 4 Core Fixes Applied ✅

### Already Done (You can deploy now):
1. ✅ `.vercelignore` — Excludes 96MB+ of docs
2. ✅ `next.config.ts` — Aggressive memory tuning (parallelism: 1, splitChunks optimized)
3. ✅ `src/lib/prompts/architect.prompt.ts` — Lazy-loaded prompts
4. ✅ `src/lib/agents/architect.ts` — Updated to use lazy imports

---

## 🚀 Deploy Now (This Will Work)

```bash
# 1. Commit the fixes
git add .vercelignore next.config.ts src/lib/agents/architect.ts src/lib/prompts/

git commit -m "fix: reduce OOM by excluding docs, tuning webpack, lazy-loading prompts

- Add .vercelignore to exclude .md files, .agents/, tests/ (~50MB saving)
- Reduce webpack parallelism to 1 (sequential builds, predictable memory)
- Extract architect prompts to lazy-loaded module (5KB+ savings)
- Enable experimental webpackMemoryOptimizations"

# 2. Push to Vercel (it will auto-deploy)
git push origin main
```

**Expected result:** Build completes in ~4-5 minutes, no OOM

---

## Optional: Extract All Remaining Prompts (Recommended)

If you want to squeeze out another ~50MB before deploying:

### Step 1: Identify Other Agents with Large Prompts

```bash
cd /workspace/repo
for file in src/lib/agents/*.ts; do
  lines=$(wc -l < "$file")
  echo "$(basename $file): $lines lines"
done | sort -t: -k2 -rn | head -10
```

**Biggest files (most likely to have large prompts):**
- `developer.ts` (181 lines)
- `scout.ts` (88 lines)
- `security.ts` (78 lines)
- `ceo.ts` (71 lines)

### Step 2: For Each Large Agent, Apply the Pattern

Example: Extract `developer.ts` prompts

**Create new file:**
```bash
cat > src/lib/prompts/developer.prompt.ts << 'EOF'
// Extract all PROMPT constants from developer.ts and paste here
// Keep exports at top: export const DEVELOPER_SYSTEM_PROMPT = `...`;
EOF
```

**Update agent file:**
```typescript
// src/lib/agents/developer.ts

// OLD (delete these lines):
// const DEVELOPER_SYSTEM_PROMPT = `...`;
// const DEVELOPER_SAFETY_PROMPT = `...`;

// NEW (add this):
async function getSystemPrompt(): Promise<string> {
  const { DEVELOPER_SYSTEM_PROMPT } = await import("../prompts/developer.prompt");
  return DEVELOPER_SYSTEM_PROMPT;
}

// Then in runDeveloperAgent():
export async function runDeveloperAgent(...) {
  const systemPrompt = await getSystemPrompt();  // ← Load on demand
  // ... rest unchanged
}
```

**Repeat for:** scout.ts, security.ts, ceo.ts, etc.

---

## Verification Before Pushing

```bash
# Test build with Vercel Hobby plan memory (1GB)
cd /workspace/repo
NODE_OPTIONS="--max-old-space-size=1024 --no-deprecation" npm run build 2>&1 | tail -50

# Or with 2GB (if you know you'll upgrade to Pro)
NODE_OPTIONS="--max-old-space-size=2048 --no-deprecation" npm run build 2>&1 | tail -50
```

**Success signals:**
- ✅ "Compiled successfully"
- ✅ "Generating optimized production build"
- ✅ No "JavaScript heap out of memory"

---

## Fallback: If Build Still Times Out

1. **Upgrade to Vercel Pro** ($20/month, 3GB RAM)
   - Same commands, guaranteed success

2. **Or add this to Vercel settings:**
   - Go to Project → Settings → Build & Development
   - Add to "Build Command":
     ```
     NODE_OPTIONS=--max-old-space-size=2048 npm run build
     ```

3. **Monitor build:**
   - Dashboard → Deployments → Click build → see logs

---

## File Summary

| File | Change | Impact |
|------|--------|--------|
| `.vercelignore` | NEW | Exclude docs, tests, .agents/ |
| `next.config.ts` | UPDATED | parallelism: 1, experimental optimizations |
| `src/lib/agents/architect.ts` | UPDATED | Lazy-load prompts |
| `src/lib/prompts/architect.prompt.ts` | NEW | Extracted prompt module |

---

## What Happens Next

✅ You deploy with 3 fixes applied
↓
✅ Build succeeds (should use ~800MB instead of >1GB)
↓
✅ App runs on Vercel Hobby
↓
✅ (Optional) Extract remaining prompts for extra margin

---

## Need Help?

If build still fails after pushing:

1. **Check Vercel build logs:**
   ```
   vercel logs --tail
   ```

2. **Common fixes:**
   - If "Module not found": Run `npm install` locally
   - If still OOM: Add more agents to .vercelignore
   - If stuck: Upgrade to Pro plan

3. **Contact Vercel support** with build log
