# Minimal RPG — Comprehensive Refactor Proposal (No-Constraints Edition)

**Author**: GPT 5.2 (Thinking)
**Date**: January 2026
**Status**: Vision Document

---

This document proposes an end-to-end refactor and modernization roadmap for Minimal RPG, prioritizing reliability, developer velocity, and long-term extensibility for LLM-driven role-playing games.

## Executive Summary

- Elevate the monorepo into a cleanly layered architecture (Domain/Core/Infra) with strict type boundaries and validated contracts.
- Upgrade the LLM platform to a first-class, provider-agnostic, streaming, tool-oriented engine with structured outputs, cost observability, and deterministic test harnesses.
- Evolve the Governor from a single-orchestrator to a pluggable multi-agent graph with typed tool schemas, event sourcing, and simulation ticks.
- Make the API real-time (SSE/WebSocket), typed end-to-end (OpenAPI/ts-rest/trpc), and production-hardened (rate limits, idempotency, telemetry, authZ).
- Strengthen the Web app with streaming UX, feature-sliced architecture, TanStack Query, and first-class in-app world-building tools.
- Institutionalize testing (unit/integration/E2E/contract), ops (metrics/traces/logs), and cost control (token budgets, caching, summarization).

---

## Current Snapshot (observed)

- Monorepo: pnpm + Turborepo, TypeScript 5, Vitest, ESLint/Prettier.
- API: Hono on Node (`packages/api`), composition in `server-impl.ts`, routes include `/sessions/:id/turns`, config via `.env`, CORS enabled.
- Web: React 19 + Vite (`packages/web`), MDX docs, Zustand, XYFlow for graphs, Tailwind.
- LLM: OpenRouter via `@minimal-rpg/utils` (`openrouter.ts`), non-streaming chat + tools; Agents/NPC wired through `@minimal-rpg/agents` with a Governor composition.
- Data: PostgreSQL + pgvector (via `@minimal-rpg/db`), JSON-based content loaders for characters/settings.
- State: `@minimal-rpg/state-manager` with JSON Patch and proximity slice; Governor drives turns.

The foundation is solid: modular packages, Zod schemas, clear API routes, and a working governor loop.

---

## Refactor Themes and Proposals

### 1) Architecture and Boundaries

- Domain/Core/Infra layering per package:
  - Domain: Zod schemas, domain events, invariants, pure logic (no I/O).
  - Core: application services and orchestrators (Governor, Agents), ports/interfaces.
  - Infra: adapters (DB, HTTP, LLM providers, queues, caches).
- Explicit contracts between layers using Zod and generated types.
- Introduce a Shared Types package for cross-cutting DTOs, versioned and linted for breaking changes.
- Adopt dependency direction checks (eslint/import rules) to enforce boundaries.

### 2) API Contracts and Transport

- Add a typed API contract:
  - Option A: OpenAPI (zod-to-openapi) + codegen clients for Web and scripts.
  - Option B: ts-rest (Zod-first) or tRPC if you prefer RPC over REST.
- Streaming responses (SSE/WebSocket) for `/turns` and tool-calling traces:
  - Stream tokens and tool-call steps; fall back to buffered JSON when streaming not supported.
- Add idempotency keys for write endpoints to avoid duplicate turns on retries.
- Add API-level rate limiting and abuse protection (IP/user/session scoped).

### 3) LLM Platform Modernization

- Provider-Agnostic Engine:
  - Providers: OpenRouter, OpenAI, Anthropic, Azure OpenAI, Ollama (local), together.ai.
  - Single `LlmProvider` interface with: streaming iterator, tool-calls, JSON schema outputs, usage and cost metadata, retries/backoff.
- Structured Outputs:
  - Use JSON Schema or Zod-to-JSON-Schema for tool args and structured messages; validate at runtime.
- Context Management:
  - Sliding window with automatic summarization, episodic memory, long-term vector store, and hint memories.
  - Hybrid retrieval (BM25 + vector) with re-ranking; slot-based prompt assembly.
