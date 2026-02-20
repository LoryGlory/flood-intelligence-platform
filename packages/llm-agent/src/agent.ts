/**
 * FloodExplanationAgent
 * ---------------------
 * Orchestrates the full explain() pipeline:
 *
 *   1. Retrieve evidence from the store (RAG)
 *   2. Build a structured prompt from assessment + evidence
 *   3. Call the LLM provider
 *   4. Validate output through guardrails
 *   5. Assemble and return a FloodExplanation
 *
 * The agent is stateless and side-effect free — all dependencies are
 * injected via the constructor.  This makes it straightforward to test
 * with a StubLLMProvider and an in-memory evidence store.
 */

import type { RiskAssessment, FloodExplanation, EvidenceItem } from "@flood/core";
import type { EvidenceBundle } from "@flood/evidence-store";
import type { LLMProvider } from "./providers/interface.js";
import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt.js";
import { validateLLMOutput, buildFallbackOutput, GuardrailError } from "./guardrails.js";

export interface AgentDependencies {
  /** Retrieves evidence bundles from the store */
  retrieveEvidence(stationId: string): EvidenceBundle;
  /** The LLM provider to use */
  llm: LLMProvider;
}

export class FloodExplanationAgent {
  constructor(private readonly deps: AgentDependencies) {}

  /**
   * Generate a FloodExplanation for the given risk assessment.
   *
   * @param assessment  The computed risk assessment for a station
   */
  async explain(assessment: RiskAssessment): Promise<FloodExplanation> {
    const { stationId, assessedAt } = assessment;

    // --- Step 1: Retrieve evidence ---
    const bundle = this.deps.retrieveEvidence(stationId);
    const evidence = this.selectEvidence(bundle);

    // --- Step 2: Build prompt ---
    const userPrompt = buildUserPrompt({ assessment, evidence });

    // --- Step 3: Call LLM ---
    let rawOutput: string;
    try {
      rawOutput = await this.deps.llm.complete([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ]);
    } catch (err) {
      console.error(`[agent] LLM call failed for ${stationId}:`, err);
      // Use fallback explanation — never propagate LLM errors to the UI
      return this.assembleFallback(assessment, evidence, assessedAt);
    }

    // --- Step 4: Validate through guardrails ---
    let validated: ReturnType<typeof validateLLMOutput>;
    try {
      validated = validateLLMOutput(rawOutput, evidence);
    } catch (err) {
      if (err instanceof GuardrailError) {
        const fallbackFields = buildFallbackOutput(err);
        return this.assembleExplanation(assessment, evidence, assessedAt, fallbackFields);
      }
      throw err;
    }

    // --- Step 5: Assemble final explanation ---
    return this.assembleExplanation(assessment, evidence, assessedAt, validated);
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  /**
   * Select which evidence items to include in the prompt / citation list.
   * Strategy: take the latest gauge, latest forecast, latest assessment,
   * then fill remaining slots with other recent items.
   */
  private selectEvidence(bundle: EvidenceBundle): EvidenceItem[] {
    const pinned: EvidenceItem[] = [];
    if (bundle.latestGauge) pinned.push(bundle.latestGauge);
    if (bundle.latestForecast) pinned.push(bundle.latestForecast);
    if (bundle.latestAssessment) pinned.push(bundle.latestAssessment);

    const pinnedIds = new Set(pinned.map((e) => e.id));
    const rest = bundle.items.filter((e) => !pinnedIds.has(e.id)).slice(0, 5); // cap at 5 additional items

    return [...pinned, ...rest].slice(0, 8); // max 8 evidence items in prompt
  }

  private assembleExplanation(
    assessment: RiskAssessment,
    evidence: EvidenceItem[],
    generatedAt: string,
    fields: { summary: string; uncertainty: string; safetyNotice: string }
  ): FloodExplanation {
    return {
      stationId: assessment.stationId,
      generatedAt,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      summary: fields.summary,
      keySignals: assessment.signals,
      evidence,
      uncertainty: fields.uncertainty,
      safetyNotice: fields.safetyNotice,
    };
  }

  private assembleFallback(
    assessment: RiskAssessment,
    evidence: EvidenceItem[],
    generatedAt: string
  ): FloodExplanation {
    const fallbackFields = buildFallbackOutput(new GuardrailError("LLM unavailable", ""));
    return this.assembleExplanation(assessment, evidence, generatedAt, fallbackFields);
  }
}
