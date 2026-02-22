/**
 * OpenMeteoAdapter
 * ----------------
 * Fetches real rainfall forecasts from the Open-Meteo API (no key required).
 *
 * Docs: https://open-meteo.com/en/docs
 *
 * Response shape used:
 *   hourly.time[]          — ISO-8601 strings, one per hour
 *   hourly.precipitation[] — mm per hour for each slot
 *
 * The adapter sums the precipitation array to get total rainfallMm over the
 * window and finds the peak hourly intensity.
 *
 * Station coordinates come from the @flood/core STATIONS constant so there
 * is no separate mapping to maintain.
 */

import { STATIONS } from "@flood/core";
import type { WeatherForecast } from "@flood/core";
import type { WeatherAdapter } from "./interface.js";

const BASE_URL = "https://api.open-meteo.com/v1/forecast";

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    precipitation: number[];
  };
}

export class OpenMeteoAdapter implements WeatherAdapter {
  async fetchForecast(stationId: string, windowHours = 72): Promise<WeatherForecast> {
    const station = STATIONS[stationId];
    if (!station) {
      throw new Error(
        `OpenMeteoAdapter: unknown stationId "${stationId}". ` +
          `Known stations: ${Object.keys(STATIONS).join(", ")}`
      );
    }

    const forecastDays = Math.ceil(windowHours / 24);
    const url =
      `${BASE_URL}?latitude=${station.lat}&longitude=${station.lon}` +
      `&hourly=precipitation&forecast_days=${forecastDays}&timezone=UTC`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Open-Meteo API error ${response.status} for station "${stationId}": ${response.statusText}`
      );
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const precip = data.hourly.precipitation.slice(0, windowHours);

    const rainfallMm = precip.reduce((sum, v) => sum + v, 0);
    const peakIntensityMmH = precip.length > 0 ? Math.max(...precip) : 0;

    const now = new Date();
    const validTo = new Date(now.getTime() + windowHours * 60 * 60 * 1000);

    return {
      stationId,
      forecastedAt: now.toISOString(),
      validFrom: now.toISOString(),
      validTo: validTo.toISOString(),
      rainfallMm: parseFloat(rainfallMm.toFixed(1)),
      peakIntensityMmH: parseFloat(peakIntensityMmH.toFixed(1)),
      source: `Open-Meteo (lat=${station.lat}, lon=${station.lon})`,
    };
  }
}
