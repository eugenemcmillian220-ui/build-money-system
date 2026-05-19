const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function count(cmd) {
  return Number(execSync(cmd, { encoding: 'utf8' }).trim());
}

const phasesText = fs.readFileSync('src/lib/phases.ts', 'utf8');
const phaseCount = (phasesText.match(/\bid:\s*\d+/g) || []).length;
const agentsCount = count("find src/lib/agents -maxdepth 1 -type f | wc -l");
const apiRouteCount = count("find src/app/api -name 'route.ts' | wc -l");
const migrationCount = count("find supabase -path '*/migrations/*.sql' | wc -l");

const todoCmd = "rg -n \"TODO|STUB|PLACEHOLDER|FIXME\" src --glob '!**/*.map'";
const todoOutput = execSync(todoCmd, { encoding: 'utf8' }).trim();
const todoLines = todoOutput ? todoOutput.split('\n') : [];
const files = new Set(todoLines.map((line) => line.split(':')[0]));

const summary = `# Step 1 Audit Report\n\nGenerated: ${new Date().toISOString()}\n\n## Repo Stats\n- Phases defined in src/lib/phases.ts: ${phaseCount}\n- Agent files in src/lib/agents: ${agentsCount}\n- API route handlers (route.ts) under src/app/api: ${apiRouteCount}\n- Supabase migration SQL files: ${migrationCount}\n- Source files with TODO/STUB/PLACEHOLDER/FIXME in src/: ${files.size}\n- Total matching lines in src/: ${todoLines.length}\n\n## TODO-like Findings\n${todoOutput || 'None found.'}\n`;

fs.writeFileSync(path.join(process.cwd(), 'STEP1_AUDIT_REPORT.md'), summary);
console.log('Wrote STEP1_AUDIT_REPORT.md');
