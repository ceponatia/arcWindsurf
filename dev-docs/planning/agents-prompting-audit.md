# Agents Prompting Audit (LLM Submission + Prompt Inventory)

## Scope

This report inventories prompt-related code in `packages/agents` and traces how prompts are submitted to the LLM at runtime.

Primary questions:

- Where does prompt text live?
- What information is included in each prompt and why?
- What is redundant or unused?
- Where does action-based prompt injection happen?

## Runtime LLM Submission (Call Path)

At runtime, only two agents in `packages/agents` submit prompts to an LLM:

- NPC dialogue: `NpcAgent`
- (Potentially) sensory narration: `SensoryAgent` (but see the “Unused prompt code” section)

High-level flow:

```text
Governor (packages/api) builds AgentInput
  -> constructs an LlmProvider for agents
  -> calls agent.execute(input)

NpcAgent.execute(input)
  -> chooses system prompt (enhanced or basic)
  -> builds a user prompt
  -> llmProvider.generate(userPrompt, { systemPrompt, temperature, maxTokens })

SensoryAgent.execute(input)
  -> currently returns structured sensoryContext for NPC use (no LLM)
  -> contains legacy/alternate LLM prompt paths (currently not invoked)
```

The agent-level interface is defined in `packages/agents` as:

- `LlmProvider.generate(prompt, { systemPrompt?, temperature?, maxTokens? })`

The concrete provider implementation currently lives outside this package (in `packages/api`), and converts:

- optional `systemPrompt` into a system message
- `prompt` into a user message

## Per-file Inventory (Prompt Sources)

### packages/agents/src/core/config.ts

What it contains:

- `LlmProvider` interface and the `systemPrompt` option (`LlmGenerateOptions.systemPrompt`).

How it is used:

- `NpcAgent` passes a large system prompt via `systemPrompt`.
- `SensoryAgent` has multiple system prompt builders for smell/touch/combined sensory (but those code paths are currently not called by `process()`).

Prompt optimization notes:

- This API shape encourages “big string system prompt + small user prompt”. That matches current NPC design.

### packages/agents/src/core/base.ts

What it contains:

- `BaseAgent.buildBasePrompt(input)`: a generic user prompt builder composed of:
  - `Player: ...`
  - `Relevant context:` (knowledgeContext items)
  - `Recent conversation:` (last 5 conversation turns)

How it is used:

- Not used by `NpcAgent` or `SensoryAgent` today.

Optimization notes:

- This is a candidate for either deletion (if no agents use it) or adoption as a shared, minimal user prompt baseline.
- It currently duplicates prompt responsibilities that `NpcAgent` implements differently (and more specifically).

### packages/agents/src/npc/npc-agent.ts

What it contains:

- The runtime LLM call site for NPC dialogue.

How it is used:

- Chooses system prompt:
  - `buildEnhancedSystemPrompt(...)` when `actionSequence.completedActions.length > 0`
  - else `buildDialogueSystemPrompt(...)`
- Builds user prompt via `buildDialogueUserPrompt(...)`
- Submits: `llmProvider.generate(userPrompt, { systemPrompt, temperature, maxTokens })`
- Records prompt debug in diagnostics (`system`, `user`, `response`).

Optimization notes:

- This is where prompt length/temperature/max token defaults are enforced. Current defaults bias toward richer responses in LLM mode (`maxTokens: 800`).

### packages/agents/src/npc/prompts.ts

What it contains (prompt content after refactor):

1. **Shared formatting contract** (`buildFormattingContract` + `buildDialogueSystemPrompt`)

- Single reusable block sets POV/quoting/length rules; removed repeated wording.
- Character grounding stays the same (backstory, traits, goals, personality map), but uses compact bullets.
- Player persona now lists only present fields (name/age/gender/summary/appearance) as bullets and reminds this is about the user.
- Knowledge, affinity, and NPC context stay, just shorter wording.
- Intent handling is slimmer: compound segments get short labels; narrate intents get brief one-liners.

2. **Sensory context (conditional, shorter)**

- Only prints if any sensory data or hints exist.
- Groups senses under short headers (Smell/Touch/Taste/Sound/Sight) and keeps the “don’t invent details” rule.
- When `recentSensoryAction` is set, gives a short three-line rule: start with second-person sensory, then third-person NPC reaction, no invented details.

3. **Enhanced system prompt** (`buildEnhancedSystemPrompt`)

- Still layers action sequence and per-action sensory info on top of the dialogue prompt.
- Response guidelines unchanged in spirit (cover actions in order, weave sensory, handle interruptions) but benefit from the shorter base contract.

4. **User prompt** (`buildDialogueUserPrompt`)

- Still shows the last 3 turns, labels compound segments, and rephrases narrate intents; unchanged behavior, concise text.

How it is used:

- `NpcAgent` continues to call these builders in LLM mode; outputs are a bit shorter without losing grounding or safety rules.

What changed in plain language:

- The “rules of the road” (POV, quotes, length) now live in one shared block instead of being repeated, cutting tokens.
- Persona, intent, and sensory sections only show up when there is data and are written as short bullets.
- Sensory mode instructions are shorter but still force second-person sensory first when a sensory action just happened.

### packages/agents/src/npc/affinity.ts

What it contains:

- Extractor for affinity context from `input.stateSlices`.
- Disposition guidance strings (hostile/unfriendly/neutral/friendly/close/devoted).

