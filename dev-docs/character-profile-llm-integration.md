# Character Profile → LLM Integration

This document explains how character profile data flows from JSON definitions through Zod schemas into the runtime prompt builder (`packages/api/src/llm/prompt.ts`), and outlines enhancement paths—especially leveraging Retrieval Augmented Generation (RAG)—to reduce token footprint while preserving (and enriching) in-game immersion.

---

## 1. Source of Truth (Schemas)

Location: `packages/schemas/src/character/*`

Zod schemas compose a `CharacterProfile`:

- `basics.ts` → `CharacterBasicsSchema`: `id`, `name`, optional `age`, `summary`, `backstory`, optional `tags`.
- `personality.ts` → `CharacterPersonalitySchema`: `traits` (string or non-empty array), `speechStyle` (partial object of enumerated style facets: `sentenceLength`, `humor`, `darkness`, `pacing`, `formality`, `verbosity`).
- `appearance.ts` → `AppearanceSchema`: structured but optional granular fields (`hair`, `eyes.color`, `height`, `build`, `skinTone`, `features[]`, `description`). Can alternatively be a free-text string in the composite schema.
- `scent.ts` → `ScentSchema`: optional sensory flavor (`hairScent`, `bodyScent`, `perfume`).
- `index.ts` → `CharacterProfileSchema` extends basics with:
  - `personality` (string | string[])
  - `appearance` (string | `AppearanceSchema`, optional)
  - `scent` (optional)
  - `goals` (required non-empty string[])
  - `speakingStyle` (string – narrative free-form descriptor)
  - `style` (optional object: reuses `speechStyle` shape for enumerated conversational style hints)

Key observation: There is conceptual overlap between `speakingStyle` (free text), `style` (enumerated facets), and `personality`/`traits`. Today all are flattened into literal lines inside the prompt.

---

## 2. Prompt Construction Flow

Location: `packages/api/src/llm/prompt.ts`

Core functions:

1. `assertPromptConfigValid()` – validates JSON prompt config files (`system-prompt.json`, `safety-rules.json`, `safety-mode.json`).
2. `serializeCharacter(character)` – converts the full profile into newline-delimited textual blocks:
   - Always includes: `Character`, optional `Age`, `Summary`, truncated `Backstory` (≤1200 chars), `Personality` (joined traits or raw string), optional `Appearance` (structured decomposition via `serializeAppearance` with truncations), `Goals`, `Speaking Style`, optional `Tags`, optional scent hints via `serializeScent`, optional `Style Hints` derived from `style` key/value pairs.
   - Truncation helper `truncate(text, max)` preserves length budgets with ellipsis.
3. `serializeAppearance(a)` – normalizes union form, compresses hair, eyes, height, build, features, description.
4. `serializeSetting(setting)` – similar pattern for the environment.
5. `summarizeHistory(messages, keepLast, maxChars)` – produces an "older turns" lightweight context summary (first N–window messages, truncated per line) if total exceeds window.
6. `simpleContentFilter(latestUserText)` – pattern-based sensitive content detection; may inject safety-mode messages.
7. `buildPrompt(opts)` – assembles final ordered messages:
   - System messages: concatenated base rules, safety rules, serialized character, serialized setting, optional summary, conditional safety mode messages.
   - Conversation window: last `historyWindow` messages (default 10). Older messages may be represented by summary.

Important current behavior:

- Full character profile is re-sent on every turn as a single system message (no differential / caching).
- All style facets & traits are materialized whether or not relevant to the immediate user request.
- Backstory substring truncation is static; no semantic selection.
- Personality can appear twice conceptually (raw traits vs enumerated style), increasing redundancy.

---

## 3. Current Strengths & Limitations

**Strengths:**

- Deterministic, simple, easy to reason about.
- Fail-fast schema validation guarantees prompt consistency.
- Backstory truncation and history summarization impose upper bounds on token growth.

**Limitations / Costs:**

- Token inefficiency: full profile every turn even if unchanged.
- Redundancy: overlapping style/personality constructs can inflate context.
- No situational filtering: appearance/scent always included even if irrelevant.
- Lack of semantic retrieval: backstory truncated arbitrarily by length instead of relevance.
- Limited safety handling: binary pattern filter; lacks graded contextual redaction.

