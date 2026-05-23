import { FLOWFORGE_BLUEPRINT } from "../src/lib/flowforge/blueprint";
import { FLOWFORGE_TEMPLATES, createExecution, executeNode, calculateCreditsUsed, computeAnalytics, createNanoTrigger } from "../src/lib/flowforge/engine";
import type { Workflow } from "../src/lib/flowforge/types";

async function run() {
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, message: string) => {
    if (condition) {
      console.log(`✅ ${message}`);
      passed++;
    } else {
      console.log(`❌ ${message}`);
      failed++;
    }
  };

  console.log("\n🌐 FlowForge Full E2E: Build business across 25 phases + 3 modes\n");

  // Validate blueprint contract.
  assert(FLOWFORGE_BLUEPRINT.phases_exercised.length === 25, "Blueprint declares all 25 phases");
  const sortedPhases = [...FLOWFORGE_BLUEPRINT.phases_exercised].sort((a, b) => a - b);
  assert(sortedPhases[0] === 1 && sortedPhases[24] === 25, "Blueprint phase range is 1..25");
  assert(FLOWFORGE_BLUEPRINT.modes.includes("elite") && FLOWFORGE_BLUEPRINT.modes.includes("universal") && FLOWFORGE_BLUEPRINT.modes.includes("nano"), "Blueprint includes Elite, Universal, and Nano modes");

  // Validate template coverage across all phases/modes.
  const allTemplatePhases = new Set<number>();
  const allTemplateModes = new Set<string>();
  for (const tpl of FLOWFORGE_TEMPLATES) {
    tpl.phases_exercised.forEach((p) => allTemplatePhases.add(p));
    allTemplateModes.add(tpl.mode);
  }
  assert(allTemplateModes.size === 3, "Templates cover all 3 modes");
  assert(allTemplatePhases.size === 25, `Templates cover all 25 phases (actual: ${allTemplatePhases.size})`);

  // Build one business workflow per mode and execute at least one non-AI node each.
  const workflows: Workflow[] = ["elite", "universal", "nano"].map((mode, idx) => ({
    id: `wf-${mode}`,
    org_id: "org-e2e",
    name: `Business ${mode}`,
    description: `E2E business workflow in ${mode} mode`,
    mode: mode as Workflow["mode"],
    nodes: [
      { id: `n-${idx}-1`, type: "trigger", label: "Trigger", config: {}, position: { x: 0, y: 0 }, connections: [`n-${idx}-2`] },
      { id: `n-${idx}-2`, type: "action", label: "Notify", config: { actionType: "send_notification" }, position: { x: 180, y: 0 }, connections: [] },
    ],
    edges: [],
    trigger_type: mode === "nano" ? "nano-tap" : "webhook",
    status: "active",
    version: 1,
    is_template: false,
    is_monetized: true,
    price_credits: mode === "elite" ? 15 : mode === "universal" ? 9 : 4,
    execution_count: 0,
    created_by: "tester",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const executions = [] as ReturnType<typeof createExecution>[];

  for (const wf of workflows) {
    const execution = createExecution(wf, { business: "FlowForge" });
    execution.status = "running";

    const r1 = await executeNode(wf.nodes[0], execution.input);
    const r2 = await executeNode(wf.nodes[1], r1.output);

    execution.node_results.push(r1, r2);
    execution.status = r2.status === "completed" ? "completed" : "failed";
    execution.output = r2.output as Record<string, unknown>;
    execution.completed_at = new Date().toISOString();
    execution.duration_ms = 25;
    execution.credits_used = calculateCreditsUsed(execution, wf);

    wf.execution_count += 1;
    executions.push(execution);

    assert(r2.status === "completed", `Execution succeeds in ${wf.mode} mode`);
    assert(execution.credits_used > 0, `Credits calculated in ${wf.mode} mode`);
  }

  const analytics = computeAnalytics(workflows, executions);
  assert(analytics.total_workflows === 3, "Analytics totals include all 3 mode workflows");
  assert(analytics.total_executions === 3, "Analytics totals include all executions");
  assert(analytics.success_rate === 1, "Analytics success_rate is 100%");

  const nanoWorkflow = workflows.find((w) => w.mode === "nano")!;
  const nanoTrigger = createNanoTrigger(nanoWorkflow, "Quick Alert", "⚡", "purple");
  assert(nanoTrigger.workflow_id === nanoWorkflow.id, "Nano trigger created for Nano business workflow");

  console.log(`\n🏁 FlowForge Full E2E complete: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Fatal E2E failure:", err);
  process.exit(1);
});
