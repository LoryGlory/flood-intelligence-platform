import type { WeatherForecast } from "@flood/core";

/**
 * Contract that every weather-forecast adapter must satisfy.
 *
 * TODO (real ingestion): implement DWDOpenDataAdapter that fetches from
 *   https://opendata.dwd.de/  (Deutscher Wetterdienst open data)
 * or the Open-Meteo API (https://open-meteo.com/ – no key required).
 * The mock adapter fulfils this interface with synthetic forecasts.
 */
export interface WeatherAdapter {
  /**
   * Return the current forecast for the catchment area associated with the
   * given station.
   *
   * @param stationId  Station identifier (matches StationConfig.id)
   * @param windowHours  Forecast window length in hours (default 72)
   */
  fetchForecast(stationId: string, windowHours?: number): Promise<WeatherForecast>;
}
