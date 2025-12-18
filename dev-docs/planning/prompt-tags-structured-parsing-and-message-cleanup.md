# Prompt Tags: Structured Parsing + Message Cleanup (Intro Thoughts)

Date: 2025-12-18

This document captures early ideas for improving prompt tag ergonomics and long-term data quality:

- Convert freeform tag prompt text into a structured, LLM-friendly representation.
- Keep session history clean by avoiding storage of prompt-tag boilerplate inside saved messages.

This is deliberately an exploratory design note. It is not an implementation plan.

## Background

Today, prompt tags are stored as user-supplied freeform text. At runtime, tag prompt text is appended into prompts (often as system-message context). That makes tags powerful but also:

- Hard to render consistently (tags vary wildly in style and specificity).
- Hard to validate (users can type anything).
- Likely to leak into long-term stored history if we are not intentional about what we persist.

## Goals

- Improve LLM readability and consistency of tag instructions.
- Preserve user flexibility: freeform tag text remains allowed.
- Ensure runtime-only prompt context does not pollute persisted message history.
- Support incremental rollout (fallback to raw text when structured parse is missing).

Non-goals (for now):

- Perfect semantic interpretation of arbitrary user text.
- Building a full policy engine.

## Proposed Idea: Store a Structured Representation of a Tag

Add optional structured fields to `prompt_tags` so each tag can be rendered in a consistent template.

### Proposed fields (conceptual)

- `prompt_text` (existing): raw user text
- `prompt_structured_json` (jsonb, nullable): normalized parse output
- `prompt_structured_version` (int): schema/prompt version
- `prompt_structured_status` (enum/text): `unparsed | parsed | error`
- `prompt_structured_error` (text, nullable)
- `prompt_structured_updated_at` (timestamp)

### Structured schema: "ParsedTag"

Store a small schema that is easy to render to LLM prompts.

Suggested shape:

- `title: string`
- `summary: string` (one short sentence)
- `priority: 'low' | 'medium' | 'high'` (optional)
- `rules`:
  - `do: string[]`
  - `dont: string[]`
- `style`:
  - `tone: string[]` (e.g. "noir", "whimsical")
  - `voice: string[]` (e.g. "first-person", "present tense")
  - `formatting: string[]` (e.g. "short lines", "no markdown")
- `constraints: string[]` (hard requirements)
- `examples`:
  - `positive: string[]`
  - `negative: string[]`
- `rawFallback: string` (optional, could be redundant with `prompt_text`)

Notes:

- Keep this schema conservative. The more fields we add, the harder it is to validate and render.
- We should validate `prompt_structured_json` with Zod on write.

## Parsing Strategy: Deterministic First, LLM Optional

Because users can type anything, the best approach is layered:

### Tier 1: Deterministic parsing (no model call)

A pure function can attempt to parse common structures:

- YAML frontmatter (`---` blocks)
- Section headings: "Do:", "Don't:", "Tone:", "Constraints:", "Examples:"
- Bullet list extraction

If parsing fails, fall back to `summary = ''`, `rules.do = []`, and keep `rawFallback = prompt_text`.

Benefits:

- Cheap, predictable, runs anywhere.
- Gives a baseline structure even without LLM usage.

### Tier 2: LLM-assisted parsing (async)

Optionally run an LLM job that converts `prompt_text` into `ParsedTag` JSON.

Guidelines:

- Run it asynchronously (do not block tag creation).
- Require strict JSON output validated by Zod.
- If validation fails, keep deterministic parse / fallback and mark status `error`.
- Store a `version` to support re-parsing as the schema/prompt improves.

### When to parse

- On create/update: store raw text immediately; mark `status = unparsed`; enqueue parse job.
- Background worker parses and updates structured fields.

If no job system exists yet, a temporary approach:

- An API endpoint `POST /tags/:id/parse` to trigger parsing.
- A periodic cron-like runner could later call it.

## Rendering Strategy: Stop Injecting Raw Text Directly

At runtime, always render tags using a renderer that prefers structured data:

- If `prompt_structured_status === 'parsed'`, render a consistent template.
- Else render a labeled raw fallback block.

Example rendering (conceptual):

- "Tag: <title>"
- "Summary: <summary>"
- "Do: ..."
- "Don't: ..."
- "Constraints: ..."

This produces stable, readable prompt context and avoids tags turning into walls of inconsistent prose.

## Activation Mode: "always" vs "manual"

Clarification of intent is needed.

Hypothesis:

- `activation_mode = always` means the binding is active by default whenever enabled.
- `activation_mode = manual` means the tag is not automatically active and must be explicitly toggled on during play.

In practice, for an MVP that aims to be production-like:

- We can treat `manual` as a future capability, but we should avoid hardcoding `always` everywhere.
- If a tag is bound to a session and `enabled = true`, it can be active regardless of `activation_mode`.
- The difference becomes relevant only when we implement in-session toggling.

Follow-up decision needed:

- Do we expect in-session toggling? If yes, we should design the DB and API for it now (even if the UI is later).

## Message Cleanup: Keep Historical Context Clean

We want to avoid storing prompt-tag instruction blocks inside message history.

### Desired outcome

- Persisted messages should contain only the user-visible content.
- Runtime-only prompt context (including prompt tags, system rules, tool instructions) should not be stored as chat history.

### Where prompt-tag content can leak

Common leak paths:

- If the system prompt is stored as a "message" row.
- If an assistant message is stored with included meta-instructions or citations that were intended only for the model.

### Proposed approach

1. Separate "prompt assembly" from "message persistence".
2. Ensure only these are saved:
   - user message text
   - assistant response text (the narrative/dialogue output)
3. Store runtime metadata separately if needed:
   - tag binding IDs used for the turn
   - tag versions/hash
   - routing info
   - model parameters

### Practical technique: response cleaning pipeline

Before saving assistant output:

- Strip any internal sections that were intended for the model (e.g. "Session Tag Instructions:").
- Prefer a model-output schema that avoids including those blocks at all.

Best practice:

- Do not rely only on post-hoc stripping.
- Instead, structure the generation so the model never emits prompt-tag blocks into the response.

## Open Questions

- Do we want tags to be "visible" to players (like modifiers) or purely internal? That affects persistence and UI.
- How strict should structured parsing be? (More strict means safer prompts, but less flexible.)
- Do we want a local-only deterministic parser to be considered the canonical representation, with the LLM parser as an enhancement?
- How do we handle tag edits mid-session (re-parse, versioning, historical replay)?

## Next Document

See `dev-docs/planning/prompt-tags-per-turn-routing-mvp.md` for the concrete routing plan for per-turn application of tag instructions.
