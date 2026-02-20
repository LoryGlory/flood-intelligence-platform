import type { StationConfig } from "../types/index.js";

// ------------------------------------------------------------------
// Risk scoring thresholds
// ------------------------------------------------------------------

/** Component weights must sum to 1.0 */
export const SCORE_WEIGHTS = {
  /** How close the current gauge is to danger level */
  GAUGE_LEVEL: 0.45,
  /** Rate of rise in the last available readings */
  GAUGE_TREND: 0.25,
  /** Rainfall forecast over next 72 h */
  FORECAST_RAIN: 0.3,
} as const;

export const RAINFALL_THRESHOLDS = {
  /** mm total – negligible impact */
  LOW: 10,
  /** mm total – moderate concern */
  MODERATE: 30,
  /** mm total – high concern */
  HIGH: 60,
  /** mm total – critical, saturated catchment expected */
  CRITICAL: 100,
} as const;

export const TREND_THRESHOLDS = {
  /** m/h rise that indicates rapid escalation */
  RAPID_RISE_MH: 0.15,
  /** m/h rise that indicates notable rise */
  NOTABLE_RISE_MH: 0.05,
} as const;

// ------------------------------------------------------------------
// Safety notice — MUST appear verbatim in every explanation
// ------------------------------------------------------------------
export const SAFETY_NOTICE =
  "IMPORTANT: This analysis is for decision-support purposes only. " +
  "It does not constitute an official flood warning or emergency directive. " +
  "Always follow guidance from your national or regional flood-warning authority " +
  "and emergency services. Do not rely solely on this tool for safety decisions.";

// ------------------------------------------------------------------
// Mosel gauge stations (mock configurations)
// Real values approximate — see PegelOnline / BfG for authoritative data.
// TODO: load from a config file / environment in production.
// ------------------------------------------------------------------
export const STATIONS: Record<string, StationConfig> = {
  trier: {
    id: "trier",
    name: "Trier Pegel",
    riverName: "Mosel",
    locationName: "Trier, Rhineland-Palatinate, Germany",
    lat: 49.7567,
    lon: 6.6414,
    warningLevelM: 5.5,
    dangerLevelM: 7.5,
    baselineM: 2.1,
  },
  cochem: {
    id: "cochem",
    name: "Cochem Pegel",
    riverName: "Mosel",
    locationName: "Cochem, Rhineland-Palatinate, Germany",
    lat: 50.1453,
    lon: 7.1669,
    warningLevelM: 6.0,
    dangerLevelM: 8.5,
    baselineM: 1.8,
  },
  bernkastel: {
    id: "bernkastel",
    name: "Bernkastel-Kues Pegel",
    riverName: "Mosel",
    locationName: "Bernkastel-Kues, Rhineland-Palatinate, Germany",
    lat: 49.9147,
    lon: 7.0726,
    warningLevelM: 5.0,
    dangerLevelM: 7.0,
    baselineM: 1.5,
  },
};
