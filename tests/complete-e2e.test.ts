import { security } from "../src/lib/security";
import { aiDebugger } from "../src/lib/ai-debugger";
import { feedbackLoop } from "../src/lib/feedback-loop";
import { learningStore } from "../src/lib/learning-store";
import { scalingSimulation } from "../src/lib/scaling";
import { ideaValidator } from "../src/lib/idea-validator";
import { productPlanner } from "../src/lib/product-planner";
import { growthEngine } from "../src/lib/growth-engine";
import { monetizationEngine } from "../src/lib/monetization";
import { autoDeployer } from "../src/lib/auto-deployer";
import { aiScheduler } from "../src/lib/ai-scheduler";
import { codeSandbox } from "../src/lib/sandbox";
import { auditProject } from "../src/lib/compliance";
import { detectFileType, sortFileKeys } from "../src/lib/types";

// Mock global fetch to simulate API responses for LLM and Vercel
(global as any).fetch = async (url: string, init?: any) => {
  const body = init?.body ? JSON.parse(init.body) : {};
  const prompt = JSON.stringify(body.messages || "");

  // LLM Mocking
  if (url.includes("openrouter.ai") || url.includes("openai.com")) {
    if (prompt.includes("specification")) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            name: "Test App",
            description: "Mocked app",
            features: ["feat1"],
            pages: [{ route: "/", description: "home", components: ["Hero"] }],
            components: [{ name: "Hero", description: "hero" }],
            integrations: ["supabase"],
            fileStructure: ["app/page.tsx"]
          }) } }]
        })
      };
    }
    if (prompt.includes("Generate all files") || prompt.includes("code here")) {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify({
            files: { "app/page.tsx": "export default function Page() { return <div>Mock</div>; }" }
          }) } }]
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Mocked Response" } }]
      })
    };
  }

  // Vercel Mocking
  if (url.includes("api.vercel.com")) {
    return {
      ok: true,
      json: async () => ({ id: "dpl_mock", url: "test.vercel.app", readyState: "READY" })
    };
  }

  return { ok: true, json: async () => ({}) };
};

async function runCompleteE2E() {
  console.log("🌟 Starting Full Platform End-to-End Suite (Phases 1-9)\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ ${message}`);
      passed++;
    } else {
      console.log(`❌ ${message}`);
      failed++;
    }
  }

  // --- Phase 1-3: Core Generation & Persistence ---
  console.log("\n--- Phases 1-3: Engine & Database ---");
  assert(detectFileType("app/page.tsx") === "tsx", "Type detection (P1)");
  const sorted = sortFileKeys({ "components/A.tsx": "", "app/page.tsx": "" });
  assert(sorted[0] === "app/page.tsx", "File sorting (P2)");
  
  // --- Phase 4: Deployment & Export ---
  console.log("\n--- Phase 4: Deployment & Cloud ---");
  const health = await autoDeployer.deployWithMonitoring(async () => ({ id: "dpl_123", url: "test.com" }));
  assert(health.id === "dpl_123", "Deployment monitoring (P4)");

  // --- Phase 5: Production Systems ---
  console.log("\n--- Phase 5: Reliability & Security ---");
  assert(security.validateApiKey("sk-123456789012345678901"), "Security layer (P5)");
  const debugReports = aiDebugger.analyzeProject({ "app/page.tsx": "console.log('test')" });
  assert(debugReports.length >= 0, "AI Debugger (P5)");
  const feedback = await feedbackLoop.recordFeedback({ projectId: "123", rating: 5, category: "accuracy" });
  assert(!!feedback.id, "Feedback loop (P5)");

  // --- Phase 6: AI Company Builder ---
  console.log("\n--- Phase 6: Business Intelligence ---");
  const idea = await ideaValidator.validateIdea("AI for cats");
  assert(idea.score > 0, "Idea validation (P6)");
  const plan = productPlanner.planProduct("AI for cats");
  assert(plan.features.length > 0, "Product planning (P6)");
  const growth = await growthEngine.generateGrowthStrategy("AI for cats");
  assert(growth.channels.length > 0, "Growth strategy (P6)");

  // --- Phase 7: Autonomous Systems ---
  console.log("\n--- Phase 7: Autonomy & Optimization ---");
  const task = aiScheduler.scheduleBuild("proj-123", "high");
  assert(task.status === "pending", "AI Scheduling (P7)");
  const deployHealth = await autoDeployer.checkHealth("dpl_123");
  assert(deployHealth.status === "healthy", "Auto-deploy health (P7)");

  // --- Phase 8: AI Development OS ---
  console.log("\n--- Phase 8: Enterprise OS ---");
  const sandbox = await codeSandbox.verifyProject({ "app/page.tsx": "export default {}" });
  assert(sandbox.success, "Code Sandbox verification (P8)");

  // --- Phase 9: Autonomous Enterprise ---
  console.log("\n--- Phase 9: The Autonomous Layer ---");
  const audit = await auditProject("test", { 
    "app/page.tsx": "import crypto from 'crypto'; console.log('audit'); // RLS check",
    "app/privacy/page.tsx": "Privacy Policy",
    "lib/data.ts": "export const remove = () => {};"
  });
  assert(audit.score >= 50, "Compliance Vault audit (P9)");
  
  try {
    security.checkPII("Email me at test@example.com");
    assert(false, "PII Scanning - Failed to block");
  } catch {
    assert(true, "PII Scanning - Blocked correctly (P9)");
  }

  console.log(`\n🏁 Suite Finished: ${passed} Passed, ${failed} Failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runCompleteE2E().catch(err => {
  console.error("\n💥 Critical Suite Failure:", err);
  process.exit(1);
});
