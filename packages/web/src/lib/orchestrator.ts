/**
 * Orchestrator — wires all packages together for a single assessment request.
 *
 * Called by the /api/assess route.  All dependencies are instantiated here;
 * this is the composition root for the server-side pipeline.
 *
 * Pipeline:
 *   fetch gauge readings (PegelOnlineAdapter — live WSV data)
 *     → fetch forecast (OpenMeteoAdapter — live Open-Meteo data)
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
import { PegelOnlineAdapter, OpenMeteoAdapter } from "@flood/ingestion";
import { computeRiskAssessment } from "@flood/risk-engine";
import { JsonEvidenceStore, EvidenceRetrieval } from "@flood/evidence-store";
import { FloodExplanationAgent, StubLLMProvider, AnthropicProvider } from "@flood/llm-agent";

// EVIDENCE_DATA_DIR lets operators control where NDJSON files are written.
// On Vercel, set it to /tmp/evidence-data (only writable path in serverless).
// Defaults to the local evidence-store/data directory for dev.
const DATA_DIR =
  process.env.EVIDENCE_DATA_DIR ?? join(process.cwd(), "..", "evidence-store", "data");
const store = new JsonEvidenceStore(DATA_DIR);
const retrieval = new EvidenceRetrieval(store);
const llm = process.env.ANTHROPIC_API_KEY ? new AnthropicProvider() : new StubLLMProvider();

export async function runAssessment(stationId: string): Promise<FloodExplanation> {
  const station = STATIONS[stationId];
  if (!station) {
    throw new Error(
      `Unknown station "${stationId}". Valid stations: ${Object.keys(STATIONS).join(", ")}`
    );
  }

  // --- Ingestion ---
  const gaugeAdapter = new PegelOnlineAdapter();
  const weatherAdapter = new OpenMeteoAdapter();

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
