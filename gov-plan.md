# Governor + LLM Intent Integration Plan (First Pass)

This document outlines a minimal, testable first-pass integration between the Governor and DeepSeek via OpenRouter, using a single API key and focusing on LLM-based intent detection plus governor-side aggregation. Future agents (navigation, NPCs, etc.) will build on this foundation.

1. Goals
   Reuse the existing OpenRouter/DeepSeek API key for:
   An LLM-based IntentDetector.
   (Later) additional agents.
   Keep the LLM surface area small and explicit:
   Intent detector sees current prompt + small history snapshot.
   Future agents see only their relevant state slices.
   Add a governor_dev_mode flag so we can see:
   Raw/parsed intent detector output.
   Future agent outputs.
   In normal mode, only show the Governor’s final message in the chat UI.
2. Components

LlmIntentDetector (new)

Implements the existing IntentDetector interface from types.ts.
Uses generateWithOpenRouter + DeepSeek to classify player input into DetectedIntent.
Prompt:
system: “You are an intent classifier for a text-based RPG… Output JSON with fields { type, confidence, params } matching this schema: …”.
user: current player message + minimal history (1–3 last turns) + tiny context summary (location name, visible NPCs/items if available).
Returns DetectedIntent (IntentType union already defined).
Governor (existing governor.ts)

Configuration:
Accepts intentDetector in GovernorConfig.
Gains options.devMode?: boolean (or piggybacks on an existing options struct/env).
Behavior (first pass):
Phase 1: Call LlmIntentDetector.detect(...).
Phases 2–7:
Keep current scaffold for state recall, context build, etc.
Skip real agent routing for now (or run an empty registry).
Generate a simple, deterministic narrative based on DetectedIntent and system/tag prompts.
When devMode:
Include DetectedIntent and any LLM raw/parsed payloads in TurnResult.metadata.
When devMode is false:
Only final message + normal events/minimal metadata.
Governor Dev Mode Flag

API:
Environment var GOVERNOR_DEV_MODE=true|false or config object on composition.
Fed into GovernorOptions.devMode.
Web:
Environment var VITE_GOVERNOR_DEV_MODE=true|false.
When true, chat UI shows an expandable “Debug” section per turn with:
Detected intent (JSON).
Raw LLM snippets where useful.
When false, hides all intermediate details. 3. Request/Response Flow (First Pass)

API route: POST /sessions/:id/turns

Already exists.
Builds TurnInput:
sessionId
playerInput (raw text)
minimal baseline (character + setting)
overrides = {}
conversationHistory (short window)
Calls governor.handleTurn(turnInput).
Governor.handleTurn

Phase 1: Intent Detection (LLM)
Calls intentDetector.detect(playerInput, context) → DeepSeek via OpenRouter.
Stores DetectedIntent in local variable.
Phase 2–3: State recall + context build
Uses StateManager + existing DefaultContextBuilder as today (minimal).
Phase 4–5: Agent routing + execution (first pass)
For now, either:
Run no agents and go to fallback narrative, or
Treat the detected intent as a pseudo-agent and craft a simple narrative branch:
look → “You look around…”
move → “You move toward…”
unknown → generic help text.
Phase 6–7: State update + response aggregation
No real patches at first; state update is a no-op.
TurnResult:
message: final narrative.
metadata.intent: the DetectedIntent.
metadata.agentOutputs: optional in dev mode.
Web UI

When dev mode flag is set:
Displays:
DetectedIntent (type, confidence, params).
Any raw JSON produced by the LLM intent detector (if we persist it).
Otherwise:
Displays only TurnResult.message. 4. Prompts and Context Windows

Intent Detector Prompt

System:
Role: “Intent classifier for a text-based RPG.”
Instructions:
Understand common natural-language actions (move, look, talk, use, wait, system/meta).
Output strict JSON: { "type": "...", "confidence": 0–1, "params": { ... }, "signals": [ ... ] }.
Map into the existing IntentType values (move, look, talk, use, take, give, examine, wait, system, unknown).
User:
Current player message.
Up to N recent turns (small N, e.g. 3).
Optional short context lines (location, key NPCs/items).
Future Agents (not implemented in first pass)

Will follow the same pattern:
Narrow system prompt per agent.
Minimal context slice (e.g., only map/location for navigation agent). 5. Configuration and Environment

API

Reuse existing OpenRouter config:
OPENROUTER_API_KEY
Default model (e.g., deepseek/deepseek-chat).
New (optional) env:
GOVERNOR_DEV_MODE=true|false → toggles extra metadata in TurnResult.
Web

New env:
VITE_GOVERNOR_DEV_MODE=true|false → toggles debug panel visibility.

## 6. Milestones

Milestone 1: LLM Intent Detector

Implement LlmIntentDetector in governor package using generateWithOpenRouter.
Wire into governor composition (API uses LLM when `OPENROUTER_API_KEY` is configured, otherwise falls back to a rule-based detector).
Log and surface DetectedIntent in TurnResult.metadata (dev mode only).

Status: **DONE** — implemented and wired via `createGovernorForRequest`, with dev-mode metadata exposed through the turns route and web debug UI.

Milestone 2: Governor Dev Mode + UI

Add governorDevMode flag to Governor options and API composition.
Wire flag through to web (VITE_GOVERNOR_DEV_MODE).
Show/hide debug information in chat panel based on flag.

Status: **DONE** — `GOVERNOR_DEV_MODE` and `VITE_GOVERNOR_DEV_MODE` are plumbed end-to-end; when both are true and `VITE_USE_TURNS_API=true`, the web client renders per-turn debug bubbles using metadata from the Governor.

Milestone 3: Simple Intent-Based Narratives

Replace current governor fallback with a minimal branching narrative based on DetectedIntent.type.
Still no real agents or patches; state remains unchanged.

Status: **DONE** — the Governor provides `generateIntentNarrative` fallbacks for common intent types (move, look, talk, use, etc.) when no agents handle the turn or intent confidence is low.

Milestone 4: First Real Agent

Introduce a simple LLM-backed or rule-based “Narrator” or “Navigation” agent.
Have the Governor route intent to that agent and treat its narrative as the main message.

Status: **TBD** — agent types and a registry exist in `@minimal-rpg/agents`, but the API’s Governor composition does not yet register or invoke any concrete agents.
