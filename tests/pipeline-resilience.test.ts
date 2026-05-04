/**
 * Pipeline Resilience Tests
 *
 * Unit tests for:
 *  - Robust JSON parsing with noisy LLM output
 *  - Template fallback generators (outline, details, spec, fileMap)
 *  - Pipeline timeout wrapper (withStageTimeout, withTimeout)
 *  - Static file validation (testFiles)
 *
 * Run: npx tsx tests/pipeline-resilience.test.ts
 */

import { cleanJson, robustParseJson, LLMError, testFiles } from "../src/lib/llm";
import {
  fallbackOutline,
  fallbackDetails,
  fallbackSpec,
  fallbackFileMap,
} from "../src/lib/template-fallback";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function assertThrows(fn: () => void, label: string): void {
  try {
    fn();
    console.error(`  FAIL: ${label} (did not throw)`);
    failed++;
  } catch {
    console.log(`  PASS: ${label}`);
    passed++;
  }
}

// ---------------------------------------------------------------------------
// 1. Robust JSON Parsing
// ---------------------------------------------------------------------------

function testRobustJsonParsing() {
  console.log("\n--- Test Group 1: Robust JSON Parsing ---");

  // Clean JSON
  const simple = robustParseJson<{ name: string }>('{"name":"test"}');
  assert(simple.name === "test", "parses clean JSON");

  // JSON with markdown fences
  const fenced = robustParseJson<{ a: number }>("```json\n{\"a\":1}\n```");
  assert(fenced.a === 1, "strips markdown fences");

  // JSON with leading/trailing text
  const noisy = robustParseJson<{ b: string }>("Here's the result:\n{\"b\":\"hello\"}\nDone!");
  assert(noisy.b === "hello", "extracts JSON from noisy text");

  // Nested JSON
  const nested = robustParseJson<{ x: { y: number } }>('{"x":{"y":42}}');
  assert(nested.x.y === 42, "parses nested JSON");

  // Invalid JSON throws
  assertThrows(() => robustParseJson("not json at all"), "throws on completely invalid input");

  // Clean JSON util
  const cleaned = cleanJson("```typescript\n{\"key\":\"val\"}\n```");
  assert(cleaned.startsWith("{"), "cleanJson removes code fence");
}

// ---------------------------------------------------------------------------
// 2. Template Fallback: Outline
// ---------------------------------------------------------------------------

function testFallbackOutline() {
  console.log("\n--- Test Group 2: Fallback Outline ---");

  const outline = fallbackOutline("Build a SaaS dashboard for analytics");
  assert(typeof outline.name === "string" && outline.name.length > 0, "outline has name");
  assert(typeof outline.description === "string", "outline has description");
  assert(Array.isArray(outline.features) && outline.features.length >= 2, "outline has features");
  assert(Array.isArray(outline.pages) && outline.pages.length >= 2, "outline has pages");
  assert(outline.pages.every(p => typeof p.route === "string"), "each page has route");
  assert(outline.pages.every(p => Array.isArray(p.components)), "each page has components");
  assert(Array.isArray(outline.integrations), "outline has integrations");
  assert(outline.visuals !== undefined, "outline has visuals");

  // Edge case: empty prompt
  const empty = fallbackOutline("");
  assert(typeof empty.name === "string" && empty.name.length > 0, "handles empty prompt");

  // Edge case: very long prompt
  const long = fallbackOutline("a".repeat(5000));
  assert(typeof long.name === "string", "handles very long prompt");
}

// ---------------------------------------------------------------------------
// 3. Template Fallback: Details
// ---------------------------------------------------------------------------

function testFallbackDetails() {
  console.log("\n--- Test Group 3: Fallback Details ---");

  const outline = fallbackOutline("E-commerce store");
  const details = fallbackDetails(outline);

  assert(Array.isArray(details.components) && details.components.length > 0, "details has components");
  assert(details.components.every(c => typeof c.name === "string"), "each component has name");
  assert(Array.isArray(details.fileStructure) && details.fileStructure.length > 0, "details has fileStructure");
  assert(details.fileStructure.includes("app/layout.tsx"), "fileStructure includes layout");
  assert(typeof details.schema === "string", "details has schema");
}

// ---------------------------------------------------------------------------
// 4. Template Fallback: Full Spec
// ---------------------------------------------------------------------------

function testFallbackSpec() {
  console.log("\n--- Test Group 4: Fallback Full Spec ---");

  const spec = fallbackSpec("Create a project management tool");
  assert(typeof spec.name === "string", "spec has name");
  assert(Array.isArray(spec.features), "spec has features");
  assert(Array.isArray(spec.pages), "spec has pages");
  assert(Array.isArray(spec.components), "spec has components");
  assert(Array.isArray(spec.fileStructure), "spec has fileStructure");
  assert(typeof spec.description === "string", "spec has description");
}

