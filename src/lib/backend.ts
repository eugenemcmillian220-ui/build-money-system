export interface BackendOptions {
  files: Record<string, string>;
  description?: string;
  schema?: string;
  integrations?: string[];
}

export function attachBackend(app: BackendOptions): Record<string, string> {
  const files = { ...app.files };

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

  if (!files["lib/supabase.ts"] && !files["lib/db.ts"]) {
    files["lib/supabase.ts"] = `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`;
  }

  if (app.schema && !files["supabase/schema.sql"]) {
    files["supabase/schema.sql"] = app.schema;
  }

  return files;
}
