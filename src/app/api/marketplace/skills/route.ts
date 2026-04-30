export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

const skillSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  category: z.enum(["ui", "logic", "security", "data"]),
  price: z.number().nonnegative(),
  promptTemplate: z.string().min(10),
  version: z.string().default("1.0.0"),
});

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort") || "popular";

  try {
    const supabase = await createClient();
    let query = supabase.from("agent_skills").select("*");
    
    if (category) {
      query = query.eq("category", category);
    }

    if (sort === "popular") {
      query = query.order("usage_count", { ascending: false });
    } else if (sort === "rated") {
      query = query.order("rating", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    return Response.json(data || []);
  } catch (error) {
    // DA-029 FIX: No in-memory fallback — fail properly
    console.error("Marketplace fetch error:", error);
    return Response.json({ error: "Service unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = skillSchema.parse(body);

    const { data, error } = await supabase
      .from("agent_skills")
      .insert({
        ...parsed,
        author_id: user.id,
        author_name: user.email?.split("@")[0] || "Anonymous",
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (error) {
    console.error("Marketplace publish error:", error);
    return Response.json({ error: "Failed to publish skill" }, { status: 500 });
  }
}