- Prompt DSL and Versioning:
  - Template library with versioned system prompts, unit-tested for regressions.
- Caching and Cost Control:
  - Response cache keyed by normalized prompt; semantic cache for knowledge queries.
  - Token and cost budgets per session/turn; per-user/token-rate dashboards.
- Observability:
  - Emit spans/metrics around every LLM call (provider, model, latency, tokens, retries).
- Deterministic Test Harness:
  - Mock provider returning fixtures; seedable RNG for generators; golden-file tests for prompts and tool interactions.

### 4) Governor, Agents, and Simulation

- Graph-Orchestrated Agents:
  - Treat agents and tools as nodes with typed inputs/outputs; topological execution with guardrails.
  - Replace ad-hoc branching with policy-based routing: confidence thresholds, budget caps, safe-mode fallbacks.
- Tooling Model:
  - First-class, typed tool registry with JSON Schema, auto-documented.
  - Tool execution emits domain events (state patches, transcripts, observations).
- Event Sourcing (optional, staged):
  - Append-only event log for sessions; rebuild state via reducers; enables time travel, auditing, replay.
- Simulation Ticks:
  - Background job that advances time, schedules NPC routines, decays hygiene/affinity, and enqueues notifications.
- Safety and Content Controls:
  - Guard models with content filters (NSFW/violence/harassment policies), redaction, and constrained outputs.

### 5) Database and Persistence

- Access layer:
  - Prefer Drizzle or Kysely for typed SQL; keep pg for heavy operations.
- pgvector Improvements:
  - Index tuning (ivfflat/hnsw), HNSW where available; distance metric selection; periodic re-embedding.
- Partitioning:
  - Partition message/history tables by session + month to maintain performance.
- Background Jobs:
  - BullMQ + Redis (or pg-boss) for summarization, embedding refresh, schedule simulation.
- Data lifecycle:
  - TTL on raw messages; durable summaries; export/import tools for sessions/worlds.

### 6) Web Application

- Core Client Stack:
  - TanStack Query for server cache/state; error and loading boundaries.
  - TanStack Router (or keep hash routing) with feature-sliced structure.
  - Streaming UI for chat (SSE/WebSocket) with token-by-token rendering and tool-step panel.
- UI Foundation:
  - Unify on shadcn/ui + Tailwind; headless components for complex builders.
  - React Hook Form + Zod for all forms.
- Feature Areas:
  - Session Workspace (multi-step) with offline drafts; real-time validation against API.
  - World/Prefab editors for locations and NPC schedules with XYFlow enhancements.
  - In-app docs portal with searchable MDX, versioned with the prompt DSL.
- Accessibility and Mobile-first improvements; keyboard-driven builder flows.

### 7) Testing Strategy

- Unit tests for prompts, reducers, tool schemas, and adapters.
- Integration tests for `/turns` end-to-end with mock LLM and ephemeral DB.
- Contract tests (OpenAPI/ts-rest) to guarantee client-server compatibility.
- E2E tests with Playwright: session creation, a few turns, builder flows.
- Load tests for `/turns` streaming path and job queues.

### 8) Observability, Reliability, and Ops

- Logging: pino with request/response redaction; per-turn correlation IDs.
- Metrics: Prometheus/Otel exporters for latencies, token usage, error rates, cache hit ratio.
- Tracing: OpenTelemetry spans across Web → API → LLM → DB.
- Error reporting: Sentry with source maps and user/session breadcrumbs.
- Configuration: strict typed config with runtime validation; config diffs printed at boot.

### 9) Security and AuthZ

- JWT-based sessions with least-privilege resource scoping; API keys for automation.
- Rate limits and burst protection per user/session/IP.
- PII handling: explicit data retention windows; export/delete flows.
- Content policy enforcement at boundaries; audit logs in event store.

### 10) Developer Experience

