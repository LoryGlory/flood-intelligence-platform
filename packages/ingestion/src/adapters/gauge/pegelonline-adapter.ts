/**
 * PegelOnlineAdapter
 * ------------------
 * Fetches real gauge readings from the German Water Route Authority's
 * public REST API (no API key required).
 *
 * Docs: https://www.pegelonline.wsv.de/webservices/rest-api/v2/
 *
 * Notes:
 *  - Values are in centimetres — divided by 100 to produce metres.
 *  - Timestamps include a timezone offset; normalised to UTC ISO-8601.
 *  - Readings are returned oldest-first; reversed to newest-first.
 *  - Updates every 15 minutes; requesting P1D covers 96 readings.
 *
 * Station mapping (Mosel):
 *  trier      → TRIER UP     (Unterpegel, below the Trier lock)
 *  cochem     → COCHEM       (has both W and Q timeseries)
 *  bernkastel → ZELTINGEN UP (closest available station ~10 km downstream)
 */

import type { GaugeReading } from "@flood/core";
import type { GaugeAdapter } from "./interface.js";

const BASE_URL = "https://www.pegelonline.wsv.de/webservices/rest-api/v2";

const STATION_SHORTNAMES: Record<string, string> = {
  trier: "TRIER UP",
  cochem: "COCHEM",
  bernkastel: "ZELTINGEN UP",
};

interface PegelMeasurement {
  timestamp: string;
  value: number;
}

export class PegelOnlineAdapter implements GaugeAdapter {
  async fetchLatest(stationId: string, limit = 24): Promise<GaugeReading[]> {
    const shortname = STATION_SHORTNAMES[stationId];
    if (!shortname) {
      throw new Error(
        `PegelOnlineAdapter: unknown stationId "${stationId}". ` +
          `Known stations: ${Object.keys(STATION_SHORTNAMES).join(", ")}`
      );
    }

    const url =
      `${BASE_URL}/stations/${encodeURIComponent(shortname)}/W/measurements.json` + `?start=P1D`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `PegelOnline API error ${response.status} for station "${shortname}": ${response.statusText}`
      );
    }

    const raw: PegelMeasurement[] = (await response.json()) as PegelMeasurement[];

    // API returns oldest-first; reverse to get newest-first then cap to limit
    const sorted = [...raw].reverse().slice(0, limit);

    const source = `PegelOnline WSV — ${shortname}`;

    return sorted.map((m) => ({
      stationId,
      timestamp: new Date(m.timestamp).toISOString(),
      waterLevelM: parseFloat((m.value / 100).toFixed(3)), // cm → m
      source,
    }));
  }
}
