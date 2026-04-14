import { supabaseAdmin } from "./supabase/admin";

export type ProposalType = "investment" | "tech_adoption" | "governance" | "treasury";
export type VoteType = "for" | "against";

export class DaoEngine {
  /**
   * Initialize DAO for an organization
   */
  async enableDao(orgId: string) {
    const { error } = await supabaseAdmin
      .from("organizations")
      .update({ dao_enabled: true })
      .eq("id", orgId);
    
    if (error) throw error;
    console.log(`[DAO] DAO enabled for organization ${orgId}`);
  }

  /**
   * Create a new DAO proposal
   */
  async createProposal(params: {
    orgId: string;
    proposerId: string;
    title: string;
    description: string;
    type: ProposalType;
    metadata?: any;
  }) {
    const { data, error } = await supabaseAdmin
      .from("dao_proposals")
      .insert({
        org_id: params.orgId,
        proposer_id: params.proposerId,
        title: params.title,
        description: params.description,
        type: params.type,
        metadata: params.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(params: {
    proposalId: string;
    voterId: string;
    vote: VoteType;
    weight?: number;
  }) {
    // 1. Record the vote
    const { error: voteError } = await supabaseAdmin
      .from("dao_votes")
      .insert({
        proposal_id: params.proposalId,
        voter_id: params.voterId,
        vote_type: params.vote,
        weight: params.weight || 1
      });

    if (voteError) throw voteError;

    // 2. Update proposal totals
    const incrementField = params.vote === "for" ? "votes_for" : "votes_against";
    const { data: proposal, error: updateError } = await supabaseAdmin.rpc("increment_proposal_vote", {
      proposal_id: params.proposalId,
      vote_field: incrementField,
      amount: params.weight || 1
    });

    if (updateError) throw updateError;
    return proposal;
  }

  /**
   * Distribute Governance Tokens
   */
  async distributeTokens(params: {
    orgId: string;
    ownerId: string;
    type: "AGT" | "UGT";
    amount: number;
  }) {
    const { error } = await supabaseAdmin.rpc("upsert_token_balance", {
      p_org_id: params.orgId,
      p_owner_id: params.ownerId,
      p_token_type: params.type,
      p_amount: params.amount
    });

    if (error) throw error;
  }
}

export const daoEngine = new DaoEngine();
