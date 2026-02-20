import type { GaugeReading } from "@flood/core";

/**
 * Contract that every gauge adapter must satisfy.
 *
 * TODO (real ingestion): implement PegelOnlineAdapter that hits
 *   https://www.pegelonline.wsv.de/webservices/rest-api/v2/
 * or BfG REST API.  The mock adapter below fulfils this interface with
 * deterministic synthetic data so the rest of the stack can run immediately.
 */
export interface GaugeAdapter {
  /**
   * Return the N most-recent readings for a station, ordered newest-first.
   * @param stationId  Station identifier (matches StationConfig.id)
   * @param limit      Max readings to return (default 24)
   */
  fetchLatest(stationId: string, limit?: number): Promise<GaugeReading[]>;
}
