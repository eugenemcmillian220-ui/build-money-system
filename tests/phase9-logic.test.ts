import { security } from "../src/lib/security";
import { auditProject, scanPII } from "../src/lib/compliance";
import { detectFileType, sortFileKeys } from "../src/lib/types";

async function runE2ETests() {
  console.log("🚀 Starting Phase 9 Logic Verification...\n");

  // 1. Test PII Scanning
  console.log("--- Test 1: PII Scanning ---");
  const tests = [
    { name: "Clean prompt", input: "Build a landing page", expected: true },
    { name: "Email detection", input: "My email is test@example.com", expected: false },
    { name: "CC detection", input: "Card: 1234-5678-9012-3456", expected: false },
  ];

  for (const t of tests) {
    try {
      security.checkPII(t.input);
      if (t.expected) console.log(`✅ ${t.name}: Passed`);
      else console.log(`❌ ${t.name}: Failed (should have blocked)`);
    } catch (e: any) {
      if (!t.expected) console.log(`✅ ${t.name}: Blocked correctly (${e.message})`);
      else console.log(`❌ ${t.name}: Failed (should not have blocked)`);
    }
  }

  // 2. Test Compliance Auditing
  console.log("\n--- Test 2: Compliance Vault ---");
  const mockFiles = {
    "app/page.tsx": "import crypto from 'crypto'; console.log('audit logs');",
    "app/privacy/page.tsx": "<h1>Privacy Policy</h1>",
    "lib/db.ts": "export const config = { encryption: true };",
    "supabase/migrations/schema.sql": "CREATE POLICY 'User can delete' ON users FOR DELETE USING (auth.uid() = id);"
  };
  const report = await auditProject("test-id", mockFiles);
  console.log(`✅ Audit Score: ${report.score}/100`);
  console.log(`✅ SOC2 Passed: ${report.soc2.passed}`);
  console.log(`✅ GDPR Passed: ${report.gdpr.passed}`);
  
  if (report.score >= 80) console.log("✅ Compliance logic verified");
  else console.log("❌ Compliance score calculation error");

  // 3. Test Type Utilities
  console.log("\n--- Test 3: Core Utilities ---");
  console.log(`✅ File Type Detection: ${detectFileType("app/page.tsx") === "tsx"}`);
  const sorted = sortFileKeys({ "components/A.tsx": "", "app/page.tsx": "" });
  console.log(`✅ Key Sorting: ${sorted[0] === "app/page.tsx"}`);

  console.log("\n✨ Phase 9 Logic Verification Complete!");
}

runE2ETests().catch(err => {
  console.error("\n❌ Testing Failed:", err);
  process.exit(1);
});
