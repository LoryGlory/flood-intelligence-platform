"use client";

import { useState } from "react";
import type { AssessResponse, AssessError, FloodExplanation } from "@flood/core";
import { STATIONS } from "@flood/core";
import { RiskBadge } from "@/components/RiskBadge";
import { SignalList } from "@/components/SignalList";
import { EvidenceList } from "@/components/EvidenceList";
import { SafetyBanner } from "@/components/SafetyBanner";
import { StationSelect } from "@/components/StationSelect";

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

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-950 text-white py-5 shadow-lg">
        <div className="max-w-4xl mx-auto px-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 text-blue-300 shrink-0"
                aria-hidden="true"
              >
                <path d="M11.47 1.72a.75.75 0 0 1 1.06 0l3.75 3.75a.75.75 0 0 1-1.06 1.06l-2.47-2.47V21a.75.75 0 0 1-1.5 0V4.06L8.78 6.53a.75.75 0 0 1-1.06-1.06l3.75-3.75Z" />
                <path d="M3.22 15.22a.75.75 0 0 1 1.06 0L6 16.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L7.06 18l1.72 1.72a.75.75 0 1 1-1.06 1.06L6 19.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L4.94 18l-1.72-1.72a.75.75 0 0 1 0-1.06Zm13.5 0a.75.75 0 0 1 1.06 0L19.5 16.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L20.56 18l1.72 1.72a.75.75 0 1 1-1.06 1.06L19.5 19.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L18.44 18l-1.72-1.72a.75.75 0 0 1 0-1.06Z" />
              </svg>
              <h1 className="text-lg font-bold tracking-tight">Mosel Flood Risk Intelligence</h1>
            </div>
            <p className="text-blue-300 text-xs pl-8">
              Decision-support only — not an official emergency service
            </p>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-400 tracking-widest uppercase">
              Live
            </span>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-4xl mx-auto px-6 pt-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Monitoring Station
          </h2>

          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
            <StationSelect
              stations={Object.values(STATIONS)}
              value={stationId}
              onChange={(id) => {
                setStationId(id);
                setState({ phase: "idle" });
              }}
            />

            <button
              onClick={handleAssess}
              disabled={state.phase === "loading"}
              className="flex items-center justify-center gap-2 px-5 py-2 w-full sm:w-auto bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-300 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {state.phase === "loading" ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Assessing…
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="w-4 h-4"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Run Assessment
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-6 pb-16 mt-6 space-y-5">
        {state.phase === "idle" && (
          <div className="text-center text-slate-400 py-16 text-sm">
            Select a station and click{" "}
            <strong className="text-slate-500 font-semibold">Run Assessment</strong> to begin.
          </div>
        )}

        {state.phase === "loading" && (
          <div className="text-center py-16">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <p className="text-sm text-slate-400">
                Running pipeline — ingesting data, scoring risk, generating explanation
              </p>
            </div>
          </div>
        )}

        {state.phase === "error" && (
          <div className="flex gap-3 items-start bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold">Assessment failed</p>
              <p className="mt-0.5 text-red-700">{state.message}</p>
            </div>
          </div>
        )}

        {state.phase === "success" && (
          <>
            {/* Safety banner — always first */}
            <SafetyBanner notice={state.explanation.safetyNotice} />

            {/* Score + summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <RiskBadge
                  score={state.explanation.riskScore}
                  level={state.explanation.riskLevel}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Summary
                  </h3>
                  <p className="text-slate-800 leading-relaxed">{state.explanation.summary}</p>
                  <p className="text-xs text-slate-400 font-mono mt-3">
                    Generated: {new Date(state.explanation.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Uncertainty */}
            <div className="bg-slate-100 rounded-2xl border border-slate-200 p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Uncertainty &amp; Limitations
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {state.explanation.uncertainty}
              </p>
            </div>

            {/* Key signals */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Key Risk Signals
              </h3>
              <SignalList signals={state.explanation.keySignals} />
            </div>

            {/* Evidence */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Evidence &amp; Citations
              </h3>
              <EvidenceList items={state.explanation.evidence} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
