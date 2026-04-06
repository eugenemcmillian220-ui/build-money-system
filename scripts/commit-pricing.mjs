import { execSync } from "child_process";

try {
  // Configure git identity
  execSync('git config user.email "v0[bot]@users.noreply.github.com"', { cwd: "/vercel/share/v0-project", stdio: "pipe" });
  execSync('git config user.name "v0[bot]"', { cwd: "/vercel/share/v0-project", stdio: "pipe" });

  // Check git status
  const status = execSync("git status --porcelain", { cwd: "/vercel/share/v0-project", encoding: "utf-8" });
  console.log("[v0] Git status:\n", status);

  // Stage all changes
  execSync("git add .", { cwd: "/vercel/share/v0-project" });
  console.log("[v0] Staged all changes");

  // Commit the changes
  const commitMessage = `feat: implement comprehensive pricing system

- Add Elite Empire tiers (Phases 1-17): Starter, Pro, Enterprise
- Add Basic Foundation tiers (Phases 1-3): Mini, Starter, Pro, Premium  
- Add lifetime licenses: Starter ($790), Pro ($2390), On-Prem ($4999)
- Add credit top-up packs with bulk discounts
- Implement marketplace commission tracking (25%)
- Implement affiliate program with 20% recurring commission
- Add lifetime license checkout flow and webhook handling
- Add affiliate commission processing in billing engine
- Create pricing page and enhanced pricing table UI
- Add database migrations for new billing tables
- Add setup script to create Stripe products

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>`;

  execSync(`git commit -m "${commitMessage}"`, { cwd: "/vercel/share/v0-project" });
  console.log("[v0] Successfully committed changes");

  // Show the commit
  const commitLog = execSync("git log -1 --oneline", { cwd: "/vercel/share/v0-project", encoding: "utf-8" });
  console.log("[v0] Latest commit:\n", commitLog);

} catch (error) {
  console.error("[v0] Error during git operations:", error instanceof Error ? error.message : error);
  process.exit(1);
}