---

## 4. Enhancement Paths (Progressive Roadmap)

### A. Low-Effort / Short-Term (Days)

1. **Cache Static System Segments**: Send immutable rule + character + setting blocks only in the first turn of a session; later turns include a reference token (e.g., `CharacterRef:<id>`). (Requires model instructions to treat references as implicit.)
2. **Segmented Serialization Modes**: Add `buildCharacterContext(character, mode)` where modes: `full`, `brief`, `goalsOnly`, `styleOnly`, `appearanceOnDemand`.
3. **Conditional Field Emission**: Emit appearance/scent only if recent user message contains related lexical triggers (hair, smell, look, etc.).
4. **Normalize Personality**: Convert single-string personality into array of atomic traits early; avoid ambiguous free text.
5. **Dynamic History Window**: Scale `historyWindow` by average message length (character count) to optimize token usage.

### B. Medium-Term (Weeks)

1. **Weighted Trait Prioritization**: Introduce per-trait importance weights (e.g., core identity vs flavor) stored in DB; high-weight traits prefer inclusion when budget tight.
2. **Hierarchical Backstory Chunking**: Preprocess backstory into outline + paragraphs; include outline always, retrieve specific paragraphs only when semantically relevant.
3. **Adaptive Style Injection**: Include `Style Hints` only every N turns or when user asks about tone / narration.
4. **Per-Session Overrides Delta Prompting**: On each turn, inject only changed overrides rather than re-merged whole profile.
5. **Safety Filter Upgrade**: Replace regex with classification (embedding similarity or a lightweight moderation model) enabling graded responses.

### C. RAG Integration (Strategic)

Objective: Provide rich, queryable character depth without bloating the prompt.

**Data Model Additions (Prisma / DB):**

- `CharacterTraitDocument`: `{ id, characterId, type, text, embedding(vector), weight, tags[] }`
  - `type` examples: `summary`, `backstory.paragraph`, `goal`, `appearance.feature`, `personality.trait`, `style.facet`.
- Optional `CharacterMemoryEvent`: dynamic runtime facts learned during session.

**Ingestion Pipeline:**

1. Script parses `CharacterProfile` into atomic documents (split backstory paragraphs, goals, traits, appearance features).
2. Generate embeddings (OpenRouter or local provider) per document; store vectors.
3. Index in pgvector / external vector DB.

**Prompt Build (RAG Mode):**

1. Embed last user message + running session intent summary.
2. Query top-K (e.g., 8–12) trait documents by cosine similarity.
3. Assemble minimal context block: `Character Core Summary + Retrieved Trait Snippets + Goals (always) + Active Overrides Delta`.
4. Provide an instruction: "Additional character detail retrievable via tool call `getCharacterTraits(types|query)`" (future function-calling extension).
5. Fallback: If retrieval returns < threshold results (cold start), send a `brief` variant of full profile.

**Optional Enhancements:**

- **Relevance Filters**: Post-process retrieval to ensure diversity across trait types (avoid all backstory paragraphs).
- **Time-Decayed Memory**: Weight `CharacterMemoryEvent` by recency and relevance; include ephemeral memories adaptively.
- **Scene-Aware Retrieval**: Combine setting context + user query embeddings to select appearance or sensory traits when scene demands.

### D. Long-Term / Advanced

1. **Interactive Trait Expansion**: LLM can ask for deep detail (e.g., `backstory:childhood`) via structured tool responses rather than pre-emptive inclusion.
2. **Trait Mutation & Canon Tracking**: When model improvises new facts, store provisional entries flagged for human approval.
3. **Multi-Character Sessions**: Retrieval conditioned on active speaker(s); inject only relevant character traits per turn.
4. **Narrative Arc Manager**: Higher-level RAG layer for plot beats, enabling consistency and foreshadowing.

---

## 5. Proposed API / Code Changes

Create new utilities in `packages/api/src/llm/`:

- `characterContext.ts`:
  - `enum CharacterContextMode { Full, Brief, GoalsOnly, Rag }`
  - `buildCharacterContext(character, mode, opts)` returns lines + metadata (token estimate).
