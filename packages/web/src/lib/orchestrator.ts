/**
 * Orchestrator — wires all packages together for a single assessment request.
 *
 * Called by the /api/assess route.  All dependencies are instantiated here;
 * this is the composition root for the server-side pipeline.
 *
 * Pipeline:
 *   fetch gauge readings (MockGaugeAdapter)
 *     → fetch forecast (MockWeatherAdapter)
 *     → store evidence (JsonEvidenceStore)
 *     → compute risk (RiskScorer)
 *     → store assessment as evidence
 *     → retrieve evidence bundle (EvidenceRetrieval)
 *     → generate explanation (FloodExplanationAgent)
 *     → return FloodExplanation
 */

import { join } from "node:path";
import { STATIONS } from "@flood/core";
import type { FloodExplanation } from "@flood/core";
import { MockGaugeAdapter, MockWeatherAdapter } from "@flood/ingestion";
import { computeRiskAssessment } from "@flood/risk-engine";
import { JsonEvidenceStore, EvidenceRetrieval } from "@flood/evidence-store";
import { FloodExplanationAgent, StubLLMProvider } from "@flood/llm-agent";

// TODO: wire AnthropicProvider when ANTHROPIC_API_KEY is set.
// const llm = process.env.ANTHROPIC_API_KEY
//   ? new AnthropicProvider()
//   : new StubLLMProvider();

// Singleton store — persists across hot-reloads in dev via module cache.
// In production, use a proper singleton pattern or DB connection pool.
const DATA_DIR = join(process.cwd(), "..", "evidence-store", "data");
const store = new JsonEvidenceStore(DATA_DIR);
const retrieval = new EvidenceRetrieval(store);
const llm = new StubLLMProvider();

export async function runAssessment(stationId: string): Promise<FloodExplanation> {
  const station = STATIONS[stationId];
  if (!station) {
    throw new Error(
      `Unknown station "${stationId}". Valid stations: ${Object.keys(STATIONS).join(", ")}`
    );
  }

  // --- Ingestion ---
  const gaugeAdapter = new MockGaugeAdapter();
  const weatherAdapter = new MockWeatherAdapter();

  const [readings, forecast] = await Promise.all([
    gaugeAdapter.fetchLatest(stationId, 24),
    weatherAdapter.fetchForecast(stationId, 72),
  ]);

  // --- Store ingested evidence ---
  for (const reading of readings) {
    store.appendGauge(reading);
  }
  store.appendForecast(forecast);

  // --- Risk scoring ---
  const assessment = computeRiskAssessment({ readings, forecast, station });

  // --- Store assessment as evidence ---
  store.appendAssessment(assessment);

  // --- LLM explanation ---
  const agent = new FloodExplanationAgent({
    retrieveEvidence: (sid) => retrieval.retrieve(sid, 8),
    llm,
  });

  return agent.explain(assessment);
}
