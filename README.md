<div align="center">
  <img src="assets/logo.svg" alt="Mosel Flood Risk Intelligence logo" width="80" height="80" />
  <h1>Mosel Flood Risk Intelligence &amp; Explanation System</h1>
  <p>by <a href="https://www.linkedin.com/in/laura-roganovic">Laura Roganovic</a></p>
</div>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-flood--intelligence--platform-blue?logo=vercel&logoColor=white)](https://flood-intelligence-platform-web.vercel.app/)
[![CI](https://github.com/LoryGlory/flood-intelligence-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/LoryGlory/flood-intelligence-platform/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=loryglory_flood-intelligence-platform&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=loryglory_flood-intelligence-platform)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=loryglory_flood-intelligence-platform&metric=coverage)](https://sonarcloud.io/summary/new_code?id=loryglory_flood-intelligence-platform)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-20-green?logo=node.js&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-9-orange?logo=pnpm&logoColor=white)

A portfolio-grade AI orchestration project demonstrating production-ready system
design: **sensor ingestion → rule-based risk scoring → RAG evidence retrieval →
LLM explanation → dashboard UI**.

> **Safety notice:** This system is for **decision-support purposes only**. It
> does not constitute an official flood warning or emergency directive. Always
> follow guidance from your national/regional flood-warning authority and
> emergency services.

---

## Architecture overview

```
flood-intelligence-platform/
├── packages/
│   ├── core/           @flood/core          — shared types, interfaces, constants
│   ├── ingestion/      @flood/ingestion      — PegelOnline + Open-Meteo live adapters
│   ├── risk-engine/    @flood/risk-engine    — rule-based scorer + signal emitters
│   ├── evidence-store/ @flood/evidence-store — NDJSON store + RAG retrieval layer
│   ├── llm-agent/      @flood/llm-agent      — prompt builder, provider interface, guardrails
│   └── web/            @flood/web            — Next.js dashboard + API routes
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Data flow (one request)

```
POST /api/assess  stationId
       │
       ├──► PegelOnlineAdapter   — live WSV gauge data (last 24 h, 15-min intervals)
       ├──► OpenMeteoAdapter     — live precipitation forecast (72 h ahead)
       │         │
       │         ▼
       │    JsonEvidenceStore (NDJSON) ◄── readings + forecast appended
       │
       ▼
computeRiskAssessment()    (rule-based, weighted)
  - scoreGaugeLevel()      (45%)
  - scoreGaugeTrend()      (25%)
  - scoreForecast()        (30%)
       │
       ▼
RiskAssessment { score 0–100, riskLevel, signals[] }  ◄── appended to store
       │
       ▼
EvidenceRetrieval.retrieve()   (RAG: recency-ranked, top-8)
       │
       ▼
FloodExplanationAgent.explain()
  - buildUserPrompt()          (structured, evidence-grounded)
  - llm.complete()             (AnthropicProvider if key set, else StubLLMProvider)
  - validateLLMOutput()        (guardrails: JSON schema, safety notice, hallucination heuristic)
       │
       ▼
FloodExplanation { riskScore, summary, keySignals[], evidence[], uncertainty, safetyNotice }
       │
       ▼
React Dashboard   (RiskBadge, SignalList, EvidenceList, SafetyBanner, StationSelect)
```

---

## Quick start

### Prerequisites

- **Node.js ≥ 20** (ESM native)
- **pnpm ≥ 9** — install with `npm install -g pnpm`

### Install

```bash
git clone https://github.com/LoryGlory/flood-intelligence-platform.git
cd flood-intelligence-platform
pnpm install
```

### Build all packages

```bash
pnpm build
# or build individually:
pnpm --filter @flood/core build
pnpm --filter @flood/ingestion build
pnpm --filter @flood/risk-engine build
pnpm --filter @flood/evidence-store build
pnpm --filter @flood/llm-agent build
```

### Run the dev server

```bash
pnpm dev
# → http://localhost:3000
```

Then in the browser:

1. Select a station (Trier, Cochem, or Bernkastel-Kues)
2. Click **Run Assessment**
3. The full pipeline runs: fetch live data → score → explain → render

> Live gauge data is fetched from the
> [WSV PegelOnline API](https://www.pegelonline.wsv.de/webservices/rest-api/v2/)
> and precipitation forecasts from [Open-Meteo](https://open-meteo.com/). Both
> are free and require no API key.

### Run with Docker

```bash
# Build and start (set ANTHROPIC_API_KEY to enable the real LLM)
ANTHROPIC_API_KEY=sk-ant-... docker compose up --build

# Or without a key (uses StubLLMProvider)
docker compose up --build
# → http://localhost:3000
```

### Deploy to Vercel

The repo includes a `vercel.json` that configures the pnpm monorepo build. In
the Vercel project settings, leave **Root Directory** blank (monorepo root).

Add your API key as an environment variable:

```
ANTHROPIC_API_KEY=sk-ant-...
```

No other configuration is needed — Vercel picks up the Next.js app
automatically.

---

## Run tests

```bash
pnpm test              # all packages
pnpm test:risk         # @flood/risk-engine only (scorer unit tests)
pnpm test:agent        # @flood/llm-agent only (guardrail + agent tests)
```

### What's tested

| Package              | Tests | What                                                                                                                                                               |
| -------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@flood/risk-engine` | 23    | `scoreGaugeLevel`, `scoreGaugeTrend`, `scoreForecast`, `computeRiskAssessment` — monotonicity, thresholds, signal codes, determinism                               |
| `@flood/llm-agent`   | 26    | Guardrails (JSON parse, required fields, safety notice, missing fields), agent fallback on LLM error, hallucination heuristic, evidence passthrough, LLM providers |

---

## Activating a real LLM

### Anthropic (Claude) — recommended

The orchestrator automatically uses `AnthropicProvider` (claude-sonnet-4-6) when
`ANTHROPIC_API_KEY` is present, and falls back to `StubLLMProvider` otherwise.

Create `packages/web/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

No code changes needed — the key is the only requirement.

### OpenAI

Install the SDK and implement the `OpenAIProvider` skeleton in
[packages/llm-agent/src/providers/openai.ts](packages/llm-agent/src/providers/openai.ts),
then update the orchestrator to use it.

---

## Data sources

| Adapter              | Source                                                                                          | Notes                                     |
| -------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `PegelOnlineAdapter` | [pegelonline.wsv.de REST API](https://www.pegelonline.wsv.de/webservices/rest-api/v2/) (no key) | 15-min gauge readings, last 24 h, cm → m  |
| `OpenMeteoAdapter`   | [open-meteo.com](https://open-meteo.com/) (no key)                                              | Hourly precipitation mm/h, 72 h forecast  |
| `JsonEvidenceStore`  | Local NDJSON files                                                                              | Swap boundary: `IEvidenceStore` interface |

Station → PegelOnline shortname mapping: `trier → TRIER UP`, `cochem → COCHEM`,
`bernkastel → ZELTINGEN UP`.

The `GaugeAdapter` and `WeatherAdapter` interfaces in `@flood/ingestion` are the
swap boundary — replacing an adapter requires no downstream code changes.

---

## Scoring model

```
riskScore = clamp(
  scoreGaugeLevel(level, station)  × 0.45
+ scoreGaugeTrend(readings)        × 0.25
+ scoreForecast(forecast)          × 0.30,
  0, 100
)
```

| Component     | Input                                           | 0→100 mapping                     |
| ------------- | ----------------------------------------------- | --------------------------------- |
| Gauge level   | Current water level vs. baseline/warning/danger | Linear interpolation across bands |
| Gauge trend   | Rise rate (m/h) between last two readings       | 0 at stable, 100 at ≥ 0.15 m/h    |
| Forecast rain | Total mm over 72 h                              | Banded: 0 (<10mm) → 100 (>100mm)  |

Risk levels: **low** (0–24) · **moderate** (25–49) · **high** (50–74) ·
**critical** (75–100)

---

## Design decisions

### Why rule-based scoring?

Transparent, auditable, testable. An ML model could replace
`computeRiskAssessment()` behind the same `ScorerInput` / `RiskAssessment`
interface without touching the agent or UI.

### Why NDJSON for the evidence store?

Zero native dependencies, git-diffable, streamable. The `IEvidenceStore`
interface is the replacement boundary for SQLite or a time-series DB. NDJSON is
appropriate for MVP and dev; it is not appropriate for concurrent writes or high
volume.

### Why a stub LLM fallback?

- No API key needed to run the full vertical slice
- Deterministic output means tests don't flake
- The `LLMProvider` interface means the active provider is a single line in the
  orchestrator — `AnthropicProvider` activates automatically when an API key is
  present

### Guardrails design

The agent output goes through `validateLLMOutput()` before it reaches the UI:

1. JSON parse check
2. Required field presence (`summary`, `uncertainty`, `safetyNotice`)
3. Safety notice substring match — the canonical notice must be present verbatim
4. Hallucination heuristic — numbers in the summary that don't appear in any
   evidence citation trigger a `console.warn`
5. Fallback path — any guardrail failure produces a safe, templated explanation
   (never an empty or malformed response)

---

## Safety & limitations

- **Decision-support only.** Never use this system as the sole basis for
  evacuation or emergency decisions.
- **Live data, not official warnings.** Gauge readings come from the WSV
  PegelOnline API and forecasts from Open-Meteo. Data accuracy depends on
  upstream sensor availability and forecast model quality.
- **No catchment model.** Soil saturation, snowmelt, and upstream conditions are
  not modelled.
- **Forecast uncertainty.** Rainfall forecasts beyond 48 h carry significant
  uncertainty; the model does not propagate forecast confidence into the risk
  score.
- **Single-station view.** The system does not model wave propagation between
  upstream/downstream stations.
- **LLM hallucination risk.** Guardrails reduce but cannot eliminate the risk of
  the LLM generating plausible-sounding but incorrect statements. Always
  cross-check against the raw evidence items shown in the UI.

---

## Extending the project

| Feature                            | Where to add                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Additional stations                | `packages/core/src/constants/index.ts` → `STATIONS`                           |
| New risk signal                    | `packages/risk-engine/src/signals.ts` + `scorer.ts`                           |
| Vector/semantic evidence retrieval | Replace `EvidenceRetrieval` in `packages/evidence-store/src/retrieval.ts`     |
| Real-time WebSocket updates        | Add a WebSocket server in `packages/web`; push assessment updates             |
| Historical trend charts            | Extend `EvidenceList` component; query `gauge-*.ndjson` time series           |
| Alert thresholds / notifications   | Add a `NotificationService` that subscribes to `computeRiskAssessment` output |
| Multi-station river basin view     | Add a map component; call `/api/assess` for each station in parallel          |
