# Mosel Flood Risk Intelligence & Explanation System

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
│   ├── core/           @flood/core       — shared types, interfaces, constants
│   ├── ingestion/      @flood/ingestion   — mock gauge + weather adapters (swap-ready)
│   ├── risk-engine/    @flood/risk-engine — rule-based scorer + signal emitters
│   ├── evidence-store/ @flood/evidence-store — NDJSON store + RAG retrieval layer
│   ├── llm-agent/      @flood/llm-agent  — prompt builder, provider interface, guardrails
│   └── web/            @flood/web        — Next.js dashboard + API routes
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

### Data flow (one request)

```
GET /api/seed  (once, or on demand)
       │
       ▼
MockGaugeAdapter ──┐
MockWeatherAdapter ─┤──► JsonEvidenceStore (NDJSON)
                   │
       ▼           │
POST /api/assess   │
  stationId ───────┤
                   │
       ▼           │
computeRiskAssessment()    (rule-based, weighted)
  - scoreGaugeLevel()      (45%)
  - scoreGaugeTrend()      (25%)
  - scoreForecast()        (30%)
       │
       ▼
RiskAssessment { score 0–100, riskLevel, signals[] }
       │
       ▼
EvidenceRetrieval.retrieve()   (RAG: recency-ranked)
       │
       ▼
FloodExplanationAgent.explain()
  - buildUserPrompt()          (structured, evidence-grounded)
  - llm.complete()             (StubLLMProvider / AnthropicProvider)
  - validateLLMOutput()        (guardrails: JSON schema, safety notice, hallucination heuristic)
       │
       ▼
FloodExplanation { riskScore, summary, keySignals[], evidence[], uncertainty, safetyNotice }
       │
       ▼
React Dashboard   (RiskBadge, SignalList, EvidenceList, SafetyBanner)
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
3. The full pipeline runs: ingest → score → explain → render

> On first run the evidence store seeds itself automatically via the assessment
> API. You can also seed explicitly: `GET http://localhost:3000/api/seed`

---

## Run tests

```bash
pnpm test              # all packages
pnpm test:risk         # @flood/risk-engine only (scorer unit tests)
pnpm test:agent        # @flood/llm-agent only (guardrail + agent tests)
```

### What's tested

| Package              | Tests | What                                                                                                                                                |
| -------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@flood/risk-engine` | 23    | `scoreGaugeLevel`, `scoreGaugeTrend`, `scoreForecast`, `computeRiskAssessment` — monotonicity, thresholds, signal codes, determinism                |
| `@flood/llm-agent`   | 16    | Guardrails (JSON parse, required fields, safety notice, missing fields), agent fallback on LLM error, hallucination heuristic, evidence passthrough |

---

## Activating a real LLM

### Anthropic (Claude)

```bash
pnpm add @anthropic-ai/sdk --filter @flood/llm-agent
```

Then uncomment the implementation in
[packages/llm-agent/src/providers/anthropic.ts](packages/llm-agent/src/providers/anthropic.ts)
and update the orchestrator:

```ts
// packages/web/src/lib/orchestrator.ts
import { AnthropicProvider } from "@flood/llm-agent";

const llm = process.env.ANTHROPIC_API_KEY
  ? new AnthropicProvider()
  : new StubLLMProvider();
```

Set `ANTHROPIC_API_KEY` in `packages/web/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### OpenAI

Same pattern — uncomment the `OpenAIProvider` skeleton in `anthropic.ts` and
install `openai`.

---

## Real data ingestion (TODOs)

Each mock adapter has a clear swap boundary:

| Mock                 | Real replacement      | Public source                                                                                   |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| `MockGaugeAdapter`   | `PegelOnlineAdapter`  | [pegelonline.wsv.de REST API](https://www.pegelonline.wsv.de/webservices/rest-api/v2/) (no key) |
| `MockWeatherAdapter` | `DWDOpenDataAdapter`  | [opendata.dwd.de](https://opendata.dwd.de/) or [Open-Meteo](https://open-meteo.com/) (no key)   |
| `JsonEvidenceStore`  | `SQLiteEvidenceStore` | `better-sqlite3` for single-node; TimescaleDB for scale                                         |

The `GaugeAdapter` and `WeatherAdapter` interfaces in `@flood/ingestion` are the
swap boundary — no downstream code changes.

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

### Why a stub LLM for MVP?

- No API key needed to run the full vertical slice
- Deterministic output means tests don't flake
- The `LLMProvider` interface means swapping to Claude/GPT is a one-line change
  in the orchestrator

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
- **Mock data.** The MVP uses synthetic sensor data. Readings do not reflect
  real current conditions.
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