- `ragRetriever.ts`:
  - `retrieveCharacterTraits(characterId, embedding, k, diversify)` returns trait snippets.
- Modify `buildPrompt` to accept `promptProfileMode` and RAG parameters.

**Prisma Schema Additions (illustrative):**

```prisma
model CharacterTraitDocument {
  id            String   @id @default(cuid())
  characterId   String
  type          String
  text          String
  weight        Int      @default(1)
  tags          String[]
  embedding     Bytes    // pgvector or serialized
  createdAt     DateTime @default(now())
  @@index([characterId])
  @@index([type])
}

model CharacterMemoryEvent {
  id          String   @id @default(cuid())
  sessionId   String
  characterId String
  text        String
  relevance   Int      @default(1)
  embedding   Bytes
  createdAt   DateTime @default(now())
  @@index([sessionId])
}
```

---

## 6. Migration Strategy (Incremental)

1. Phase 0 (Instrumentation): Add token accounting logs measuring current prompt size per turn.
2. Phase 1 (Caching): Stop resending static system messages after first turn; measure savings.
3. Phase 2 (Selective Emission): Implement lexical triggers for appearance/scent, style interval injection.
4. Phase 3 (RAG Foundation): Build ingestion + trait document table; run one-off backfill.
5. Phase 4 (Hybrid Prompt): Switch `buildPrompt` to `mode=Rag` behind feature flag; compare average tokens vs baseline.
6. Phase 5 (Tooling / Expansion): Introduce function-calling interface for on-demand trait deep dives.
7. Phase 6 (Dynamic Memories): Capture emergent facts, add retrieval ranking rules.

Rollback Safety: Each phase guarded by env flags (`PROMPT_MODE`, `ENABLE_RAG_TRAITS`, `ENABLE_DYNAMIC_MEMORIES`). Keep previous behavior accessible.

---

## 7. Risks & Mitigations

- Retrieval Drift: Irrelevant traits may appear → diversify + minimum per type.
- Lost Flavor: Over-pruning reduces immersion → retain a brief flavor scaffold (name, summary, 2 personality traits, 1 style hint).
- Embedding Latency: Add async prefetch (pre-embed user message concurrently with model call pipeline) or batch retrieval.
- Schema Evolution: Keep raw profile JSON canonical; trait documents derived—regenerate on schema changes.

---

## 8. Measuring Success

Metrics to collect:

- Avg tokens per turn (before vs after each phase).
- Response latency changes.
- User qualitative ratings of character consistency.
- Frequency of LLM requests for detail (if tool interface added).
- Drift incidents (improvised facts conflicting with profile).

---

## 9. Quick Reference (Current vs Target)

| Aspect              | Current              | Target (RAG Mode)                         |
| ------------------- | -------------------- | ----------------------------------------- |
| Character Injection | Full text every turn | Brief scaffold + retrieved trait snippets |
| Backstory           | Fixed truncation     | Semantic paragraph selection              |
| Personality/Style   | All facets always    | Weighted + conditional / periodic         |
| Appearance/Scent    | Always included      | Trigger-based / scene-aware               |
| Memory              | None                 | Dynamic episodic events with decay        |
| Safety              | Regex filter         | Classification + graded redaction         |

---

## 10. Immediate Next Coding Steps (If Starting Now)

1. Add `promptProfileMode` param to `buildPrompt` (default `full`).
2. Implement caching of static system messages (store in session state; skip resend).
3. Refactor `serializeCharacter` to return structured object + `toLines()` for selective emission.
4. Add lexical trigger map (appearance/scent keywords) for conditional field inclusion.
5. Instrument token counts (`approxTokens = Math.ceil(charCount/4)`).

---

## 11. Summary

The current pipeline is accurate but verbose. By introducing mode-based serialization, selective emission, and a RAG layer for semantically relevant trait retrieval, we can dramatically reduce token usage while increasing character fidelity and dynamic richness. This staged approach minimizes risk and preserves the existing stable schema as a canonical source.

See `packages/api/src/llm/prompt.ts` for the existing implementation starting point.
