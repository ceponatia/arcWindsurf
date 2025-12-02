# Prompting Conventions

This document describes the current prompting conventions used by Minimal RPG. It is grounded in the existing code and JSON prompt configuration under `packages/api/src/llm/prompts`, and should be treated as the single source of truth for how we talk to the LLM.

Where something is not yet implemented or is still in flux, it is called out explicitly or moved to the TBD section at the end.

## 1. High‑Level Goals

- Keep prompts **schema‑driven**: core rules come from JSON files validated by Zod (`SystemPromptSchema`, `SafetyRulesSchema`, `SafetyModeSchema`).
- Make prompts **deterministic and inspectable**: all system content is assembled in TypeScript from profiles, tags, and conversation history.
- Ensure **safety by default**: sensitive user inputs trigger a safety mode that changes the system guidance before any user content is sent.
- Support **genre‑specific behavior** via setting tags (e.g. `romance`, `adventure`, `mystery`) without duplicating shared base rules.

The main entry point is `buildPrompt` in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts).

## 2. Message Role Conventions

We use OpenAI‑style chat messages with roles:

- `system` — all instructions, guardrails, world/setup context, and history summary.
- `user` — direct player text input.
- `assistant` — model narration / game response from previous turns.

`buildPrompt` always returns an array of messages in this order:

1. One or more `system` messages (rules, character, setting, history summary, safety mode messages).
2. The recent conversation window as a sequence of `user`/`assistant` (and any `system`) messages from the DB.

The caller must send this array as‑is to the model provider; re‑ordering or stripping `system` messages will break guarantees described here.

## 3. System Prompt Structure

System messages are built from a combination of JSON configs and serialized profiles.

### 3.1 Base Rules JSON

- Source: `packages/api/src/llm/prompts/system-prompt.json`.
- Validated by `SystemPromptSchema` at startup via `assertPromptConfigValid`.
- We extract a flat `rules: string[]` from this file and join them into a single `system` message (`BASE_RULES`).
- These rules are **global** and should not depend on specific characters, settings, or genres.

When adding or changing rules:

- Update `system-prompt.json` and ensure it passes `SystemPromptSchema`.
- Keep each rule as a short, directive sentence; the builder simply joins them with spaces.

### 3.2 Tag‑Specific System Prompts

- Source JSONs:
  - `system-prompt-romance.json`
  - `system-prompt-adventure.json`
  - `system-prompt-mystery.json`
- Keyed by `SettingTag` values in `TAG_RULES_BY_TAG` in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts).
- For the active `SettingProfile`, we look at `setting.tags` and append _unique_ rules for each tag.

Conventions:

- Tag‑specific rules should **only** express genre/style deltas (tone, pacing, content boundaries) relative to the base rules.
- If multiple tags share the same rule string we de‑duplicate via a `Set`.
- If a new tag is introduced at the schema level, you must:
  - Extend `TAG_RULES_BY_TAG` to include rules for that tag (or intentionally leave it `undefined`).
  - Add/update a corresponding JSON prompt file if needed.

### 3.3 Character System Block

We serialize `CharacterProfile` into a compact, human‑readable block:

- Name and (optional) age.
- Summary and backstory (truncated to avoid overlong context).
- Personality traits or description.
- A **minimal appearance slice** (string or structured representation from `AppearanceSchema`) focused on stable, high‑value attributes such as hair color/style, eye color, height, build, and 2–3 key features.
- Speaking style and optional tags.
- Optional `scent` hints and `style` sliders (sentence length, humor, darkness, pacing, formality, verbosity).

Conventions:

- The serialized block is emitted as a single `system` message.
- Truncation limits are conservative (e.g., 1200 characters for backstory) to keep room for history and any retrieval‑driven context blocks.
- When extending `CharacterProfile`, prefer to add new fields to the serializer rather than embedding raw JSON.
- Detailed and highly granular appearance or outfit information (for example, specific scars, jewelry, or footwear) should **not** be stuffed into the always‑on block; instead, it should live in structured `profile_json` / item data and surface via RAG‑style context blocks when specifically relevant to the current turn.

### 3.4 Setting System Block

We serialize `SettingProfile` into another `system` message containing:

- Setting name.
- Lore (truncated).
- Themes and tags, if present.

As with characters, any new fields added to `SettingProfile` should be integrated into `serializeSetting` if they materially affect narrative.

### 3.5 History Summary Block

Older turns are summarized into a single `system` message labelled:

> `Context Summary (older turns):\n...`

See section 4 for the history window and summarization behavior.

### 3.6 Safety Mode Blocks

Safety mode uses `safety-mode.json` validated by `SafetyModeSchema` and may add up to two `system` messages when triggered:

- A `safetyModeMessage` that reinforces high‑level safety behavior.
- A `sensitiveNote` that reminds the model how to handle sensitive topics.

These are appended **after** all other system blocks so they can override or nuance earlier instructions.

## 4. Conversation History and Summarization

We treat conversation history in two layers:

1. **Recent window (verbatim)** — a fixed number of the newest messages.
2. **Older turns (summarized)** — compressed into a single `system` message.

Current defaults in `buildPrompt`:

- `historyWindow`: 10 (can be overridden by caller).
- `summaryMaxChars`: 16,000 (can be overridden by caller).

Behavior:

- We keep the last `historyWindow` messages verbatim, preserving their roles and content.
- Everything older than that goes through `summarizeHistory`, which:
  - Iterates over older messages in reverse (most recent first) to prioritize more recent context.
  - Normalizes whitespace in content.
  - Truncates each summary line to ~500 characters.
  - Stops when the concatenated summary would exceed `summaryMaxChars`.
  - Labels each line with a prefix based on role: `User`, `Narration` (assistant), or `System`.

