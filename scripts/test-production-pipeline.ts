import { codeSandbox } from "../src/lib/sandbox";
import { testFiles } from "../src/lib/llm";
import { FileMap } from "../src/lib/types";

async function runTests() {
  console.log("🚀 Starting Production Pipeline Verification Tests...\n");

  // Test 1: Sandbox Structural Validation (No API Key) - Unclosed Tag
  console.log("Test 1: Sandbox Structural Validation (No API Key) - Unclosed Tag");
  const brokenFiles: FileMap = {
    "app/page.tsx": "export default function Home() { return (<div>Unclosed div)",
  };
  const result1 = await codeSandbox.verifyProject(brokenFiles);
  console.log("Result:", result1.success ? "✅ Success" : "❌ Failed (Expected)");
  console.log("Errors:", result1.typeErrors);
  console.log("");

  // Test 2: llm.ts testFiles - 'any' detection
  console.log("Test 2: llm.ts testFiles - 'any' detection");
  const anyFiles: FileMap = {
    "app/page.tsx": "export default function Home() { const x: any = 1; return <div>{x}</div>; }",
  };
  const result2 = await testFiles(anyFiles);
  console.log("Result:", result2.success ? "✅ Success" : "❌ Failed (Expected)");
  console.log("Errors:", result2.errors);
  console.log("");

  // Test 3: llm.ts testFiles - Missing 'use client'
  console.log("Test 3: llm.ts testFiles - Missing 'use client'");
  const hookFiles: FileMap = {
    "components/Button.tsx": "import { useState } from 'react'; export default function Button() { const [s] = useState(0); return <button>{s}</button>; }",
  };
  const result3 = await testFiles(hookFiles);
  console.log("Result:", result3.success ? "✅ Success" : "❌ Failed (Expected)");
  console.log("Errors:", result3.errors);
  console.log("");

  // Test 4: Valid Production-Ready Component
  console.log("Test 4: Valid Production-Ready Component");
  const validFiles: FileMap = {
    "app/page.tsx": `"use client";\nimport React, { useState } from 'react';\n\nexport default function Home() {\n  const [count, setCount] = useState(0);\n  return (\n    <main className="p-8">\n      <h1 className="text-2xl font-bold">Counter</h1>\n      <button \n        data-testid="counter-btn"\n        onClick={() => setCount(count + 1)}\n        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"\n      >\n        Count: {count}\n      </button>\n    </main>\n  );\n}`,
  };
  const result4_sandbox = await codeSandbox.verifyProject(validFiles);
  const result4_test = await testFiles(validFiles);
  console.log("Sandbox Result:", result4_sandbox.success ? "✅ Success" : "❌ Failed");
  console.log("Test Result:", result4_test.success ? "✅ Success" : "❌ Failed");
  if (!result4_test.success) console.log("Errors:", result4_test.errors);
  console.log("");

  console.log("🏁 Verification Tests Completed.");
}

runTests().catch(console.error);
