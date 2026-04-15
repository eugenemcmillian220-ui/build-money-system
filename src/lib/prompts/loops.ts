/**
 * Phase 5: Architect of Loops - Viral Growth Injection
 * Provides prompt fragments to ensure manifestations include growth loops.
 */
export const VIRAL_LOOPS_INJECTION = `
VIRAL GROWTH LOOP REQUIREMENTS:
1. Every manifestation MUST include a 'Referral & Rewards' system.
2. Implement a 'Share to Slack/Social' feature for key achievements or milestones using platform-neutral sharing logic.
3. Add a 'Waitlist' or 'Invite-Only' gate if the protocol is 'saas'.
4. Ensure the UI includes 'Social Proof' components (simulated testimonials or user counts).
5. Implement a 'Hook' (e.g., daily streaks, points, or leaderboard) to ensure user retention.
`;

export function getLoopsInjection(protocol: string): string {
  if (protocol === "saas" || protocol === "marketplace") {
    return VIRAL_LOOPS_INJECTION;
  }
  return "";
}
