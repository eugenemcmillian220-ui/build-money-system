import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs, exportAuditCSV } from "@/lib/flowforge/audit";
import type { AuditAction } from "@/lib/flowforge/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId") || "default-org";
    const action = searchParams.get("action") as AuditAction | null;
    const userId = searchParams.get("userId");
    const format = searchParams.get("format");
    const limit = Number(searchParams.get("limit")) || 100;

    if (format === "csv") {
      const csv = exportAuditCSV(orgId);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=flowforge-audit.csv",
        },
      });
    }

    const logs = getAuditLogs(orgId, {
      action: action || undefined,
      userId: userId || undefined,
      limit,
    });

    return NextResponse.json({
      logs,
      total: logs.length,
      orgId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Audit query failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
