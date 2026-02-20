/**
 * RiskScorer
 * ----------
 * Rule-based composite risk scoring (0–100) from gauge + forecast inputs.
 *
 * Scoring model (three components, weighted):
 *
 *  1. GAUGE_LEVEL (45%)
 *     Linear interpolation from baseline → warning → danger → above danger.
 *     Below baseline = 0, above danger = 100 on this component.
 *
 *  2. GAUGE_TREND (25%)
 *     Derived from the rise/fall rate between the last two readings.
 *     Rapid rise → 100, stable → 0, falling → -20 (clamped to 0 in total).
 *
 *  3. FORECAST_RAIN (30%)
 *     Bands based on RAINFALL_THRESHOLDS.
 *     > CRITICAL mm → 100, > HIGH → 75, > MODERATE → 50, > LOW → 25, else 0.
 *
 * Final score = sum(component × weight), clamped to [0, 100], rounded to int.
 *
 * Design note: the formula is intentionally simple and auditable.
 * A more sophisticated model (ML, ensemble) would replace computeScore()
 * while keeping the same input/output contract.
 */

import type {
  GaugeReading,
  WeatherForecast,
  RiskAssessment,
  RiskLevel,
  RiskSignal,
  StationConfig,
} from "@flood/core";

import { SCORE_WEIGHTS, RAINFALL_THRESHOLDS, TREND_THRESHOLDS } from "@flood/core";

import {
  signalAboveDanger,
  signalAboveWarning,
  signalElevatedLevel,
  signalRapidRise,
  signalNotableRise,
  signalStable,
  signalFalling,
  signalHeavyRainForecast,
  signalModerateRainForecast,
  signalLowRainForecast,
  signalNoForecastAvailable,
} from "./signals.js";

// ------------------------------------------------------------------
// Exported types
// ------------------------------------------------------------------

export interface ScorerInput {
  /** Most-recent reading first */
  readings: GaugeReading[];
  forecast: WeatherForecast | null;
  station: StationConfig;
}

// ------------------------------------------------------------------
// Internal component scorers (pure functions — easy to unit test)
// ------------------------------------------------------------------

/**
 * Returns a 0–100 score and associated signals based on current gauge level.
 */
export function scoreGaugeLevel(
  levelM: number,
  station: StationConfig
): { score: number; signals: RiskSignal[] } {
  const { baselineM, warningLevelM, dangerLevelM } = station;
  const signals: RiskSignal[] = [];
  let score: number;

  if (levelM >= dangerLevelM) {
    score = 100;
    signals.push(signalAboveDanger(levelM, dangerLevelM));
  } else if (levelM >= warningLevelM) {
    // 75–99 range between warning and danger
    const fraction = (levelM - warningLevelM) / (dangerLevelM - warningLevelM);
    score = 75 + fraction * 24;
    signals.push(signalAboveWarning(levelM, warningLevelM));
  } else if (levelM >= baselineM + (warningLevelM - baselineM) * 0.5) {
    // Notably elevated — more than halfway from baseline to warning
    score = 35 + ((levelM - baselineM) / (warningLevelM - baselineM)) * 40;
    signals.push(signalElevatedLevel(levelM, baselineM));
  } else if (levelM > baselineM) {
    // Between baseline and midpoint — low concern
    score = ((levelM - baselineM) / (warningLevelM - baselineM)) * 35;
    signals.push(signalElevatedLevel(levelM, baselineM));
  } else {
    score = 0;
  }

  return { score: clamp(score, 0, 100), signals };
}

/**
 * Returns a 0–100 score and trend signal based on recent readings.
 * Uses the delta between the two most-recent readings (1-hour diff).
 */
export function scoreGaugeTrend(readings: GaugeReading[]): {
  score: number;
  signals: RiskSignal[];
  rateM: number;
} {
  if (readings.length < 2) {
    return { score: 0, signals: [signalStable()], rateM: 0 };
  }

  // readings[0] = newest, readings[1] = 1 h earlier
  const latest = readings[0];
  const previous = readings[1];

  if (!latest || !previous) {
    return { score: 0, signals: [signalStable()], rateM: 0 };
  }

  const dtHours =
    (new Date(latest.timestamp).getTime() - new Date(previous.timestamp).getTime()) /
    (1000 * 60 * 60);

  if (dtHours <= 0) {
    return { score: 0, signals: [signalStable()], rateM: 0 };
  }

  const rateM = (latest.waterLevelM - previous.waterLevelM) / dtHours; // m/h

  let score: number;
  const signals: RiskSignal[] = [];

  if (rateM >= TREND_THRESHOLDS.RAPID_RISE_MH) {
    score = 100;
    signals.push(signalRapidRise(rateM));
  } else if (rateM >= TREND_THRESHOLDS.NOTABLE_RISE_MH) {
    score =
      50 +
      ((rateM - TREND_THRESHOLDS.NOTABLE_RISE_MH) /
        (TREND_THRESHOLDS.RAPID_RISE_MH - TREND_THRESHOLDS.NOTABLE_RISE_MH)) *
        50;
    signals.push(signalNotableRise(rateM));
  } else if (rateM >= -TREND_THRESHOLDS.NOTABLE_RISE_MH) {
    score = 0;
    signals.push(signalStable());
  } else {
    // Falling — slightly reduces overall score
    score = -20;
    signals.push(signalFalling(rateM));
  }

  return { score: clamp(score, -20, 100), signals, rateM };
}

