/**
 * EvidenceStore
 * -------------
 * Append-only JSON file store for gauge readings, weather forecasts,
 * and risk assessments.  Each record is written as a line-delimited JSON
 * entry (NDJSON) — simple, streaming-friendly, and git-diffable.
 *
 * File layout (relative to the `data/` directory):
 *   gauge-<stationId>.ndjson
 *   forecast-<stationId>.ndjson
 *   assessment-<stationId>.ndjson
 *
 * TODO (production): replace with:
 *   - SQLite (better-sqlite3) for small deployments, OR
 *   - TimescaleDB / InfluxDB for time-series at scale.
 *   The EvidenceStore interface below is the swap boundary.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { EvidenceItem, GaugeReading, WeatherForecast, RiskAssessment } from "@flood/core";

// ------------------------------------------------------------------
// Interface — swap this implementation without touching call-sites
// ------------------------------------------------------------------

export interface IEvidenceStore {
  appendGauge(reading: GaugeReading): EvidenceItem;
  appendForecast(forecast: WeatherForecast): EvidenceItem;
  appendAssessment(assessment: RiskAssessment): EvidenceItem;
  query(stationId: string, types?: EvidenceItem["type"][], limit?: number): EvidenceItem[];
  queryLatest(stationId: string, type: EvidenceItem["type"]): EvidenceItem | null;
  clear(stationId: string): void;
}

// ------------------------------------------------------------------
// NDJSON file store implementation
// ------------------------------------------------------------------

export class JsonEvidenceStore implements IEvidenceStore {
  private readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }
  }

  // ------------------------------------------------------------------
  // Append methods
  // ------------------------------------------------------------------

  appendGauge(reading: GaugeReading): EvidenceItem {
    const item: EvidenceItem = {
      id: randomUUID(),
      type: "gauge",
      citation: this.gaugeCitation(reading),
      timestamp: reading.timestamp,
      source: reading.source,
      payload: reading as unknown as Record<string, unknown>,
    };
    this.write("gauge", reading.stationId, item);
    return item;
  }

  appendForecast(forecast: WeatherForecast): EvidenceItem {
    const item: EvidenceItem = {
      id: randomUUID(),
      type: "forecast",
      citation: this.forecastCitation(forecast),
      timestamp: forecast.forecastedAt,
      source: forecast.source,
      payload: forecast as unknown as Record<string, unknown>,
    };
    this.write("forecast", forecast.stationId, item);
    return item;
  }

  appendAssessment(assessment: RiskAssessment): EvidenceItem {
    const item: EvidenceItem = {
      id: randomUUID(),
      type: "assessment",
      citation: `Risk assessment for ${assessment.stationId} at ${assessment.assessedAt}: score ${assessment.riskScore}/100 (${assessment.riskLevel}).`,
      timestamp: assessment.assessedAt,
      source: "flood-risk-engine",
      payload: assessment as unknown as Record<string, unknown>,
    };
    this.write("assessment", assessment.stationId, item);
    return item;
  }

  // ------------------------------------------------------------------
  // Query methods — newest-first ordering
  // ------------------------------------------------------------------

  query(stationId: string, types?: EvidenceItem["type"][], limit = 20): EvidenceItem[] {
    const targetTypes =
      types ?? (["gauge", "forecast", "assessment", "historical"] as EvidenceItem["type"][]);
    const all: EvidenceItem[] = [];

    for (const type of targetTypes) {
      all.push(...this.readAll(type, stationId));
    }

    // Sort newest-first, then cap
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  queryLatest(stationId: string, type: EvidenceItem["type"]): EvidenceItem | null {
    const all = this.readAll(type, stationId);
    if (all.length === 0) return null;
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? null;
  }

  clear(stationId: string): void {
    for (const type of ["gauge", "forecast", "assessment"] as const) {
      const path = this.filePath(type, stationId);
      if (existsSync(path)) {
        writeFileSync(path, "", "utf-8");
      }
    }
  }

  // ------------------------------------------------------------------
  // Internal helpers
  // ------------------------------------------------------------------

  private filePath(type: string, stationId: string): string {
    return join(this.dataDir, `${type}-${stationId}.ndjson`);
  }

  private write(type: string, stationId: string, item: EvidenceItem): void {
    const path = this.filePath(type, stationId);
    appendFileSync(path, JSON.stringify(item) + "\n", "utf-8");
  }

  private readAll(type: string, stationId: string): EvidenceItem[] {
    const path = this.filePath(type, stationId);
    if (!existsSync(path)) return [];

    const content = readFileSync(path, "utf-8");
    return content
      .split("\n")
      .filter((line): line is string => line.length > 0)
      .map((line) => JSON.parse(line) as EvidenceItem);
  }

  private gaugeCitation(r: GaugeReading): string {
    return (
      `Gauge reading at ${r.stationId}: ` +
      `${r.waterLevelM.toFixed(2)} m` +
      (r.flowRateM3s != null ? ` (${r.flowRateM3s.toFixed(1)} m³/s)` : "") +
      ` — ${new Date(r.timestamp).toUTCString()}. Source: ${r.source}.`
    );
  }

  private forecastCitation(f: WeatherForecast): string {
    return (
      `Weather forecast issued ${new Date(f.forecastedAt).toUTCString()} ` +
      `for ${f.stationId}: ` +
      `${f.rainfallMm.toFixed(0)} mm total rainfall, ` +
      `peak ${f.peakIntensityMmH.toFixed(1)} mm/h, ` +
      `valid ${new Date(f.validFrom).toUTCString()} – ${new Date(f.validTo).toUTCString()}. ` +
      `Source: ${f.source}.`
    );
  }
}
