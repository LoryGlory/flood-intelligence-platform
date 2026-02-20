"use client";

import { useState } from "react";
import type { AssessResponse, AssessError, FloodExplanation } from "@flood/core";
import { STATIONS } from "@flood/core";
import { RiskBadge } from "@/components/RiskBadge";
import { SignalList } from "@/components/SignalList";
import { EvidenceList } from "@/components/EvidenceList";
import { SafetyBanner } from "@/components/SafetyBanner";

type UIState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "success"; explanation: FloodExplanation }
  | { phase: "error"; message: string };

export default function DashboardPage() {
  const [stationId, setStationId] = useState<string>(Object.keys(STATIONS)[0] ?? "trier");
  const [state, setState] = useState<UIState>({ phase: "idle" });

  async function handleAssess() {
    setState({ phase: "loading" });
    try {
      const res = await fetch("/api/assess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId }),
      });

      const data = (await res.json()) as AssessResponse | AssessError;
      if (data.ok) {
        setState({ phase: "success", explanation: data.explanation });
      } else {
        setState({ phase: "error", message: data.error });
      }
    } catch (err) {
      setState({
        phase: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }

  const station = STATIONS[stationId];

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-blue-900 text-white px-6 py-5 shadow-md">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold tracking-tight">🌊 Mosel Flood Risk Intelligence</h1>
          <p className="text-blue-200 text-sm mt-0.5">
            Decision-support only — not an official emergency service
          </p>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Select monitoring station</h2>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label
                htmlFor="station-select"
                className="block text-xs font-medium text-gray-500 mb-1"
              >
                Station
              </label>
              <select
                id="station-select"
                value={stationId}
                onChange={(e) => {
                  setStationId(e.target.value);
                  setState({ phase: "idle" });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(STATIONS).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.riverName}
                  </option>
                ))}
              </select>
            </div>

            {station && (
              <div className="text-xs text-gray-500 pb-2">
                <p>📍 {station.locationName}</p>
                <p>
                  Warning: {station.warningLevelM} m · Danger: {station.dangerLevelM} m
                </p>
              </div>
            )}

            <button
              onClick={handleAssess}
              disabled={state.phase === "loading"}
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              {state.phase === "loading" ? "Assessing…" : "Run Assessment"}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-6 pb-16 mt-6 space-y-6">
        {state.phase === "idle" && (
          <div className="text-center text-gray-400 py-16 text-sm">
            Select a station and click <strong>Run Assessment</strong> to begin.
          </div>
        )}

        {state.phase === "loading" && (
          <div className="text-center text-gray-400 py-16 text-sm animate-pulse">
            Running pipeline… ingesting data, scoring risk, generating explanation.
          </div>
        )}

        {state.phase === "error" && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-xl p-4 text-sm">
            <strong>Error:</strong> {state.message}
          </div>
        )}

        {state.phase === "success" && (
          <>
            {/* Safety banner — always first */}
            <SafetyBanner notice={state.explanation.safetyNotice} />

            {/* Score + summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-wrap gap-6 items-start">
                <RiskBadge
                  score={state.explanation.riskScore}
                  level={state.explanation.riskLevel}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Summary
                  </h3>
                  <p className="text-gray-800 leading-relaxed">{state.explanation.summary}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    Generated: {new Date(state.explanation.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Uncertainty */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Uncertainty & Limitations
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {state.explanation.uncertainty}
              </p>
            </div>

            {/* Key signals */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Key Risk Signals
              </h3>
              <SignalList signals={state.explanation.keySignals} />
            </div>

            {/* Evidence */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Evidence & Citations
              </h3>
              <EvidenceList items={state.explanation.evidence} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
