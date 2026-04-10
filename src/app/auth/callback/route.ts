import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else {
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL ?? origin}${next}`);
      }
    }
    console.error("Auth callback error:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