Caller responsibilities:

- Provide a complete ordered history of `DbMessage` entries for the session.
- Use a consistent semantic for `assistant` messages (they should contain the narrative that the player sees).

## 5. Safety and Content Filtering

Before building system messages, we run a simple text filter over the **latest user message**:

- We look for a small set of hard‑coded banned patterns (e.g. `child abuse`, `sexual violence`, `extreme gore`, `hate speech`).
- If any pattern matches (case‑insensitive), we:
  - Log a warning to the server console.
  - Mark the request as `flagged` and attach two extra safety `system` messages from `safety-mode.json`.

Conventions:

- This filter is intentionally conservative and should be treated as a first line of defence only.
- Safety prompts should **guide the model to de‑escalate and redirect** rather than simply refusing.
- Changes to the banned phrase list should be reviewed for false positives/negatives.

Note: `SafetyRulesSchema` and `safety-rules.json` exist but are not currently wired into `buildPrompt`. See TBD section.

## 6. Tag and Genre Conventions

`SettingProfile.tags` and the `SettingTag` union drive which genre‑specific rules are applied.

Guidelines for using tags:

- Prefer a **small, composable set** of tags whose semantics are stable over time.
- Each tag should map to a curated ruleset in its JSON file.
- Avoid overlapping or contradictory rules across tags whenever possible.

When introducing a new tag:

- Update the shared schema in `@minimal-rpg/schemas`.
- Add an entry in `TAG_RULES_BY_TAG` in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts).
- Create or extend a corresponding JSON system‑prompt file.
- Document the narrative intent of the tag in [dev-docs/04-settings-schema.md](dev-docs/04-settings-schema.md) or related docs.

## 7. Building Prompts from Profiles, Retrieval, and History

At a high level, `buildPrompt` is responsible for:

1. Validating prompt JSON via `assertPromptConfigValid` during startup/test.
2. Serializing the active character and setting into compact **core** system messages.
3. (Planned) Injecting optional retrieval‑driven context blocks such as `Knowledge Context` and `Item Context`, built from knowledge nodes and outfit data for the active character/setting. These blocks are **turn‑local** and only include attributes that score as relevant to the latest user message (for example, legs/feet appearance and equipped boots when the player examines a character).
4. Computing the history summary and recent window.
5. Appending safety mode messages when needed.
6. Returning a fully ordered message list ready to send to the LLM.

Caller requirements (API/governor):

- Provide a `BuildPromptOptions` object that includes:
  - `character: CharacterProfile`.
  - `setting: SettingProfile`.
  - `history: DbMessage[]` for the session.
  - Optional overrides for `historyWindow` and `summaryMaxChars`.
- Do **not** append additional system prompts on the client; all system‑level control should live on the server.

## 8. Testing and Validation

- The prompt config JSON files are validated by `assertPromptConfigValid` at server startup or during tests; failures are fatal.
- Profile JSON data is validated elsewhere using Zod schemas from `@minimal-rpg/schemas` before being passed to `buildPrompt`.
- Prompt behavior should be tested via:
  - Unit tests around `serializeCharacter`, `serializeSetting`, and `summarizeHistory` (TBD).
  - End‑to‑end tests that call the API route using a fixed seed session and inspect assembled messages (TBD).

## 9. Relationship to Other Dev Docs

This document focuses on **prompt structure and conventions**, not higher‑level orchestration.

For how prompts are used within a turn, see:

- Governor and orchestration: [dev-docs/11-governor-and-agents.md](dev-docs/11-governor-and-agents.md).
- Agent I/O contracts: [dev-docs/13-agent-io-contracts.md](dev-docs/13-agent-io-contracts.md).
- Character and setting authoring guidance: [dev-docs/02-character-schema.md](dev-docs/02-character-schema.md), [dev-docs/04-settings-schema.md](dev-docs/04-settings-schema.md).

Future docs [15-character-and-setting-prompts.md](dev-docs/15-character-and-setting-prompts.md) and [16-rag-context-injection.md](dev-docs/16-rag-context-injection.md) are intended to build on this foundation with authoring guidelines and retrieval‑focused patterns.

## 10. TBD / Open Questions

The following aspects are not yet implemented or not fully decided. They should be updated here once the codebase evolves.

- **Safety rules integration**
  - `safety-rules.json` and `SafetyRulesSchema` are validated but not currently used in `buildPrompt`.
  - Open question: do we want a persistent safety rules `system` message in addition to the safety‑mode messages?

- **Multi‑agent / governor‑level prompts**
  - How the Governor will structure separate prompts for specialized agents versus a single monolithic prompt.
  - Whether we introduce per‑agent system prompts with their own JSON configs.

- **RAG / context injection**
  - The exact format for injecting retrieved knowledge nodes into `system` or `assistant` messages.
  - How to keep RAG context bounded while coexisting with summaries and profile blocks.

- **Token budgeting and dynamic windows**
  - Currently `historyWindow` and `summaryMaxChars` are simple numeric knobs.
  - We may want a token‑aware budgeting strategy per model (e.g., smaller windows for cheaper models, larger for premium ones).

- **Streaming and tool usage**
  - Whether we will rely on tool calling / structured outputs and how that changes prompt shape.
  - Any conventions for embedding tool schemas or JSON contracts into `system` messages.

- **Localization and style variants**
  - How to represent language/locale preferences (player or character) in prompts.
  - Whether we rely solely on character `style` or add explicit system‑level style toggles.
