import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, name, properties, url, sessionId } = body;

    if (!projectId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use RPC for ingestion to handle performance and error clustering
    const { error } = await supabaseAdmin.rpc("ingest_pulse_event", {
      p_project_id: projectId,
      p_event_name: name,
      p_properties: properties || {},
      p_url: url || null,
      p_session_id: sessionId || null,
    });

    if (error) {
      console.error("[PULSE] Ingestion RPC error:", error);
      // Fallback: manual insert if RPC fails
      await supabaseAdmin.from("event_logs").insert({
        project_id: projectId,
        event_name: name,
        properties: properties || {},
        url: url || null,
        session_id: sessionId || null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PULSE] Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
