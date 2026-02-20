/**
 * GET /api/seed
 * Seeds the evidence store with mock data for all stations.
 * Safe to call multiple times (clears then re-seeds each station).
 */

import { NextResponse } from "next/server";
import { join } from "node:path";
import { seedStore } from "@flood/evidence-store";

export async function GET(): Promise<NextResponse> {
  try {
    const dataDir = join(process.cwd(), "..", "evidence-store", "data");
    await seedStore(dataDir);
    return NextResponse.json({ ok: true, message: "Evidence store seeded successfully." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    console.error("[/api/seed]", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
