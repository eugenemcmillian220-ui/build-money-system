import { supabaseAdmin } from "./supabase/db";
import { callLLM, cleanJson } from "./llm";

export type NegotiationTrigger = "price_hike" | "downtime" | "rate_limit" | "contract_renewal" | "manual";
export type NegotiationOutcome = "resolved" | "pending" | "escalated" | "failed";

export interface VendorIncident {
  vendorId: string;
  vendorName: string;
  trigger: NegotiationTrigger;
  context: string; // e.g. "Price increased 40%", "99.7% uptime last 30 days"
}

export interface NegotiationResult {
  outcome: NegotiationOutcome;
  agentMessage: string;
  vendorResponse: string;
  savingsUsd: number;
  nextAction: string;
}

/**
 * Diplomat Agent: Autonomously monitors vendors and negotiates on behalf of the platform
 */
export class DiplomatAgent {
  /**
   * Monitors all vendor health scores and triggers negotiation if needed
   */
  async auditVendors(): Promise<{ vendorsChecked: number; incidentsFound: number }> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    const { data: vendors } = await supabaseAdmin
      .from("vendor_relations")
      .select("*")
      .neq("status", "negotiating"); // Don't interrupt ongoing negotiations

    if (!vendors?.length) return { vendorsChecked: 0, incidentsFound: 0 };

    let incidentsFound = 0;

    for (const vendor of vendors) {
      // Trigger negotiation if health is poor or contract is expiring
      const expiresAt = vendor.contract_expires_at ? new Date(vendor.contract_expires_at) : null;
      const daysToExpiry = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 86400000) : Infinity;
      const isAtRisk = vendor.health_score < 0.75 || daysToExpiry < 30;

      if (isAtRisk) {
        incidentsFound++;
        const trigger: NegotiationTrigger = daysToExpiry < 30 ? "contract_renewal" : "downtime";
        await this.negotiate({
          vendorId: vendor.id,
          vendorName: vendor.vendor_name,
          trigger,
          context: `Health score: ${vendor.health_score}, Days to contract expiry: ${daysToExpiry}`,
        });
      }
    }

    return { vendorsChecked: vendors.length, incidentsFound };
  }

  /**
   * Drafts and sends a negotiation message to a vendor
   */
  async negotiate(incident: VendorIncident): Promise<NegotiationResult> {
    if (!supabaseAdmin) throw new Error("Supabase admin not configured");

    console.log(`[Diplomat] Opening negotiation with ${incident.vendorName} — Trigger: ${incident.trigger}`);

    // Capture original status before changing to 'negotiating'
    const { data: vendorRow } = await supabaseAdmin
      .from("vendor_relations")
      .select("status")
      .eq("id", incident.vendorId)
      .single();
    const originalStatus = vendorRow?.status ?? "active";

    // Update vendor status to 'negotiating'
    await supabaseAdmin
      .from("vendor_relations")
      .update({ status: "negotiating", updated_at: new Date().toISOString() })
      .eq("id", incident.vendorId);

    // 1. AI drafts a professional negotiation message
    const systemPrompt = `You are the Chief Negotiation Officer for an elite AI platform with 10,000+ enterprise clients.
You are negotiating with ${incident.vendorName} about: ${incident.trigger}.
Context: ${incident.context}

Draft a firm but professional negotiation message that:
- References our high usage volume as leverage
- Requests a specific concession (SLA credit, price reduction, or priority support)
- Sets a 48-hour response deadline
- Implies we are evaluating competitors

Also simulate a realistic vendor response and calculate projected savings.

Return ONLY a JSON object:
{
  "agentMessage": "Full message text...",
  "simulatedVendorResponse": "Vendor reply text...",
  "outcome": "resolved" | "pending" | "escalated",
  "savingsUsd": number,
  "nextAction": "Description of what happens next..."
}`;

    let result: { agentMessage: string; simulatedVendorResponse: string; outcome: NegotiationOutcome; savingsUsd: number; nextAction: string };
    try {
      const raw = await callLLM(
        [{ role: "system", content: systemPrompt }, { role: "user", content: "Draft negotiation now:" }],
        { temperature: 0.4 }
      );
      result = JSON.parse(cleanJson(raw));
    } catch (err) {
      console.error(`[Diplomat] Negotiation draft failed for ${incident.vendorName}:`, err);
      // Revert vendor status to its original value so it doesn't get stuck in "negotiating"
      await supabaseAdmin
        .from("vendor_relations")
        .update({ status: originalStatus, updated_at: new Date().toISOString() })
        .eq("id", incident.vendorId);
      return {
        outcome: "failed",
        agentMessage: "Negotiation draft could not be generated — neural link error.",
        vendorResponse: "N/A",
        savingsUsd: 0,
        nextAction: `Manual negotiation required. Vendor status reverted to '${originalStatus}'.`,
      };
    }

    // 2. Log the negotiation
    await supabaseAdmin.from("negotiation_logs").insert({
      vendor_id: incident.vendorId,
      trigger: incident.trigger,
      agent_message: result.agentMessage,
      vendor_response: result.simulatedVendorResponse,
      outcome: result.outcome,
      savings_usd: result.savingsUsd ?? 0,
    });

    // 3. Update vendor status based on outcome
    await supabaseAdmin
      .from("vendor_relations")
      .update({
        status: result.outcome === "resolved" ? "active" : "at_risk",
        negotiated_price: result.savingsUsd > 0 ? result.savingsUsd : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", incident.vendorId);

    return {
      outcome: result.outcome,
      agentMessage: result.agentMessage,
      vendorResponse: result.simulatedVendorResponse,
      savingsUsd: result.savingsUsd ?? 0,
      nextAction: result.nextAction,
    };
  }
}

export const diplomatAgent = new DiplomatAgent();
