/**
 * MockGaugeAdapter
 * ----------------
 * Returns deterministic synthetic gauge readings for the three Mosel stations.
 * Each call produces a consistent time-series anchored to `asOf` (default: now).
 *
 * Scenario profiles are keyed by stationId so different stations can be in
 * different states (Trier rising-fast, Cochem stable, Bernkastel moderate).
 *
 * TODO (real ingestion): replace this class with PegelOnlineAdapter, keeping
 * the same GaugeAdapter interface.  No other code needs to change.
 */

import type { GaugeReading } from "@flood/core";
import type { GaugeAdapter } from "./interface.js";

type ScenarioProfile = {
  /** Starting water level in metres */
  baseLevel: number;
  /** Level change per hour (positive = rising) */
  riseRateM: number;
  /** Optional small random noise amplitude (deterministic via index) */
  noiseAmp: number;
  flowRateBase: number;
};

const PROFILES: Record<string, ScenarioProfile> = {
  trier: {
    // Actively rising toward warning level — interesting scenario
    baseLevel: 5.1,
    riseRateM: 0.12,
    noiseAmp: 0.03,
    flowRateBase: 420,
  },
  cochem: {
    // Near baseline, stable
    baseLevel: 2.3,
    riseRateM: 0.01,
    noiseAmp: 0.02,
    flowRateBase: 180,
  },
  bernkastel: {
    // Moderate level, slight rise
    baseLevel: 3.8,
    riseRateM: 0.05,
    noiseAmp: 0.02,
    flowRateBase: 260,
  },
};

const SOURCE = "Mock Gauge Adapter v1 (synthetic — replace with PegelOnline)";

export class MockGaugeAdapter implements GaugeAdapter {
  private readonly asOf: Date;

  constructor(asOf?: Date) {
    this.asOf = asOf ?? new Date();
  }

  async fetchLatest(stationId: string, limit = 24): Promise<GaugeReading[]> {
    const profile = PROFILES[stationId];
    if (!profile) {
      throw new Error(
        `MockGaugeAdapter: unknown stationId "${stationId}". ` +
          `Known stations: ${Object.keys(PROFILES).join(", ")}`
      );
    }

    const readings: GaugeReading[] = [];
    for (let i = 0; i < limit; i++) {
      // i=0 is most-recent; i increases going backward in time
      const hoursAgo = i;
      const ts = new Date(this.asOf.getTime() - hoursAgo * 60 * 60 * 1000);

      // Deterministic "noise" using a sine wave so results are reproducible
      const noise = profile.noiseAmp * Math.sin(i * 0.7);
      const level = profile.baseLevel - profile.riseRateM * hoursAgo + noise;

      readings.push({
        stationId,
        timestamp: ts.toISOString(),
        waterLevelM: Math.max(0, parseFloat(level.toFixed(3))),
        flowRateM3s: parseFloat((profile.flowRateBase + level * 15 + noise * 10).toFixed(1)),
        source: SOURCE,
      });
    }

    return readings; // newest first
  }
}
