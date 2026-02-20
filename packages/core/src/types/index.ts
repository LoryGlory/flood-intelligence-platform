// ============================================================
// @flood/core — Domain types and interfaces
// All packages depend on these; keep this layer dependency-free.
// ============================================================

// ------------------------------------------------------------------
// Station / location
// ------------------------------------------------------------------

export interface StationConfig {
  id: string;
  name: string;
  riverName: string;
  locationName: string;
  lat: number;
  lon: number;
  /** Water level (m) at which official warnings are issued */
  warningLevelM: number;
  /** Water level (m) at which danger / emergency level is reached */
  dangerLevelM: number;
  /** Typical low-flow baseline level (m) */
  baselineM: number;
}

// ------------------------------------------------------------------
// Ingestion
// ------------------------------------------------------------------

export interface GaugeReading {
  stationId: string;
  /** ISO-8601 UTC */
  timestamp: string;
  /** Water level in metres above the station datum */
  waterLevelM: number;
  /** Cubic metres per second (optional – not always reported) */
  flowRateM3s?: number;
  /** Human-readable source label for citation */
  source: string;
}

export interface WeatherForecast {
  stationId: string;
  /** When this forecast was issued */
  forecastedAt: string;
  /** Start of the forecast window */
  validFrom: string;
  /** End of the forecast window */
  validTo: string;
  /** Total expected rainfall in mm over the window */
  rainfallMm: number;
  /** Peak hourly intensity in mm/h */
  peakIntensityMmH: number;
  /** Confidence 0–1 (model-reported, may be absent) */
  confidence?: number;
  source: string;
}

// ------------------------------------------------------------------
// Risk engine
// ------------------------------------------------------------------

export type SignalSeverity = "info" | "warning" | "critical";

export interface RiskSignal {
  /** Machine-readable code, e.g. "GAUGE_ABOVE_WARNING" */
  code: string;
  /** Short human label */
  label: string;
  /** One-sentence explanation */
  description: string;
  severity: SignalSeverity;
  /** The numeric value that triggered this signal (for evidence linking) */
  value?: number | string;
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface RiskAssessment {
  stationId: string;
  /** ISO-8601 UTC */
  assessedAt: string;
  /** 0–100 composite score */
  riskScore: number;
  riskLevel: RiskLevel;
  signals: RiskSignal[];
  /** The gauge reading used as primary input */
  gaugeReading: GaugeReading;
  /** The weather forecast used (null if unavailable) */
  weatherForecast: WeatherForecast | null;
}

// ------------------------------------------------------------------
// Evidence store
// ------------------------------------------------------------------

export type EvidenceType = "gauge" | "forecast" | "historical" | "assessment";

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  /** Human-readable citation string shown in the UI */
  citation: string;
  /** ISO-8601 UTC */
  timestamp: string;
  /** The source system label */
  source: string;
  /** Raw payload – typed downstream, treated as opaque here */
  payload: Record<string, unknown>;
}

// ------------------------------------------------------------------
// LLM agent output
// ------------------------------------------------------------------

export interface FloodExplanation {
  stationId: string;
  /** ISO-8601 UTC */
  generatedAt: string;
  riskScore: number;
  riskLevel: RiskLevel;
  /**
   * 2–4 sentence narrative summary.
   * MUST be based only on evidence items; must not fabricate numbers.
   */
  summary: string;
  /** Ordered most-to-least influential */
  keySignals: RiskSignal[];
  /** Citations shown alongside the summary */
  evidence: EvidenceItem[];
  /**
   * Honest statement of what is uncertain (model limitations, data age, etc.)
   */
  uncertainty: string;
  /**
   * Fixed safety notice reminding users this is decision-support only.
   * The agent MUST always include this verbatim – checked by guardrails.
   */
  safetyNotice: string;
}

// ------------------------------------------------------------------
// API contract (used by web → API route)
// ------------------------------------------------------------------

export interface AssessRequest {
  stationId: string;
  /** Optional ISO-8601 – defaults to "now" */
  asOf?: string;
}

export interface AssessResponse {
  ok: true;
  explanation: FloodExplanation;
}

export interface AssessError {
  ok: false;
  error: string;
}