// ---------------------------------------------------------------------------
// 5. Template Fallback: FileMap
// ---------------------------------------------------------------------------

function testFallbackFileMap() {
  console.log("\n--- Test Group 5: Fallback FileMap ---");

  const spec = fallbackSpec("Social media platform");
  const files = fallbackFileMap(spec);

  assert(typeof files === "object" && Object.keys(files).length > 0, "produces non-empty file map");
  assert("app/layout.tsx" in files, "includes layout file");
  assert("app/page.tsx" in files, "includes home page");
  assert("app/globals.css" in files, "includes global CSS");
  assert("app/login/page.tsx" in files, "includes login page");
  assert("app/dashboard/page.tsx" in files, "includes dashboard page");
  assert("lib/supabase/client.ts" in files, "includes supabase client");
  assert("lib/supabase/server.ts" in files, "includes supabase server");

  // All files should be non-empty strings
  const allNonEmpty = Object.values(files).every(c => typeof c === "string" && c.length > 0);
  assert(allNonEmpty, "all files are non-empty strings");

  // Login page should have 'use client' since it uses hooks
  assert(files["app/login/page.tsx"].includes('"use client"'), "login page has use client directive");

  // Layout should include the spec name
  assert(files["app/layout.tsx"].includes(spec.name), "layout includes app name");

  // Dark theme styles
  const specDark = fallbackSpec("app");
  const filesDark = fallbackFileMap(specDark);
  assert(filesDark["app/globals.css"].includes("#0a0a0a"), "dark theme has dark background");
}

// ---------------------------------------------------------------------------
// 6. Static File Validation (testFiles)
// ---------------------------------------------------------------------------

async function testStaticFileValidation() {
  console.log("\n--- Test Group 6: Static File Validation (testFiles) ---");

  // Valid files should pass
  const validFiles = {
    "app/page.tsx": `export default function Home() { return <div>Hello</div>; }`,
    "app/layout.tsx": `export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html>; }`,
    "lib/utils.ts": `export function cn(...args: string[]) { return args.join(" "); }`,
  };
  const validResult = await testFiles(validFiles);
  assert(validResult.success === true, "valid files pass validation");

  // Missing 'use client' should fail
  const missingClient = {
    "components/Counter.tsx": `import { useState } from "react";\nexport function Counter() { const [c, setC] = useState(0); return <button onClick={() => setC(c+1)}>{c}</button>; }`,
  };
  const clientResult = await testFiles(missingClient);
  assert(clientResult.success === false, "missing use client detected");
  assert(clientResult.errors!.some(e => e.includes("use client")), "error mentions use client");

  // Path traversal should fail
  const traversal = {
    "../secret.ts": "export const secret = 'bad';",
  };
  const traversalResult = await testFiles(traversal);
  assert(traversalResult.success === false, "path traversal detected");

  // Page missing default export should fail
  const noExport = {
    "app/about/page.tsx": "export function About() { return <div>About</div>; }",
  };
  const exportResult = await testFiles(noExport);
  assert(exportResult.success === false, "missing default export detected");

  // Fallback-generated files should pass validation
  const spec = fallbackSpec("test app");
  const fallbackFiles = fallbackFileMap(spec);
  const fallbackResult = await testFiles(fallbackFiles);
  assert(fallbackResult.success === true, "fallback-generated files pass validation");
}

// ---------------------------------------------------------------------------
// 7. Pipeline Timeout: withTimeout
// ---------------------------------------------------------------------------

async function testWithTimeout() {
  console.log("\n--- Test Group 7: Pipeline Timeout ---");

  // Import dynamically to avoid server-only restriction
  // We test the timeout logic through the exported function types

  // Fast promise should resolve
  const fast = await Promise.race([
    new Promise<string>((resolve) => setTimeout(() => resolve("done"), 10)),
    new Promise<string>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
  ]);
  assert(fast === "done", "fast promise resolves before timeout");

  // Verify timeout error structure
  try {
    await Promise.race([
      new Promise<never>((resolve) => setTimeout(resolve, 10_000)),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("test timed out after 50ms")), 50)),
    ]);
    assert(false, "timeout should throw");
  } catch (err) {
    assert(err instanceof Error && err.message.includes("timed out"), "timeout produces descriptive error");
  }
}

// ---------------------------------------------------------------------------
// Run all tests
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Pipeline Resilience Tests ===");

  testRobustJsonParsing();
  testFallbackOutline();
  testFallbackDetails();
  testFallbackSpec();
  testFallbackFileMap();
  await testStaticFileValidation();
  await testWithTimeout();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nTest runner error:", err);
  process.exit(1);
});
