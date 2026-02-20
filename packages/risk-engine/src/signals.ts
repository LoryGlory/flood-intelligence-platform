/**
 * Signal factory functions.
 *
 * Each function returns a RiskSignal describing one contributing factor.
 * Keeping signals separate from scoring logic makes each independently testable.
 */

import type { RiskSignal } from "@flood/core";

// ------------------------------------------------------------------
// Gauge-level signals
// ------------------------------------------------------------------

export function signalAboveDanger(levelM: number, dangerM: number): RiskSignal {
  return {
    code: "GAUGE_ABOVE_DANGER",
    label: "Above danger level",
    description: `Water level ${levelM.toFixed(2)} m exceeds the danger threshold of ${dangerM.toFixed(2)} m.`,
    severity: "critical",
    value: levelM,
  };
}

export function signalAboveWarning(levelM: number, warningM: number): RiskSignal {
  return {
    code: "GAUGE_ABOVE_WARNING",
    label: "Above warning level",
    description: `Water level ${levelM.toFixed(2)} m has reached or exceeded the warning threshold of ${warningM.toFixed(2)} m.`,
    severity: "warning",
    value: levelM,
  };
}

export function signalElevatedLevel(levelM: number, baselineM: number): RiskSignal {
  return {
    code: "GAUGE_ELEVATED",
    label: "Elevated above baseline",
    description: `Water level ${levelM.toFixed(2)} m is significantly above the ${baselineM.toFixed(2)} m baseline.`,
    severity: "info",
    value: levelM,
  };
}

// ------------------------------------------------------------------
// Trend signals (computed from a time-series of readings)
// ------------------------------------------------------------------

export function signalRapidRise(rateM: number): RiskSignal {
  return {
    code: "TREND_RAPID_RISE",
    label: "Rapid rise",
    description: `Water level rising at ${(rateM * 100).toFixed(0)} cm/hour — rapid escalation rate.`,
    severity: "critical",
    value: rateM,
  };
}

export function signalNotableRise(rateM: number): RiskSignal {
  return {
    code: "TREND_NOTABLE_RISE",
    label: "Notable rise",
    description: `Water level rising at ${(rateM * 100).toFixed(0)} cm/hour — upward trend observed.`,
    severity: "warning",
    value: rateM,
  };
}

export function signalStable(): RiskSignal {
  return {
    code: "TREND_STABLE",
    label: "Level stable",
    description: "Water level is not materially rising or falling.",
    severity: "info",
  };
}

export function signalFalling(rateM: number): RiskSignal {
  return {
    code: "TREND_FALLING",
    label: "Level falling",
    description: `Water level falling at ${Math.abs(rateM * 100).toFixed(0)} cm/hour — receding.`,
    severity: "info",
    value: rateM,
  };
}

// ------------------------------------------------------------------
// Forecast signals
// ------------------------------------------------------------------

export function signalHeavyRainForecast(rainfallMm: number): RiskSignal {
  return {
    code: "FORECAST_HEAVY_RAIN",
    label: "Heavy rainfall forecast",
    description: `${rainfallMm.toFixed(0)} mm of rain expected in the next 72 hours — significant catchment loading.`,
    severity: "critical",
    value: rainfallMm,
  };
}

export function signalModerateRainForecast(rainfallMm: number): RiskSignal {
  return {
    code: "FORECAST_MODERATE_RAIN",
    label: "Moderate rainfall forecast",
    description: `${rainfallMm.toFixed(0)} mm of rain expected in the next 72 hours.`,
    severity: "warning",
    value: rainfallMm,
  };
}

export function signalLowRainForecast(rainfallMm: number): RiskSignal {
  return {
    code: "FORECAST_LOW_RAIN",
    label: "Low rainfall forecast",
    description: `Only ${rainfallMm.toFixed(0)} mm of rain expected — minimal additional catchment loading.`,
    severity: "info",
    value: rainfallMm,
  };
}

export function signalNoForecastAvailable(): RiskSignal {
  return {
    code: "FORECAST_UNAVAILABLE",
    label: "Forecast unavailable",
    description:
      "No weather forecast could be retrieved. Rainfall contribution to risk score is set to neutral.",
    severity: "info",
  };
}
