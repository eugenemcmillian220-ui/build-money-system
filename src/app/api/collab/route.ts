export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * GET /api/collab
 * Get collaboration rooms status
 */
export async function GET(): Promise<Response> {
  try {
    // Return list of active collaboration rooms
    return NextResponse.json({
      rooms: [],
      message: "Collaboration rooms are managed client-side via Supabase Realtime"
    });
  } catch (error) {
    console.error("Failed to get collaboration rooms:", error);
    return NextResponse.json(
      { error: "Failed to get collaboration rooms" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/collab
 * Create or join a collaboration room
 */
export async function POST(request: NextRequest): Promise<Response> {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const { action, projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    if (action === "create" || action === "join") {
      return NextResponse.json({
        success: true,
        room: {
          projectId,
          channelName: `project:${projectId}`,
          message: `Room ${action === "create" ? "created" : "joined"} successfully`
        }
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'create' or 'join'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Failed to handle collaboration:", error);
    return NextResponse.json(
      { error: "Collaboration failed" },
      { status: 500 }
    );
  }
}
