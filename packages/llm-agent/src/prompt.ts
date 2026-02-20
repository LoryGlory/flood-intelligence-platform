/**
 * Prompt builder for the flood explanation agent.
 *
 * Design principles:
 *  1. System prompt establishes role, constraints, and output format — once.
 *  2. User prompt injects all evidence; no values are hard-coded in the system prompt.
 *  3. The model is told to cite only provided evidence items (no fabrication).
 *  4. The safety notice is required in the output schema.
 *
 * Both prompts are exported as pure functions so they can be unit-tested
 * independently of the LLM.
 */

import type { RiskAssessment, EvidenceItem } from "@flood/core";
import { SAFETY_NOTICE } from "@flood/core";

export const SYSTEM_PROMPT = `You are a flood-risk explanation assistant for a decision-support system covering the Mosel River, Germany.

Your task is to produce a clear, structured JSON explanation of the current flood risk for a given monitoring station.

STRICT RULES:
1. Base your explanation ONLY on the evidence items provided in the user message. Do not invent sensor readings, rainfall amounts, or historical context.
2. Every factual claim in your summary must be traceable to at least one provided evidence item.
3. Express uncertainty honestly — if data is limited, say so.
4. Your output MUST be valid JSON matching the schema below. No markdown, no prose outside the JSON.
5. The safetyNotice field must always contain the text provided — do not modify it.

OUTPUT SCHEMA (JSON):
{
  "summary": "2–4 sentence narrative based strictly on evidence",
  "uncertainty": "1–2 sentences about data limitations, model assumptions, or forecast confidence",
  "safetyNotice": "<required safety text — include verbatim as given>"
}

The keySignals and evidence arrays will be populated by the application, not by you. Focus only on the three fields above.`;

export interface PromptContext {
  assessment: RiskAssessment;
  evidence: EvidenceItem[];
}

export function buildUserPrompt(ctx: PromptContext): string {
  const { assessment, evidence } = ctx;
  const station = assessment.stationId;

  const signalSummary = assessment.signals
    .map((s) => `  • [${s.severity.toUpperCase()}] ${s.label}: ${s.description}`)
    .join("\n");

  const evidenceBlock = evidence.map((e, i) => `  [${i + 1}] (${e.type}) ${e.citation}`).join("\n");

  return `Station: ${station}
Risk score: ${assessment.riskScore}/100
Risk level: ${assessment.riskLevel}
Assessed at: ${assessment.assessedAt}

Key signals:
${signalSummary}

Evidence items (cite by [number]):
${evidenceBlock}

Required safety notice to include verbatim in safetyNotice field:
"${SAFETY_NOTICE}"

Respond with only the JSON object. Do not include markdown fences.`;
}
