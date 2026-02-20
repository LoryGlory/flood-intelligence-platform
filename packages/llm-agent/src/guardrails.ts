/**
 * Output guardrails — validate and sanitise the LLM's JSON response.
 *
 * Guardrails sit between the raw LLM string and the structured
 * FloodExplanation that reaches the UI.  They enforce:
 *   1. Valid JSON (parse error → throw)
 *   2. Required fields present and non-empty
 *   3. Safety notice is present and contains the required text
 *   4. No obviously fabricated numbers in the summary
 *      (heuristic: if a number appears in the summary but NOT in any
 *       evidence citation, flag it as a possible hallucination)
 *
 * If validation fails the agent falls back to a templated explanation
 * rather than surfacing a malformed or unsafe response to the user.
 */

import { SAFETY_NOTICE } from "@flood/core";
import type { EvidenceItem } from "@flood/core";

export interface RawLLMOutput {
  summary?: unknown;
  uncertainty?: unknown;
  safetyNotice?: unknown;
}

export interface ValidatedOutput {
  summary: string;
  uncertainty: string;
  safetyNotice: string;
}

export class GuardrailError extends Error {
  constructor(
    message: string,
    public readonly rawOutput: string
  ) {
    super(message);
    this.name = "GuardrailError";
  }
}

/**
 * Parse the LLM response string and validate it against the output schema.
 * Returns a ValidatedOutput or throws GuardrailError.
 */
export function validateLLMOutput(rawText: string, evidence: EvidenceItem[]): ValidatedOutput {
  // --- 1. JSON parse ---
  let parsed: RawLLMOutput;
  try {
    parsed = JSON.parse(rawText) as RawLLMOutput;
  } catch {
    throw new GuardrailError("LLM output is not valid JSON", rawText);
  }

  // --- 2. Required fields ---
  const summary = coerceString(parsed.summary);
  const uncertainty = coerceString(parsed.uncertainty);
  const safetyNotice = coerceString(parsed.safetyNotice);

  if (!summary) throw new GuardrailError("Missing or empty 'summary' field", rawText);
  if (!uncertainty) throw new GuardrailError("Missing or empty 'uncertainty' field", rawText);
  if (!safetyNotice) throw new GuardrailError("Missing or empty 'safetyNotice' field", rawText);

  // --- 3. Safety notice check ---
  // Must contain a significant substring of the canonical notice
  const requiredFragment = SAFETY_NOTICE.slice(0, 60);
  if (!safetyNotice.includes(requiredFragment)) {
    throw new GuardrailError(
      "safetyNotice field does not contain the required safety text",
      rawText
    );
  }

  // --- 4. Hallucination heuristic ---
  const evidenceText = evidence.map((e) => e.citation).join(" ");
  const numbersInSummary = extractNumbers(summary);
  const fabricated = numbersInSummary.filter(
    (n) => !evidenceText.includes(n) && !String(n).endsWith(".00")
  );

  // Log warning — don't block; false positive rate would be too high
  if (fabricated.length > 0) {
    console.warn(
      `[guardrails] Possible hallucination: numbers in summary not found in evidence: ${fabricated.join(", ")}`
    );
  }

  return { summary, uncertainty, safetyNotice };
}

/**
 * Fallback explanation used when guardrails reject the LLM output.
 * Always safe to render — no LLM-generated text.
 */
export function buildFallbackOutput(error: GuardrailError): ValidatedOutput {
  console.error(`[guardrails] Using fallback due to: ${error.message}`);
  return {
    summary:
      "An explanation could not be generated due to an internal error. " +
      "Please refer to the risk signals and evidence items listed below for raw data.",
    uncertainty:
      "The explanation generation failed. Data quality and model availability are uncertain.",
    safetyNotice: SAFETY_NOTICE,
  };
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function coerceString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function extractNumbers(text: string): string[] {
  return Array.from(text.matchAll(/\b\d+(?:\.\d+)?\b/g), (m) => m[0] ?? "").filter(Boolean);
}
