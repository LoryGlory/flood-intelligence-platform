/**
 * Seed script — populates the evidence store with mock data for all stations.
 * Run via: node --loader ts-node/esm src/seed.ts
 * Or via the web API route on first run (see packages/web/src/app/api/seed/route.ts).
 *
 * Idempotent per station: clears existing data before re-seeding.
 */

import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MockGaugeAdapter } from "@flood/ingestion";
import { MockWeatherAdapter } from "@flood/ingestion";
import { STATIONS } from "@flood/core";
import { JsonEvidenceStore } from "./store.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seedStore(dataDir?: string): Promise<void> {
  const dir = dataDir ?? join(__dirname, "..", "data");
  const store = new JsonEvidenceStore(dir);

  const gaugeAdapter = new MockGaugeAdapter();
  const weatherAdapter = new MockWeatherAdapter();

  console.log(`[seed] Seeding evidence store at ${dir}`);

  for (const stationId of Object.keys(STATIONS)) {
    console.log(`[seed]  → Station: ${stationId}`);

    // Clear existing data so seed is idempotent
    store.clear(stationId);

    // Fetch and store 24 hours of gauge readings
    const readings = await gaugeAdapter.fetchLatest(stationId, 24);
    for (const reading of readings) {
      store.appendGauge(reading);
    }
    console.log(`[seed]     Gauge readings stored: ${readings.length}`);

    // Fetch and store current weather forecast
    const forecast = await weatherAdapter.fetchForecast(stationId, 72);
    store.appendForecast(forecast);
    console.log(`[seed]     Forecast stored: ${forecast.rainfallMm} mm expected`);
  }

  console.log("[seed] Done.");
}

// Run directly if called as a script
if (process.argv[1] && fileURLToPath(import.meta.url).endsWith(process.argv[1])) {
  seedStore().catch((err) => {
    console.error("[seed] Error:", err);
    process.exit(1);
  });
}
