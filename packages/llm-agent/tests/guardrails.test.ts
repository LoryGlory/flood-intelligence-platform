import { describe, it, expect } from "vitest";
import { validateLLMOutput, buildFallbackOutput, GuardrailError } from "../src/guardrails.js";
import { SAFETY_NOTICE } from "@flood/core";
import type { EvidenceItem } from "@flood/core";

const EVIDENCE: EvidenceItem[] = [
  {
    id: "ev-1",
    type: "gauge",
    citation: "Gauge reading at trier: 5.10 m (450.0 m³/s) — Thu, 20 Feb 2025 10:00:00 GMT.",
    timestamp: new Date().toISOString(),
    source: "mock",
    payload: {},
  },
  {
    id: "ev-2",
    type: "forecast",
    citation: "Weather forecast: 78 mm total rainfall, peak 12.5 mm/h.",
    timestamp: new Date().toISOString(),
    source: "mock",
    payload: {},
  },
];

const VALID_OUTPUT = JSON.stringify({
  summary: "Water levels at the station are elevated at 5.10 m and rising rapidly.",
  uncertainty: "Forecast confidence is 72%. Data is synthetic for MVP.",
  safetyNotice: SAFETY_NOTICE,
});

describe("validateLLMOutput", () => {
  it("accepts a valid JSON response", () => {
    const result = validateLLMOutput(VALID_OUTPUT, EVIDENCE);
    expect(result.summary).toBeTruthy();
    expect(result.uncertainty).toBeTruthy();
    expect(result.safetyNotice).toContain("decision-support");
  });

  it("throws GuardrailError for non-JSON input", () => {
    expect(() => validateLLMOutput("not json", EVIDENCE)).toThrow(GuardrailError);
  });

  it("throws GuardrailError when summary is missing", () => {
    const bad = JSON.stringify({
      uncertainty: "some text",
      safetyNotice: SAFETY_NOTICE,
    });
    expect(() => validateLLMOutput(bad, EVIDENCE)).toThrow(GuardrailError);
  });

  it("throws GuardrailError when safetyNotice is missing", () => {
    const bad = JSON.stringify({
      summary: "Some summary.",
      uncertainty: "Some uncertainty.",
    });
    expect(() => validateLLMOutput(bad, EVIDENCE)).toThrow(GuardrailError);
  });

  it("throws GuardrailError when safetyNotice does not contain required text", () => {
    const bad = JSON.stringify({
      summary: "Some summary.",
      uncertainty: "Some uncertainty.",
      safetyNotice: "No safety text here.",
    });
    expect(() => validateLLMOutput(bad, EVIDENCE)).toThrow(GuardrailError);
  });

  it("throws GuardrailError when uncertainty is empty", () => {
    const bad = JSON.stringify({
      summary: "Some summary.",
      uncertainty: "",
      safetyNotice: SAFETY_NOTICE,
    });
    expect(() => validateLLMOutput(bad, EVIDENCE)).toThrow(GuardrailError);
  });

  it("accepts safetyNotice that starts with the required prefix", () => {
    const notice = SAFETY_NOTICE + " Additional info.";
    const output = JSON.stringify({
      summary: "Normal summary.",
      uncertainty: "Normal uncertainty.",
      safetyNotice: notice,
    });
    expect(() => validateLLMOutput(output, EVIDENCE)).not.toThrow();
  });
});

describe("buildFallbackOutput", () => {
  it("always includes the safety notice", () => {
    const err = new GuardrailError("test error", "raw");
    const result = buildFallbackOutput(err);
    expect(result.safetyNotice).toContain("decision-support");
  });

  it("returns non-empty summary and uncertainty", () => {
    const err = new GuardrailError("test error", "raw");
    const result = buildFallbackOutput(err);
    expect(result.summary.length).toBeGreaterThan(10);
    expect(result.uncertainty.length).toBeGreaterThan(10);
  });
});
