import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export interface AuthResult {
  user: { id: string; email?: string };
}

/**
 * Verify the request is from an authenticated user.
 * Returns the user object or a 401 Response.
 */
export async function requireAuth(): Promise<AuthResult | NextResponse> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    return { user: { id: user.id, email: user.email ?? undefined } };
  } catch {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}

/**
 * Type guard to check if requireAuth returned an error response.
 */
export function isAuthError(result: AuthResult | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
