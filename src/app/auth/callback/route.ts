// DA-042 FIX: Redirect logic consolidated with DA-011 safeRedirectUrl
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


// DA-011 FIX: Validate redirect URL to prevent open redirect
function safeRedirectUrl(next: string | null, origin: string): string {
  const fallback = `${origin}/dashboard`;
  if (!next) return fallback;
  // Must start with / and not contain protocol or double slashes
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
    return fallback;
  }
  // Block encoded variants — guard decode against malformed percent-sequences
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  if (decoded.startsWith('//') || decoded.includes('://')) {
    return fallback;
  }
  return `${origin}${next}`;
}


export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";
  const safeNext = safeRedirectUrl(next, origin);

  const supabase = await createClient();

  // PKCE flow (signInWithPassword + email-confirmations, OAuth, etc.)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(safeNext);
    }
    console.error("Auth callback exchangeCode error:", error.message);
  }

  // Magic-link / email-OTP click-through flow (?token_hash=...&type=magiclink|email|signup|recovery)
  if (tokenHash) {
    type EmailOtpType = "magiclink" | "signup" | "invite" | "recovery" | "email" | "email_change";
    const allowed: EmailOtpType[] = ["magiclink", "signup", "invite", "recovery", "email", "email_change"];
    const type = (allowed as string[]).includes(rawType ?? "") ? (rawType as EmailOtpType) : "email";
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(safeNext);
    }
    console.error("Auth callback verifyOtp error:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
