import { supabaseAdmin } from "./supabase/admin";

export type ProposalType = "investment" | "tech_adoption" | "governance" | "treasury";
export type ProposalStatus = "open" | "approved" | "rejected" | "executed" | "expired";
export type VoteType = "for" | "against";
export type TokenType = "AGT" | "UGT";

export interface DaoProposal {
  id: string;
  title: string;
  description: string | null;
  proposed_by: string | null;
  proposal_type: string | null;
  status: ProposalStatus;
  votes_for: number;
  votes_against: number;
  quorum_required: number;
  execution_payload: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  org_id: string | null;
  created_at: string;
  expires_at: string | null;
  executed_at: string | null;
}

export interface TokenBalance {
  id: string;
  user_id: string;
  token_type: TokenType;
  balance: number;
  total_earned: number;
  total_spent: number;
  last_updated: string;
}

export interface VoteRecord {
  id: string;
  proposal_id: string;
  voter_id: string;
  vote: VoteType;
  tokens_used: number;
  voted_at: string;
}

export class DaoEngine {
  /**
   * Create a new DAO proposal
   */
  async createProposal(params: {
    title: string;
    description: string;
    proposedBy: string;
    type: ProposalType;
    orgId?: string;
    quorumRequired?: number;
    executionPayload?: Record<string, unknown>;
    expiresInDays?: number;
    metadata?: Record<string, unknown>;
  }): Promise<DaoProposal> {
    const expiresAt = params.expiresInDays
      ? new Date(Date.now() + params.expiresInDays * 86400000).toISOString()
      : new Date(Date.now() + 7 * 86400000).toISOString(); // default 7 days

    const { data, error } = await supabaseAdmin
      .from("dao_proposals")
      .insert({
        title: params.title,
        description: params.description,
        proposed_by: params.proposedBy,
        proposal_type: params.type,
        org_id: params.orgId || null,
        quorum_required: params.quorumRequired || 10,
        execution_payload: params.executionPayload || null,
        metadata: params.metadata || {},
        expires_at: expiresAt,
        status: "open",
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create proposal: ${error.message}`);

    // Reward proposer with AGT tokens for creating a proposal
    await this.distributeTokens({
      ownerId: params.proposedBy,
      type: "AGT",
      amount: 5,
    });

    console.log(`[DAO] Proposal created: ${data.id} "${params.title}"`);
    return data as DaoProposal;
  }

  /**
   * Get proposals with optional filtering
   */
  async getProposals(params?: {
    status?: ProposalStatus;
    orgId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DaoProposal[]> {
    let query = supabaseAdmin
      .from("dao_proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (params?.status) query = query.eq("status", params.status);
    if (params?.orgId) query = query.eq("org_id", params.orgId);
    if (params?.limit) query = query.limit(params.limit);
    if (params?.offset) query = query.range(params.offset, params.offset + (params?.limit || 20) - 1);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch proposals: ${error.message}`);
    return (data || []) as DaoProposal[];
  }

  /**
   * Get a single proposal by ID
   */
  async getProposal(proposalId: string): Promise<DaoProposal> {
    const { data, error } = await supabaseAdmin
      .from("dao_proposals")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (error) throw new Error(`Proposal not found: ${error.message}`);
    return data as DaoProposal;
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(params: {
    proposalId: string;
    voterId: string;
    vote: VoteType;
    tokensUsed?: number;
  }): Promise<{ proposal: DaoProposal; vote: VoteRecord }> {
    // 1. Check if already voted
    const { data: existing } = await supabaseAdmin
      .from("voting_history")
      .select("id")
      .eq("proposal_id", params.proposalId)
      .eq("voter_id", params.voterId)
      .maybeSingle();

    if (existing) throw new Error("Already voted on this proposal");

    // 2. Check proposal is still open
    const proposal = await this.getProposal(params.proposalId);
    if (proposal.status !== "open") throw new Error(`Proposal is ${proposal.status}, not open`);
    if (proposal.expires_at && new Date(proposal.expires_at) < new Date()) {
      throw new Error("Proposal has expired");
    }

    // 3. Record the vote
    const { data: voteData, error: voteError } = await supabaseAdmin
      .from("voting_history")
      .insert({
        proposal_id: params.proposalId,
        voter_id: params.voterId,
        vote: params.vote,
        tokens_used: params.tokensUsed || 1,
      })
      .select()
      .single();

    if (voteError) throw new Error(`Failed to cast vote: ${voteError.message}`);

    // 4. Update proposal vote counts via RPC (handles auto-approve/reject)
    const incrementField = params.vote === "for" ? "votes_for" : "votes_against";
    const { data: updatedProposal, error: updateError } = await supabaseAdmin.rpc(
      "increment_proposal_vote",
      {
        p_proposal_id: params.proposalId,
        vote_field: incrementField,
        amount: params.tokensUsed || 1,
      }
    );

    if (updateError) throw new Error(`Failed to update vote count: ${updateError.message}`);

    // 5. Reward voter with UGT
    await this.distributeTokens({
      ownerId: params.voterId,
      type: "UGT",
      amount: 1,
    });

    // 6. If proposal was auto-approved/rejected by quorum, distribute rewards
    const finalProposal = await this.getProposal(params.proposalId);
    if (finalProposal.status === "approved") {
      await supabaseAdmin.rpc("distribute_voting_rewards", {
        p_proposal_id: params.proposalId,
      });
    }

    console.log(`[DAO] Vote cast on ${params.proposalId}: ${params.vote} by ${params.voterId}`);
    return { proposal: finalProposal, vote: voteData as VoteRecord };
  }

  /**
   * Get voting history for a proposal or voter
   */
  async getVotes(params: {
    proposalId?: string;
    voterId?: string;
  }): Promise<VoteRecord[]> {
    let query = supabaseAdmin
      .from("voting_history")
      .select("*")
      .order("voted_at", { ascending: false });

    if (params.proposalId) query = query.eq("proposal_id", params.proposalId);
    if (params.voterId) query = query.eq("voter_id", params.voterId);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch votes: ${error.message}`);
    return (data || []) as VoteRecord[];
  }

  /**
   * Distribute Governance Tokens (AGT or UGT)
   */
  async distributeTokens(params: {
    ownerId: string;
    type: TokenType;
    amount: number;
    orgId?: string;
  }): Promise<void> {
    const { error } = await supabaseAdmin.rpc("upsert_token_balance", {
      p_org_id: params.orgId || null,
      p_owner_id: params.ownerId,
      p_token_type: params.type,
      p_amount: params.amount,
    });

    if (error) {
      console.error(`[DAO] Token distribution failed: ${error.message}`);
      // Non-fatal — don't throw, just log
    }
  }

  /**
   * Get token balances for a user
   */
  async getBalances(userId: string): Promise<{ AGT: number; UGT: number }> {
    const { data, error } = await supabaseAdmin
      .from("token_ledger")
      .select("token_type, balance")
      .eq("user_id", userId);

    if (error) throw new Error(`Failed to fetch balances: ${error.message}`);

    const balances = { AGT: 0, UGT: 0 };
    for (const row of data || []) {
      if (row.token_type === "AGT") balances.AGT = Number(row.balance);
      if (row.token_type === "UGT") balances.UGT = Number(row.balance);
    }
    return balances;
  }

  /**
   * Execute an approved proposal
   */
  async executeProposal(proposalId: string): Promise<DaoProposal> {
    const { data, error } = await supabaseAdmin.rpc("execute_proposal", {
      p_proposal_id: proposalId,
    });

    if (error) throw new Error(`Failed to execute proposal: ${error.message}`);

    // Distribute voting rewards
    await supabaseAdmin.rpc("distribute_voting_rewards", {
      p_proposal_id: proposalId,
    });

    console.log(`[DAO] Proposal ${proposalId} executed`);
    return data as unknown as DaoProposal;
  }

  /**
   * Expire stale proposals (for cron job)
   */
  async expireStaleProposals(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from("dao_proposals")
      .update({ status: "expired" })
      .eq("status", "open")
      .lt("expires_at", new Date().toISOString())
      .select("id");

    if (error) throw new Error(`Failed to expire proposals: ${error.message}`);
    const count = data?.length || 0;
    if (count > 0) console.log(`[DAO] Expired ${count} stale proposals`);
    return count;
  }

  /**
   * Get DAO statistics
   */
  async getStats(): Promise<{
    totalProposals: number;
    openProposals: number;
    approvedProposals: number;
    totalVotes: number;
    totalAGTDistributed: number;
    totalUGTDistributed: number;
  }> {
    const [proposals, votes, agtData, ugtData] = await Promise.all([
      supabaseAdmin.from("dao_proposals").select("status"),
      supabaseAdmin.from("voting_history").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("token_ledger").select("total_earned").eq("token_type", "AGT"),
      supabaseAdmin.from("token_ledger").select("total_earned").eq("token_type", "UGT"),
    ]);

    const allProposals = proposals.data || [];
    return {
      totalProposals: allProposals.length,
      openProposals: allProposals.filter((p) => p.status === "open").length,
      approvedProposals: allProposals.filter((p) => p.status === "approved" || p.status === "executed").length,
      totalVotes: votes.count || 0,
      totalAGTDistributed: (agtData.data || []).reduce((sum, r) => sum + Number(r.total_earned), 0),
      totalUGTDistributed: (ugtData.data || []).reduce((sum, r) => sum + Number(r.total_earned), 0),
    };
  }
}

export const daoEngine = new DaoEngine();