/**
 * Returns a 0–100 score and signal based on rainfall forecast.
 */
export function scoreForecast(forecast: WeatherForecast | null): {
  score: number;
  signals: RiskSignal[];
} {
  if (!forecast) {
    return { score: 50, signals: [signalNoForecastAvailable()] };
  }

  const mm = forecast.rainfallMm;
  let score: number;
  const signals: RiskSignal[] = [];

  if (mm >= RAINFALL_THRESHOLDS.CRITICAL) {
    score = 100;
    signals.push(signalHeavyRainForecast(mm));
  } else if (mm >= RAINFALL_THRESHOLDS.HIGH) {
    score =
      75 +
      ((mm - RAINFALL_THRESHOLDS.HIGH) /
        (RAINFALL_THRESHOLDS.CRITICAL - RAINFALL_THRESHOLDS.HIGH)) *
        25;
    signals.push(signalHeavyRainForecast(mm));
  } else if (mm >= RAINFALL_THRESHOLDS.MODERATE) {
    score =
      50 +
      ((mm - RAINFALL_THRESHOLDS.MODERATE) /
        (RAINFALL_THRESHOLDS.HIGH - RAINFALL_THRESHOLDS.MODERATE)) *
        25;
    signals.push(signalModerateRainForecast(mm));
  } else if (mm >= RAINFALL_THRESHOLDS.LOW) {
    score =
      25 +
      ((mm - RAINFALL_THRESHOLDS.LOW) / (RAINFALL_THRESHOLDS.MODERATE - RAINFALL_THRESHOLDS.LOW)) *
        25;
    signals.push(signalLowRainForecast(mm));
  } else {
    score = (mm / RAINFALL_THRESHOLDS.LOW) * 25;
    signals.push(signalLowRainForecast(mm));
  }

  return { score: clamp(score, 0, 100), signals };
}

// ------------------------------------------------------------------
// Composite scorer
// ------------------------------------------------------------------

export function computeRiskAssessment(input: ScorerInput): RiskAssessment {
  const { readings, forecast, station } = input;

  if (readings.length === 0) {
    throw new Error(`RiskScorer: no gauge readings provided for station ${station.id}`);
  }

  const latestReading = readings[0];
  if (!latestReading) {
    throw new Error(`RiskScorer: readings array is unexpectedly empty`);
  }

  const gaugeComponent = scoreGaugeLevel(latestReading.waterLevelM, station);
  const trendComponent = scoreGaugeTrend(readings);
  const forecastComponent = scoreForecast(forecast);

  const rawScore =
    gaugeComponent.score * SCORE_WEIGHTS.GAUGE_LEVEL +
    trendComponent.score * SCORE_WEIGHTS.GAUGE_TREND +
    forecastComponent.score * SCORE_WEIGHTS.FORECAST_RAIN;

  const riskScore = Math.round(clamp(rawScore, 0, 100));

  // Deduplicate signals, ordering by severity (critical first)
  const allSignals: RiskSignal[] = [
    ...gaugeComponent.signals,
    ...trendComponent.signals,
    ...forecastComponent.signals,
  ];
  const signals = deduplicateSignals(allSignals);

  return {
    stationId: station.id,
    assessedAt: new Date().toISOString(),
    riskScore,
    riskLevel: scoreToLevel(riskScore),
    signals,
    gaugeReading: latestReading,
    weatherForecast: forecast,
  };
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function scoreToLevel(score: number): RiskLevel {
  if (score >= 75) return "critical";
  if (score >= 50) return "high";
  if (score >= 25) return "moderate";
  return "low";
}

function deduplicateSignals(signals: RiskSignal[]): RiskSignal[] {
  const seen = new Set<string>();
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return signals
    .filter((s) => {
      if (seen.has(s.code)) return false;
      seen.add(s.code);
      return true;
    })
    .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
}