How it is used:

- `npc/prompts.ts` calls `extractAffinityContext()` and injects:
  - `formatAffinityPrompt(affinityContext)` output
  - disposition label and guidance

Optimization notes:

- The guidance is short and probably high value; it’s good “behavior shaping” per token.

### packages/agents/src/npc/context.ts

What it contains:

- Extractor for `npcContext` from `input.stateSlices`.

How it is used:

- `npc/prompts.ts` injects the extracted context into the system prompt via `appendNpcContext()`.

Optimization notes:

- This is a clean separation: prompt code only depends on a typed slice.

### packages/agents/src/npc/formatting.ts

What it contains:

- Post-processing to strip name prefixes the model might add.
- Helpers for:
  - choosing top knowledge items for template (non-LLM mode)
  - generating fallback dialogue
  - segment label mapping used by `buildDialogueUserPrompt()`

How it is used:

- `NpcAgent` applies `formatDialogueResponse()` to the LLM output.
- `npc/prompts.ts` uses `getSegmentLabel()` for user prompt formatting.

Optimization notes:

- Output cleaning is good defensive prompting hygiene: it compensates for common model failures.

### packages/agents/src/sensory/sensory-agent.ts

What it contains (prompt content):

This file contains two distinct designs:

1. **Current active design (structured output, no LLM prompting)**

- `process()` currently routes sensory input to `buildStructuredSensoryContext()`.
- That method:
  - reads sensory attributes from `stateSlices` (body map)
  - returns `sensoryContext` as structured data (`SensoryContextForNpc`)
  - returns an empty `narrative` string

2. **Inactive/legacy design (LLM narrative generation prompts)**

- Several methods build and submit system/user prompts:
  - `generateCombinedSensoryNarrative()` uses a large system prompt including “CRITICAL POV RULES” and “ONLY use data above” constraints.
  - `generateLlmSmellNarrative()` uses a smell-focused system prompt and user prompt.
  - `generateLlmTouchNarrative()` uses a touch-focused system prompt and user prompt.
  - Inference prompts (`inferSmellFromContext`, `inferTouchFromContext`) allow generation with no explicit sensory data.

How it is used today:

- The LLM prompt paths in this file are not invoked by the current `process()` implementation.
  - `process()` does not call `handleCombinedSensory`, `handleSensoryIntent`, `handleSmell`, or `handleTouch`.
  - Result: the large set of sensory system prompts exists in code but is effectively unused in the current flow.

Optimization notes:

- This is the biggest “prompt text not being used” finding in `packages/agents`.
- Recommendation: pick one design and remove/relocate the other:
  - If structured sensory context is the intended design: move the legacy prompting methods into a separate module (or delete) to reduce maintenance surface.
  - If LLM sensory narration is still desired: wire `process()` to call the LLM paths behind a config flag (and ensure the NPC prompt doesn’t double-impose competing POV rules).

### packages/agents/src/sensory/README.md

What it contains:

- Documentation that includes an older mental model:
  - “Generate narrative using template or LLM”
  - “With LLM Provider” and “With Inference” sections
  - sample outputs that imply `SensoryAgent` returns prose

How it is used:

- Docs only (not runtime).

Optimization notes:

- The README is now out of sync with the current structured-output implementation.
- This is a human-facing source of “prompt policy”, but not actually applied in code.

## Redundancy + Unused Prompt Information

### Unused prompt code (high confidence)

- `BaseAgent.buildBasePrompt()` is not used by current LLM agents.
- Large portions of `SensoryAgent` prompt generation are not reachable from current `process()`.
- `packages/agents/src/sensory/README.md` describes an LLM narrative design that is not how `process()` behaves.

### Redundant POV / formatting rules

- `NpcAgent` system prompt contains detailed POV rules, plus a special “second-person sensory narration required” mode.
- `SensoryAgent` (legacy prompting path) also contains detailed POV rules for sensory narration.

If you keep structured sensory output, the NPC agent should be the single source of POV rules (recommended).
If you re-enable sensory LLM prose, ensure only one layer sets POV rules to avoid contradictory instructions.

### Action-based prompt injection

- Action sequencing itself originates outside `packages/agents` (Governor builds `AgentInput.actionSequence` and `AgentInput.accumulatedContext`).
- `NpcAgent` is where that data becomes prompt text (`buildEnhancedSystemPrompt`).

This split is good: the Governor owns the simulation data; the NPC agent owns how it is narrated.

## Suggested Next Refactors (Optional)

1. Decide the SensoryAgent contract

- Option A (recommended): SensoryAgent only produces structured `sensoryContext` and never calls an LLM.
  - Delete or extract the legacy prompt-generation methods.
  - Update the README to match reality.
- Option B: SensoryAgent can produce prose when requested.
  - Add a config flag and wire `process()` accordingly.
  - Avoid duplicating POV rules with `NpcAgent`.

2. Consolidate shared prompt “boilerplate”

- Either remove `BaseAgent.buildBasePrompt()` or adopt it as the shared baseline for user prompts.
  - If adopted: keep it minimal (player input + conversation turns), and let each agent add domain-specific sections.

3. Reduce token cost in NPC system prompt

- Make large sections conditional (persona appearance, personalityMap slider details, long affinity prompt) based on whether they change often or are needed for the current intent.
- Consider a shorter “formatting contract” that is reused verbatim and kept stable.
