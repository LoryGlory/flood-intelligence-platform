import { describe, it, expect, vi } from "vitest";
import { FloodExplanationAgent } from "../src/agent.js";
import { StubLLMProvider } from "../src/providers/stub.js";
import type { LLMProvider } from "../src/providers/interface.js";
import type { RiskAssessment, EvidenceItem } from "@flood/core";
import type { EvidenceBundle } from "@flood/evidence-store";

// ------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------

const NOW = new Date().toISOString();

const ASSESSMENT: RiskAssessment = {
  stationId: "trier",
  assessedAt: NOW,
  riskScore: 72,
  riskLevel: "high",
  signals: [
    {
      code: "GAUGE_ABOVE_WARNING",
      label: "Above warning level",
      description: "Water level 5.50 m exceeds warning threshold of 5.50 m.",
      severity: "warning",
      value: 5.5,
    },
    {
      code: "TREND_NOTABLE_RISE",
      label: "Notable rise",
      description: "Water level rising at 12 cm/hour.",
      severity: "warning",
      value: 0.12,
    },
    {
      code: "FORECAST_HEAVY_RAIN",
      label: "Heavy rainfall forecast",
      description: "78 mm of rain expected in the next 72 hours.",
      severity: "critical",
      value: 78,
    },
  ],
  gaugeReading: {
    stationId: "trier",
    timestamp: NOW,
    waterLevelM: 5.5,
    source: "mock",
  },
  weatherForecast: {
    stationId: "trier",
    forecastedAt: NOW,
    validFrom: NOW,
    validTo: NOW,
    rainfallMm: 78,
    peakIntensityMmH: 12.5,
    source: "mock",
  },
};

const EVIDENCE_ITEM: EvidenceItem = {
  id: "ev-1",
  type: "gauge",
  citation: "Gauge reading at trier: 5.50 m — " + NOW,
  timestamp: NOW,
  source: "mock",
  payload: {},
};

const BUNDLE: EvidenceBundle = {
  stationId: "trier",
  items: [EVIDENCE_ITEM],
  retrievedAt: NOW,
  latestGauge: EVIDENCE_ITEM,
  latestForecast: null,
  latestAssessment: null,
};

function makeAgent(llm: LLMProvider = new StubLLMProvider()) {
  return new FloodExplanationAgent({
    retrieveEvidence: () => BUNDLE,
    llm,
  });
}

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe("FloodExplanationAgent", () => {
  it("returns a FloodExplanation with all required fields", async () => {
    const agent = makeAgent();
    const result = await agent.explain(ASSESSMENT);

    expect(result.stationId).toBe("trier");
    expect(result.riskScore).toBe(72);
    expect(result.riskLevel).toBe("high");
    expect(result.summary).toBeTruthy();
    expect(result.uncertainty).toBeTruthy();
    expect(result.safetyNotice).toBeTruthy();
    expect(result.keySignals.length).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("always includes the safety notice in the output", async () => {
    const agent = makeAgent();
    const result = await agent.explain(ASSESSMENT);
    expect(result.safetyNotice).toContain("decision-support");
  });

  it("falls back gracefully when LLM throws", async () => {
    const failingLLM = {
      name: "failing-stub",
      complete: vi.fn().mockRejectedValue(new Error("LLM unavailable")),
    };
    const agent = makeAgent(failingLLM);
    const result = await agent.explain(ASSESSMENT);

    // Should still produce a valid FloodExplanation, not throw
    expect(result.stationId).toBe("trier");
    expect(result.safetyNotice).toContain("decision-support");
    expect(result.summary).toBeTruthy();
  });

  it("falls back gracefully when LLM returns invalid JSON", async () => {
    const badLLM = {
      name: "bad-stub",
      complete: vi.fn().mockResolvedValue("this is not json"),
    };
    const agent = makeAgent(badLLM);
    const result = await agent.explain(ASSESSMENT);

    expect(result.safetyNotice).toContain("decision-support");
    expect(result.summary).toBeTruthy();
  });

  it("falls back when safety notice is absent from LLM output", async () => {
    const noticelessLLM = {
      name: "noticeless-stub",
      complete: vi.fn().mockResolvedValue(
        JSON.stringify({
          summary: "A summary without safety notice.",
          uncertainty: "Some uncertainty.",
          safetyNotice: "Missing required text here.",
        })
      ),
    };
    const agent = makeAgent(noticelessLLM);
    const result = await agent.explain(ASSESSMENT);
    // The result safety notice should be the canonical one (fallback)
    expect(result.safetyNotice).toContain("decision-support");
  });

  it("uses evidence from the retrieval layer, not fabricated data", async () => {
    const agent = makeAgent();
    const result = await agent.explain(ASSESSMENT);
    // Evidence items should come from our bundle, not be empty
    expect(result.evidence.some((e) => e.id === "ev-1")).toBe(true);
  });

  it("keySignals match the input assessment signals", async () => {
    const agent = makeAgent();
    const result = await agent.explain(ASSESSMENT);
    const codes = result.keySignals.map((s) => s.code);
    expect(codes).toContain("GAUGE_ABOVE_WARNING");
    expect(codes).toContain("TREND_NOTABLE_RISE");
    expect(codes).toContain("FORECAST_HEAVY_RAIN");
  });
});