- Keep Turborepo; enable remote cache; fine-grained pipelines per package.
- Pre-commit: secretlint, markdownlint, schema drift checks, OpenAPI/contract sync.
- CLI: `rpg dev`, `rpg turn --prompt "..."`, `rpg export/import`, `rpg seed`.
- GitHub Actions: preview environments, contract verification, size/tokens budgets gating.

---

## Suggested Package-Level Changes

- `@minimal-rpg/utils/llm`: replace OpenRouter-only wrappers with provider interface:
  - `generate`, `stream`, `tools`, `structured<T>()`, `embed` with common telemetry + retries.
- `@minimal-rpg/governor`:
  - Convert to agent-graph runner; emit domain events; accept a `ToolRegistry` and `Policy`.
  - Optional event-sourced state reducers; retain JSON Patch for external API compatibility.
- `@minimal-rpg/api`:
  - Split routes into read/write modules; add `SSE /turns/stream`; add idempotency; add rate limits.
  - Adopt OpenAPI/ts-rest; generate client for Web; add pino + otel middleware.
- `@minimal-rpg/web`:
  - Introduce TanStack Query; streaming chat UI; error boundaries; shared API client from contract.
  - Feature-slice folders: `features/chat`, `features/session`, `features/builders`, `features/docs`.
- `@minimal-rpg/db`:
  - Add Kysely/Drizzle; job queue (BullMQ/pg-boss); partitioning and indexes; embeddings maintenance tasks.

---

## Migration Plan (Phased)

1. Foundations (Weeks 1–2)
- Add typed config and logger; introduce provider-agnostic LLM interface behind feature flag.
- Add OpenAPI/ts-rest contract describing current API; generate client for Web.

2. Streaming + Contracts (Weeks 3–4)
- Implement `/turns` SSE streaming path; wire Web streaming UI; keep legacy endpoint.
- Add pino + OpenTelemetry; dashboards for latency/tokens/errors.

3. Tooling and Policies (Weeks 5–6)
- Introduce typed `ToolRegistry`; migrate existing governor tool calls to JSON Schema.
- Add per-session token budgets with graceful fallback.

4. Agent Graph (Weeks 7–8)
- Implement agent graph executor; convert NPC/Sensory into nodes; maintain parity with current behavior.
- Add deterministic test harness; convert integration tests to use mock LLM.

5. Persistence and Jobs (Weeks 9–10)
- Adopt Kysely/Drizzle in a thin slice; add background jobs for summarization and schedule simulation.
- Partition large tables; add indexes; ship data lifecycle policies.

6. Builders and Docs (Weeks 11–12)
- Feature-slice Web; replace ad-hoc fetching with generated client + TanStack Query.
- Add in-app docs v2 and prompt DSL browser.

Each phase is deployable and minimizes breaking changes; maintain compatibility shims for one release cycle.

---

## Risks and Mitigations

- Streaming complexity: ship alongside buffered path; add tracing and replay logs.
- Provider differences: enforce strict structured output contracts and validate at runtime.
- Cost regressions: budgets, caches, and summarization; per-release cost SLOs.
- Scope creep: timebox phases; cut optional features (event sourcing, Ollama) if blocked.

---

## Recommended Libraries/Tools

- Contracts: zod, zod-to-openapi, ts-rest or tRPC.
- LLM: OpenAI SDK (v4), Anthropic SDK, Vercel AI SDK (for UI streaming), together.ai, Ollama.
- DB: Drizzle/Kysely, pgvector, BullMQ/pg-boss, Prisma (optional).
- Web: TanStack Query/Router, shadcn/ui, react-hook-form, Zustand (keep), MDX.
- Observability: pino, OpenTelemetry, Prometheus, Sentry, Grafana.

---

## Appendix: Quick Wins

- Add SSE streaming to `/turns` + Web chat.
- Introduce TanStack Query and contract-generated client in Web.
- Centralize LLM provider with usage/cost telemetry and retries.
- Add idempotency keys and rate limiting to write endpoints.
- Begin prompt DSL versioning and unit tests for system prompts.
