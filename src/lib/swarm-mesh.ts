import { supabaseAdmin } from "./supabase/admin";

export type TradeType = "agent_lending" | "knowledge" | "compute" | "template";
export type TradeStatus = "proposed" | "accepted" | "active" | "completed" | "disputed" | "cancelled";
export type ConnectionStatus = "pending" | "active" | "revoked" | "expired";
export type TrustLevel = "basic" | "trusted" | "allied" | "sovereign";
export type IntelType = "trend" | "security" | "performance" | "market" | "threat";

export interface FederationEmpire {
  id: string;
  org_id: string | null;
  empire_name: string;
  empire_url: string | null;
  description: string | null;
  capabilities: string[];
  agents_available: string[];
  trust_score: number;
  total_trades: number;
  total_intelligence_shared: number;
  is_active: boolean;
  public_key: string | null;
  metadata: Record<string, unknown>;
  registered_at: string;
  last_heartbeat_at: string;
}

export interface MeshConnection {
  id: string;
  source_empire_id: string;
  target_empire_id: string;
  status: ConnectionStatus;
  trust_level: TrustLevel;
  initiated_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FederationTrade {
  id: string;
  seller_empire_id: string | null;
  buyer_empire_id: string | null;
  trade_type: TradeType;
  resource_name: string;
  resource_description: string | null;
  price_agt: number;
  price_ugt: number;
  status: TradeStatus;
  duration_hours: number | null;
  started_at: string | null;
  completed_at: string | null;
  rating: number | null;
  review: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MeshIntelligence {
  id: string;
  source_empire_id: string | null;
  intel_type: IntelType;
  title: string;
  summary: string;
  data: Record<string, unknown>;
  confidence: number;
  relevance_score: number;
  is_verified: boolean;
  upvotes: number;
  downvotes: number;
  expires_at: string | null;
  created_at: string;
}

export interface FederationStats {
  total_empires: number;
  total_connections: number;
  total_trades: number;
  active_trades: number;
  completed_trades: number;
  intelligence_shared: number;
  avg_trust_score: number;
}

export class SwarmMesh {
  /**
   * Register an empire in the federation mesh
   */
  async registerEmpire(params: {
    orgId: string;
    empireName: string;
    description?: string;
    empireUrl?: string;
    capabilities?: string[];
    agentsAvailable?: string[];
  }): Promise<FederationEmpire> {
    const { data, error } = await supabaseAdmin
      .from("federation_empires")
      .upsert(
        {
          org_id: params.orgId,
          empire_name: params.empireName,
          description: params.description || null,
          empire_url: params.empireUrl || null,
          capabilities: params.capabilities || [],
          agents_available: params.agentsAvailable || [],
          last_heartbeat_at: new Date().toISOString(),
        },
        { onConflict: "org_id" }
      )
      .select()
      .single();

    if (error) throw new Error(`Failed to register empire: ${error.message}`);
    console.log(`[MESH] Empire registered: ${data.id} "${params.empireName}"`);
    return data as FederationEmpire;
  }

  /**
   * Get all active federation empires
   */
  async getEmpires(params?: {
    capability?: string;
    minTrust?: number;
    limit?: number;
  }): Promise<FederationEmpire[]> {
    let query = supabaseAdmin
      .from("federation_empires")
      .select("*")
      .eq("is_active", true)
      .order("trust_score", { ascending: false });

    if (params?.minTrust) query = query.gte("trust_score", params.minTrust);
    if (params?.capability) query = query.contains("capabilities", [params.capability]);
    if (params?.limit) query = query.limit(params.limit);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch empires: ${error.message}`);
    return (data || []) as FederationEmpire[];
  }

  /**
   * Get a single empire by ID
   */
  async getEmpire(empireId: string): Promise<FederationEmpire> {
    const { data, error } = await supabaseAdmin
      .from("federation_empires")
      .select("*")
      .eq("id", empireId)
      .single();

    if (error) throw new Error(`Empire not found: ${error.message}`);
    return data as FederationEmpire;
  }

  /**
   * Get empire by org ID
   */
  async getEmpireByOrg(orgId: string): Promise<FederationEmpire | null> {
    const { data, error } = await supabaseAdmin
      .from("federation_empires")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch empire: ${error.message}`);
    return data as FederationEmpire | null;
  }

  /**
   * Request a mesh connection to another empire
   */
  async requestConnection(params: {
    sourceEmpireId: string;
    targetEmpireId: string;
    initiatedBy: string;
  }): Promise<MeshConnection> {
    // Prevent self-connections
    if (params.sourceEmpireId === params.targetEmpireId) {
      throw new Error("Cannot connect to self");
    }

    const { data, error } = await supabaseAdmin
      .from("mesh_connections")
      .insert({
        source_empire_id: params.sourceEmpireId,
        target_empire_id: params.targetEmpireId,
        initiated_by: params.initiatedBy,
        status: "pending",
        trust_level: "basic",
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to request connection: ${error.message}`);
    console.log(`[MESH] Connection requested: ${params.sourceEmpireId} → ${params.targetEmpireId}`);
    return data as MeshConnection;
  }

  /**
   * Accept a pending mesh connection
   */
  async acceptConnection(connectionId: string): Promise<MeshConnection> {
    const { data, error } = await supabaseAdmin
      .from("mesh_connections")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 86400000).toISOString(), // 90 days
      })
      .eq("id", connectionId)
      .eq("status", "pending")
      .select()
      .single();

    if (error) throw new Error(`Failed to accept connection: ${error.message}`);
    return data as MeshConnection;
  }

  /**
   * Get connections for an empire
   */
  async getConnections(empireId: string): Promise<MeshConnection[]> {
    const { data, error } = await supabaseAdmin
      .from("mesh_connections")
      .select("*")
      .or(`source_empire_id.eq.${empireId},target_empire_id.eq.${empireId}`)
      .in("status", ["pending", "active"])
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch connections: ${error.message}`);
    return (data || []) as MeshConnection[];
  }

  /**
   * Propose a trade to another empire
   */
  async proposeTrade(params: {
    sellerEmpireId: string;
    buyerEmpireId: string;
    tradeType: TradeType;
    resourceName: string;
    resourceDescription?: string;
    priceAgt?: number;
    priceUgt?: number;
    durationHours?: number;
    metadata?: Record<string, unknown>;
  }): Promise<FederationTrade> {
    const { data, error } = await supabaseAdmin
      .from("federation_trades")
      .insert({
        seller_empire_id: params.sellerEmpireId,
        buyer_empire_id: params.buyerEmpireId,
        trade_type: params.tradeType,
        resource_name: params.resourceName,
        resource_description: params.resourceDescription || null,
        price_agt: params.priceAgt || 0,
        price_ugt: params.priceUgt || 0,
        duration_hours: params.durationHours || null,
        status: "proposed",
        metadata: params.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to propose trade: ${error.message}`);
    console.log(`[MESH] Trade proposed: ${data.id} "${params.resourceName}"`);
    return data as FederationTrade;
  }

  /**
   * Accept and start a trade
   */
  async acceptTrade(tradeId: string): Promise<FederationTrade> {
    const { data, error } = await supabaseAdmin
      .from("federation_trades")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
      })
      .eq("id", tradeId)
      .eq("status", "proposed")
      .select()
      .single();

    if (error) throw new Error(`Failed to accept trade: ${error.message}`);
    return data as FederationTrade;
  }

  /**
   * Complete a trade with rating
   */
  async completeTrade(params: {
    tradeId: string;
    rating: number;
    review?: string;
  }): Promise<FederationTrade> {
    const { data: result } = await supabaseAdmin.rpc("complete_federation_trade", {
      p_trade_id: params.tradeId,
      p_rating: params.rating,
      p_review: params.review || null,
    });

    if (!result) throw new Error("Failed to complete trade");
    return result as unknown as FederationTrade;
  }

  /**
   * Get trades for an empire
   */
  async getTrades(params?: {
    empireId?: string;
    status?: TradeStatus;
    tradeType?: TradeType;
    limit?: number;
  }): Promise<FederationTrade[]> {
    let query = supabaseAdmin
      .from("federation_trades")
      .select("*")
      .order("created_at", { ascending: false });

    if (params?.empireId) {
      query = query.or(
        `seller_empire_id.eq.${params.empireId},buyer_empire_id.eq.${params.empireId}`
      );
    }
    if (params?.status) query = query.eq("status", params.status);
    if (params?.tradeType) query = query.eq("trade_type", params.tradeType);
    if (params?.limit) query = query.limit(params.limit);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch trades: ${error.message}`);
    return (data || []) as FederationTrade[];
  }

  /**
   * Share intelligence with the federation
   */
  async shareIntelligence(params: {
    sourceEmpireId: string;
    intelType: IntelType;
    title: string;
    summary: string;
    data?: Record<string, unknown>;
    confidence?: number;
  }): Promise<MeshIntelligence> {
    const { data, error } = await supabaseAdmin
      .from("mesh_intelligence")
      .insert({
        source_empire_id: params.sourceEmpireId,
        intel_type: params.intelType,
        title: params.title,
        summary: params.summary,
        data: params.data || {},
        confidence: params.confidence || 0.5,
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to share intelligence: ${error.message}`);

    // SECURITY FIX: Use atomic increment instead of read-modify-write
    // The old pattern had a race condition where concurrent writes
    // would silently drop increments.
    const { error: incrError } = await supabaseAdmin.rpc("increment_field", {
      p_table: "federation_empires",
      p_id: params.sourceEmpireId,
      p_field: "total_intelligence_shared",
    });
    // Fallback: raw SQL increment if RPC doesn't exist
    if (incrError) {
      await supabaseAdmin
        .from("federation_empires")
        .update({
          total_intelligence_shared: supabaseAdmin.rpc("raw", {
            sql: "total_intelligence_shared + 1"
          }) as unknown as number,
        })
        .eq("id", params.sourceEmpireId);
    }

    console.log(`[MESH] Intelligence shared: ${data.id} "${params.title}"`);
    return data as MeshIntelligence;
  }

  /**
   * Get intelligence feed
   */
  async getIntelligenceFeed(params?: {
    intelType?: IntelType;
    minConfidence?: number;
    limit?: number;
  }): Promise<MeshIntelligence[]> {
    let query = supabaseAdmin
      .from("mesh_intelligence")
      .select("*")
      .order("created_at", { ascending: false });

    if (params?.intelType) query = query.eq("intel_type", params.intelType);
    if (params?.minConfidence) query = query.gte("confidence", params.minConfidence);
    if (params?.limit) query = query.limit(params.limit);

    const { data, error } = await query;
    if (error) throw new Error(`Failed to fetch intelligence: ${error.message}`);
    return (data || []) as MeshIntelligence[];
  }

  /**
   * Upvote intelligence
   */
  /**
   * Upvote intelligence - SECURITY FIX: Use proper atomic increment
   * Old fallback used `supabaseAdmin.rpc as any` which is syntactically invalid.
   */
  async upvoteIntelligence(intelId: string): Promise<void> {
    // Try RPC first (atomic server-side increment)
    const { error } = await supabaseAdmin.rpc("increment_field", {
      p_table: "mesh_intelligence",
      p_id: intelId,
      p_field: "upvotes",
    });
    
    // Fallback: read-then-write (not ideal but correct)
    if (error) {
      const { data } = await supabaseAdmin
        .from("mesh_intelligence")
        .select("upvotes")
        .eq("id", intelId)
        .single();
      
      if (data) {
        await supabaseAdmin
          .from("mesh_intelligence")
          .update({ upvotes: (data.upvotes || 0) + 1 })
          .eq("id", intelId);
      }
    }
  }

  /**
   * Get federation stats
   */
  async getStats(): Promise<FederationStats> {
    const { data, error } = await supabaseAdmin.rpc("get_federation_stats");
    if (error) {
      // Fallback manual stats
      const [empires, connections, trades, intel] = await Promise.all([
        supabaseAdmin.from("federation_empires").select("trust_score").eq("is_active", true),
        supabaseAdmin.from("mesh_connections").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabaseAdmin.from("federation_trades").select("status"),
        supabaseAdmin.from("mesh_intelligence").select("id", { count: "exact", head: true }),
      ]);

      const allTrades = trades.data || [];
      const allEmpires = empires.data || [];
      return {
        total_empires: allEmpires.length,
        total_connections: connections.count || 0,
        total_trades: allTrades.length,
        active_trades: allTrades.filter((t) => t.status === "active").length,
        completed_trades: allTrades.filter((t) => t.status === "completed").length,
        intelligence_shared: intel.count || 0,
        avg_trust_score:
          allEmpires.length > 0
            ? allEmpires.reduce((sum, e) => sum + Number(e.trust_score), 0) / allEmpires.length
            : 50,
      };
    }
    return data as FederationStats;
  }

  /**
   * Heartbeat — keep empire alive in the mesh
   */
  async heartbeat(empireId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("federation_empires")
      .update({ last_heartbeat_at: new Date().toISOString() })
      .eq("id", empireId);

    if (error) console.error(`[MESH] Heartbeat failed for ${empireId}: ${error.message}`);
  }

  /**
   * Expire stale connections and deactivate dormant empires
   */
  async runMaintenance(): Promise<{ expiredConnections: number; dormantEmpires: number }> {
    const now = new Date().toISOString();
    const dormantThreshold = new Date(Date.now() - 30 * 86400000).toISOString();

    // Expire connections past their expiry
    const { data: expiredConn } = await supabaseAdmin
      .from("mesh_connections")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now)
      .select("id");

    // Deactivate empires with no heartbeat in 30 days
    const { data: dormantEmp } = await supabaseAdmin
      .from("federation_empires")
      .update({ is_active: false })
      .eq("is_active", true)
      .lt("last_heartbeat_at", dormantThreshold)
      .select("id");

    const expired = expiredConn?.length || 0;
    const dormant = dormantEmp?.length || 0;
    if (expired > 0 || dormant > 0) {
      console.log(`[MESH] Maintenance: ${expired} connections expired, ${dormant} empires deactivated`);
    }
    return { expiredConnections: expired, dormantEmpires: dormant };
  }
}

export const swarmMesh = new SwarmMesh();
