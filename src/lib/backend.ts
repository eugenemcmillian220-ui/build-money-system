import { MultiFileResponse } from "./openrouter";

export function attachBackend(app: MultiFileResponse): Record<string, string> {
  const files = { ...app.files };

  // 1. Add health check API route
  if (!files["app/api/health/route.ts"]) {
    files["app/api/health/route.ts"] = `import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
}
`;
  }

  // 2. Add Supabase DB helper if not exists
  if (!files["lib/supabase.ts"] && !files["lib/db.ts"]) {
    files["lib/supabase.ts"] = `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;
  }

  // 3. Add SQL schema file if provided
  if (app.schema && !files["supabase/schema.sql"]) {
    files["supabase/schema.sql"] = app.schema;
  }

  return files;
}
