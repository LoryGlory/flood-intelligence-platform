import { describe, it, expect } from "vitest";
import { scoreGaugeLevel, scoreGaugeTrend, scoreForecast, computeRiskAssessment, } from "../src/scorer.js";
// ------------------------------------------------------------------
// Shared fixtures
// ------------------------------------------------------------------
const STATION = {
    id: "test-station",
    name: "Test Station",
    riverName: "Test River",
    locationName: "Test, Germany",
    lat: 50.0,
    lon: 7.0,
    baselineM: 2.0,
    warningLevelM: 5.0,
    dangerLevelM: 7.0,
};
function makeReading(levelM, hoursAgo = 0, stationId = "test-station") {
    const ts = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
    return {
        stationId,
        timestamp: ts,
        waterLevelM: levelM,
        source: "test",
    };
}
function makeForecast(rainfallMm) {
    const now = new Date();
    return {
        stationId: "test-station",
        forecastedAt: now.toISOString(),
        validFrom: now.toISOString(),
        validTo: new Date(now.getTime() + 72 * 3_600_000).toISOString(),
        rainfallMm,
        peakIntensityMmH: rainfallMm / 10,
        source: "test",
    };
}
// ------------------------------------------------------------------
// scoreGaugeLevel
// ------------------------------------------------------------------
describe("scoreGaugeLevel", () => {
    it("returns 0 when at or below baseline", () => {
        const { score } = scoreGaugeLevel(STATION.baselineM, STATION);
        expect(score).toBe(0);
    });
    it("returns 100 when at or above danger level", () => {
        const { score } = scoreGaugeLevel(STATION.dangerLevelM, STATION);
        expect(score).toBe(100);
    });
    it("returns 100 when well above danger level", () => {
        const { score } = scoreGaugeLevel(10, STATION);
        expect(score).toBe(100);
    });
    it("returns score in 75–99 range between warning and danger", () => {
        // midpoint between warning (5.0) and danger (7.0) = 6.0
        const { score } = scoreGaugeLevel(6.0, STATION);
        expect(score).toBeGreaterThanOrEqual(75);
        expect(score).toBeLessThan(100);
    });
    it("emits GAUGE_ABOVE_DANGER signal when above danger", () => {
        const { signals } = scoreGaugeLevel(8.0, STATION);
        expect(signals.some((s) => s.code === "GAUGE_ABOVE_DANGER")).toBe(true);
    });
    it("emits GAUGE_ABOVE_WARNING signal when between warning and danger", () => {
        const { signals } = scoreGaugeLevel(5.5, STATION);
        expect(signals.some((s) => s.code === "GAUGE_ABOVE_WARNING")).toBe(true);
    });
    it("score increases monotonically with level", () => {
        const levels = [2.0, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5];
        const scores = levels.map((l) => scoreGaugeLevel(l, STATION).score);
        for (let i = 1; i < scores.length; i++) {
            expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
        }
    });
});
// ------------------------------------------------------------------
// scoreGaugeTrend
// ------------------------------------------------------------------
describe("scoreGaugeTrend", () => {
    it("returns stable signal for empty or single reading", () => {
        const { signals } = scoreGaugeTrend([]);
        expect(signals.some((s) => s.code === "TREND_STABLE")).toBe(true);
    });
    it("returns 100 score for rapid rise >= 0.15 m/h", () => {
        const r0 = makeReading(5.3, 0); // newest
        const r1 = makeReading(5.0, 1); // 1 hour ago — 0.3 m rise = 0.3 m/h
        // Wait — r0 is newer so delta = 5.3 - 5.0 = +0.3 m in 1h => rate = 0.3 m/h
        const { score, signals } = scoreGaugeTrend([r0, r1]);
        expect(score).toBe(100);
        expect(signals.some((s) => s.code === "TREND_RAPID_RISE")).toBe(true);
    });
    it("returns notable rise signal for moderate rise", () => {
        const r0 = makeReading(5.07, 0);
        const r1 = makeReading(5.0, 1); // 0.07 m/h
        const { signals } = scoreGaugeTrend([r0, r1]);
        expect(signals.some((s) => s.code === "TREND_NOTABLE_RISE")).toBe(true);
    });
    it("returns falling signal when level decreasing", () => {
        const r0 = makeReading(4.8, 0);
        const r1 = makeReading(5.0, 1);
        const { signals } = scoreGaugeTrend([r0, r1]);
        expect(signals.some((s) => s.code === "TREND_FALLING")).toBe(true);
    });
    it("returns stable when change is negligible", () => {
        const r0 = makeReading(5.01, 0);
        const r1 = makeReading(5.00, 1); // 0.01 m/h < 0.05 threshold
        const { signals } = scoreGaugeTrend([r0, r1]);
        expect(signals.some((s) => s.code === "TREND_STABLE")).toBe(true);
    });
});
// ------------------------------------------------------------------
// scoreForecast
// ------------------------------------------------------------------
describe("scoreForecast", () => {
    it("returns neutral score (50) when forecast is null", () => {
        const { score, signals } = scoreForecast(null);
        expect(score).toBe(50);
        expect(signals.some((s) => s.code === "FORECAST_UNAVAILABLE")).toBe(true);
    });
    it("returns 100 for critical rainfall (>= 100 mm)", () => {
        const { score } = scoreForecast(makeForecast(110));
        expect(score).toBe(100);
    });
    it("returns >= 75 for heavy rainfall (>= 60 mm)", () => {
        const { score } = scoreForecast(makeForecast(60));
        expect(score).toBeGreaterThanOrEqual(75);
    });
    it("returns >= 50 for moderate rainfall (>= 30 mm)", () => {
        const { score } = scoreForecast(makeForecast(30));
        expect(score).toBeGreaterThanOrEqual(50);
    });
    it("returns < 25 for very low rainfall (< 10 mm)", () => {
        const { score } = scoreForecast(makeForecast(5));
        expect(score).toBeLessThan(25);
    });
    it("emits FORECAST_HEAVY_RAIN for >= 60 mm", () => {
        const { signals } = scoreForecast(makeForecast(80));
        expect(signals.some((s) => s.code === "FORECAST_HEAVY_RAIN")).toBe(true);
    });
});
// ------------------------------------------------------------------
// computeRiskAssessment (integration)
// ------------------------------------------------------------------
describe("computeRiskAssessment", () => {
    it("produces a valid assessment for low-risk scenario", () => {
        const result = computeRiskAssessment({
            station: STATION,
            readings: [makeReading(2.1, 0), makeReading(2.0, 1)],
            forecast: makeForecast(5),
        });
        expect(result.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskScore).toBeLessThanOrEqual(100);
        expect(result.riskLevel).toBe("low");
        expect(result.signals.length).toBeGreaterThan(0);
        expect(result.stationId).toBe(STATION.id);
    });
    it("produces critical assessment when gauge is high, rising fast, heavy rain", () => {
        const result = computeRiskAssessment({
            station: STATION,
            readings: [makeReading(7.5, 0), makeReading(7.0, 1)],
            forecast: makeForecast(120),
        });
        expect(result.riskScore).toBeGreaterThanOrEqual(75);
        expect(result.riskLevel).toBe("critical");
    });
    it("throws when readings array is empty", () => {
        expect(() => computeRiskAssessment({
            station: STATION,
            readings: [],
            forecast: null,
        })).toThrow();
    });
    it("includes all three signal types in a compound scenario", () => {
        const result = computeRiskAssessment({
            station: STATION,
            readings: [makeReading(5.5, 0), makeReading(5.0, 1)],
            forecast: makeForecast(70),
        });
        const codes = result.signals.map((s) => s.code);
        // Should have at least gauge + trend + forecast signals
        expect(codes.some((c) => c.startsWith("GAUGE_"))).toBe(true);
        expect(codes.some((c) => c.startsWith("TREND_"))).toBe(true);
        expect(codes.some((c) => c.startsWith("FORECAST_"))).toBe(true);
    });
    it("score is deterministic for same inputs", () => {
        const inputs = {
            station: STATION,
            readings: [makeReading(4.2, 0), makeReading(4.1, 1)],
            forecast: makeForecast(25),
        };
        const r1 = computeRiskAssessment(inputs);
        const r2 = computeRiskAssessment(inputs);
        expect(r1.riskScore).toBe(r2.riskScore);
    });
});
//# sourceMappingURL=scorer.test.js.map