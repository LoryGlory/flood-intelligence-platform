/**
 * StubLLMProvider
 * ---------------
 * Deterministic stub that parses the agent's structured prompt and builds
 * a realistic-looking FloodExplanation without calling any external API.
 *
 * Used in:
 *  - Unit tests (fast, no network, no cost)
 *  - Local development when no API key is set
 *  - CI pipeline
 *
 * The stub reads key values (riskScore, stationId, signals) from the prompt
 * text so that its output is semantically consistent with the inputs — it
 * doesn't just return a hardcoded string.
 *
 * TODO: remove this provider from production configuration once a real
 * provider (AnthropicProvider or OpenAIProvider) is wired up.
 */

import { SAFETY_NOTICE } from "@flood/core";
import type { LLMMessage, LLMProvider } from "./interface.js";

export class StubLLMProvider implements LLMProvider {
  readonly name = "Stub (deterministic, no LLM call)";

  async complete(messages: LLMMessage[]): Promise<string> {
    // Parse key values from the user prompt so the stub is somewhat realistic
    const userMsg = messages.find((m) => m.role === "user")?.content ?? "";

    const scoreMatch = userMsg.match(/Risk score:\s*(\d+)/i);
    const stationMatch = userMsg.match(/Station:\s*([\w-]+)/i);
    const score = scoreMatch ? parseInt(scoreMatch[1] ?? "50") : 50;
    const station = stationMatch ? stationMatch[1] : "unknown";

    // Build a contextually appropriate summary
    const summary = buildSummary(score, station ?? "unknown");

    // Return the full FloodExplanation JSON the agent expects
    return JSON.stringify({
      summary,
      uncertainty:
        "This assessment is based on mock sensor data and a deterministic stub provider. " +
        "In production, real-time gauge readings (PegelOnline) and DWD forecasts would be used. " +
        "Forecast confidence may be limited beyond 48 hours. Catchment saturation is not modelled.",
      safetyNotice: SAFETY_NOTICE,
    });
  }
}

function buildSummary(score: number, station: string): string {
  const stationDisplay = station.charAt(0).toUpperCase() + station.slice(1);

  if (score >= 75) {
    return (
      `Critical flood risk conditions are indicated at ${stationDisplay}. ` +
      `The composite risk score of ${score}/100 reflects elevated water levels, ` +
      `a rapid rising trend, and significant rainfall forecast for the catchment. ` +
      `The combination of these factors suggests a high probability of flooding in the near term.`
    );
  } else if (score >= 50) {
    return (
      `High flood risk is indicated at ${stationDisplay} (score: ${score}/100). ` +
      `Water levels are elevated and the forecast includes notable rainfall. ` +
      `Conditions should be monitored closely as the situation may escalate.`
    );
  } else if (score >= 25) {
    return (
      `Moderate flood risk conditions are present at ${stationDisplay} (score: ${score}/100). ` +
      `Some indicator thresholds are elevated but the situation is not immediately critical. ` +
      `Continue to monitor water levels and incoming forecast updates.`
    );
  } else {
    return (
      `Low flood risk is indicated at ${stationDisplay} (score: ${score}/100). ` +
      `Water levels are near baseline and no significant rainfall is forecast. ` +
      `No immediate concern, but routine monitoring should continue.`
    );
  }
}
