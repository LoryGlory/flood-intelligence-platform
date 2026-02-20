/**
 * EvidenceRetrieval
 * -----------------
 * Higher-level query helpers used by the LLM agent to assemble the evidence
 * bundle for a given station + time window.
 *
 * This is the RAG retrieval layer.  In an expanded system you would:
 *  - embed evidence items and do semantic/vector search, OR
 *  - use structured keyword + metadata filters on a proper DB.
 *
 * For the MVP we do simple recency + type-filtered retrieval from the
 * JsonEvidenceStore.  The interface (EvidenceBundle) stays constant across
 * retrieval strategies.
 *
 * TODO (production): wire embeddings (e.g. via Anthropic embeddings endpoint
 * or a local model) and replace readRecentEvidence with a vector search.
 */

import type { EvidenceItem } from "@flood/core";
import type { IEvidenceStore } from "./store.js";

export interface EvidenceBundle {
  stationId: string;
  /**
   * All evidence items ordered newest-first.
   * The LLM agent uses these as citations — do not fabricate items.
   */
  items: EvidenceItem[];
  /** When this bundle was assembled (ISO-8601) */
  retrievedAt: string;
  /**
   * The most recent gauge reading evidence item — convenience accessor
   * for the agent prompt builder.
   */
  latestGauge: EvidenceItem | null;
  /**
   * The most recent forecast evidence item.
   */
  latestForecast: EvidenceItem | null;
  /** The most recent assessment evidence item. */
  latestAssessment: EvidenceItem | null;
}

export class EvidenceRetrieval {
  constructor(private readonly store: IEvidenceStore) {}

  /**
   * Assemble an evidence bundle for the agent.
   *
   * @param stationId  Station to retrieve for
   * @param limit      Max total evidence items (default 10)
   */
  retrieve(stationId: string, limit = 10): EvidenceBundle {
    const items = this.store.query(stationId, ["gauge", "forecast", "assessment"], limit);

    return {
      stationId,
      items,
      retrievedAt: new Date().toISOString(),
      latestGauge: this.store.queryLatest(stationId, "gauge"),
      latestForecast: this.store.queryLatest(stationId, "forecast"),
      latestAssessment: this.store.queryLatest(stationId, "assessment"),
    };
  }
}
