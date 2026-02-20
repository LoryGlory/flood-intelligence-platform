/**
 * MockWeatherAdapter
 * ------------------
 * Returns deterministic synthetic rainfall forecasts.
 *
 * Station profiles mirror the gauge scenarios:
 *   trier      → heavy rainfall expected (high risk contribution)
 *   cochem     → dry, low concern
 *   bernkastel → moderate rainfall
 *
 * TODO (real ingestion): replace with DWDOpenDataAdapter or OpenMeteoAdapter.
 */

import type { WeatherForecast } from "@flood/core";
import type { WeatherAdapter } from "./interface.js";

type ForecastProfile = {
  rainfallMm: number;
  peakIntensityMmH: number;
  confidence: number;
};

const PROFILES: Record<string, ForecastProfile> = {
  trier: {
    rainfallMm: 78,
    peakIntensityMmH: 12.5,
    confidence: 0.72,
  },
  cochem: {
    rainfallMm: 6,
    peakIntensityMmH: 1.2,
    confidence: 0.91,
  },
  bernkastel: {
    rainfallMm: 34,
    peakIntensityMmH: 5.8,
    confidence: 0.81,
  },
};

const SOURCE = "Mock Weather Adapter v1 (synthetic — replace with DWD/Open-Meteo)";

export class MockWeatherAdapter implements WeatherAdapter {
  private readonly asOf: Date;

  constructor(asOf?: Date) {
    this.asOf = asOf ?? new Date();
  }

  async fetchForecast(stationId: string, windowHours = 72): Promise<WeatherForecast> {
    const profile = PROFILES[stationId];
    if (!profile) {
      throw new Error(
        `MockWeatherAdapter: unknown stationId "${stationId}". ` +
          `Known stations: ${Object.keys(PROFILES).join(", ")}`
      );
    }

    const validFrom = new Date(this.asOf);
    const validTo = new Date(this.asOf.getTime() + windowHours * 60 * 60 * 1000);

    return {
      stationId,
      forecastedAt: this.asOf.toISOString(),
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      rainfallMm: profile.rainfallMm,
      peakIntensityMmH: profile.peakIntensityMmH,
      confidence: profile.confidence,
      source: SOURCE,
    };
  }
}
