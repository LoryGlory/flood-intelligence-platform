/**
 * POST /api/assess
 * Body: { stationId: string, asOf?: string }
 * Returns: AssessResponse | AssessError
 */

import { NextResponse } from "next/server";
import type { AssessRequest, AssessResponse, AssessError } from "@flood/core";
import { runAssessment } from "@/lib/orchestrator";

export async function POST(req: Request): Promise<NextResponse> {
  let body: AssessRequest;
  try {
    body = (await req.json()) as AssessRequest;
  } catch {
    return NextResponse.json<AssessError>(
      { ok: false, error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { stationId } = body;
  if (!stationId || typeof stationId !== "string") {
    return NextResponse.json<AssessError>(
      { ok: false, error: "Missing required field: stationId" },
      { status: 400 }
    );
  }

  try {
    const explanation = await runAssessment(stationId);
    return NextResponse.json<AssessResponse>({ ok: true, explanation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[/api/assess]", err);
    return NextResponse.json<AssessError>({ ok: false, error: message }, { status: 500 });
  }
}
