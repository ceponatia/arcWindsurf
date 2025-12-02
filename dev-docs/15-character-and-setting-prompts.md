# Character and Setting Prompts

This document provides practical guidance for authoring character and setting JSON so that it works well with the current prompt builder.

It is grounded in:

- Schemas in `@minimal-rpg/schemas` (see [dev-docs/02-character-schema.md](dev-docs/02-character-schema.md) and [dev-docs/04-settings-schema.md](dev-docs/04-settings-schema.md)).
- The prompt assembly logic in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts).
- The prompting conventions in [dev-docs/14-prompting-conventions.md](dev-docs/14-prompting-conventions.md).

Where behavior is not yet implemented or is still evolving, we call it out explicitly or put it in the TBD section.

## 1. How Character and Setting Data Is Used in Prompts

The prompt builder turns `CharacterProfile` and `SettingProfile` into two main `system` messages:

1. A **core Character block** from `serializeCharacter(character)`, containing identity, personality, and a minimal appearance slice.
2. A **core Setting block** from `serializeSetting(setting)`.

These core blocks are always included, along with base rules, tag-specific rules, history summary, and safety messages. Rich, granular details (for example, specific scars, jewelry, or exact boots) are instead expected to surface via **retrieval-driven context blocks** such as `Knowledge Context` and `Item Context` that are injected only when relevant to the current turn.

Because these blocks are plain text, you should treat character and setting JSON as **prompt authoring inputs**, not just data storage.

High-level guidelines:

- Prefer concise, vivid language that gives the model clear hooks.
- Avoid overlong backstories and lore; they are truncated in the builder.
- Keep content consistent with the global rules and safety constraints described in [dev-docs/14-prompting-conventions.md](dev-docs/14-prompting-conventions.md).

## 2. Authoring Character Profiles for Prompts

This section focuses on how each part of `CharacterProfile` affects the prompt.

### 2.1 Core Identity

Relevant fields (see [dev-docs/02-character-schema.md](dev-docs/02-character-schema.md)):

- `name` (required)
- `age` (optional, defaults in schema)
- `summary` (required)
- `backstory` (required)
- `tags` (optional)

Prompt behavior:

- The character block starts with `Character: NAME` and, if present, `Age: N`.
- `summary` is shown in full. It should be short (1–3 sentences) and descriptive.
- `backstory` is truncated to around 1200 characters. Anything beyond that will be dropped.

Authoring tips:

- Use `summary` for the quick “who are they?” description the model will always see.
- Use `backstory` for important history that may affect behavior, relationships, or goals.
- Put the most important information early in `backstory` so it survives truncation.
- Keep `tags` as short, machine-friendly keywords (e.g. `"mentor"`, `"antagonist"`). They currently only appear as a comma-separated `Tags:` line, but may be used for routing in the future.

### 2.2 Personality and Speaking Style

The builder treats personality as follows:

- If `personality` is a string: we emit `Personality: ...`.
- If it is an array of strings: we emit `Personality Traits: TRAIT1; TRAIT2; ...`.
- `speakingStyle` (string) is emitted as `Speaking Style: ...`.

Authoring tips:

- Keep personality traits short and concrete, e.g. `"stoic"`, `"playfully sarcastic"`, `"secretive but kind"`.
- Avoid mixing backstory into personality; that belongs in `backstory`.
- For `speakingStyle`, describe how lines should sound, e.g. `"Gruff, plain language, rarely uses metaphors."`.

### 2.3 Style Sliders

If the `style` object is present, we emit a compact line:

> `Style Hints: sentenceLength=..., humor=..., darkness=..., pacing=..., formality=..., verbosity=...`

Authoring tips:

- Use style sliders to **reinforce** speaking style, not replace it.
- Choose values that match the desired in-game experience:
  - `sentenceLength`: `terse` for short replies, `long` for flowery monologues.
  - `humor`: `none`, `light`, `wry`, `dark` depending on tone.
  - `darkness`: how grim the character’s worldview is.
  - `pacing`: how quickly scenes should move.
  - `formality`: casual vs. formal speech.
  - `verbosity`: how much detail the character tends to provide.

### 2.4 Appearance and Scent

Appearance is serialized via `serializeAppearance`:

- If `appearance` is a string, we include it verbatim (truncated) as the appearance line.
- If it is an object (structured appearance), we build parts like:
  - `Hair: COLOR LENGTH STYLE`
  - `Eyes: COLOR`
  - `Height: ...`
  - `Skin: ...`
  - `Torso: ...`
  - `Arms: ...`
  - `Legs: ...`
  - `Features: ...`

`scent` is optional and, if present, contributes a `Scent Hints:` line with short descriptors.

Authoring tips:

- Use structured appearance when you want the model to consistently recall specific details (hair/eyes/height/etc.).
- Keep descriptions concrete and avoid mixing personality into appearance.
- Use `features` for 2–5 distinctive details that make the character easy to visualize.
- Only specify `scent` when it meaningfully contributes to the scene (e.g. perfumes, smoke, herbs).

#### 2.4.1 Free-text appearance/personality notes and LLM extraction (planned)

In the planned character-editing flow, the UI exposes **free-text fields** such as `appearanceNotes` and `personalityNotes` alongside the structured `appearance` and `personality` fields. On submit, the API can call an LLM-based extractor that turns those notes into a **partial `CharacterProfile`** and deep-merges it into the existing `profile_json` JSONB document for that character.

The extractor prompt is conceptually:

```text
You are a strict JSON extractor. You receive free-text notes about a character's appearance and personality.

Return a JSON object that matches a partial CharacterProfile. All fields are optional. Only include fields you can infer with high confidence.

Valid top-level keys include: "appearance", "personality", and "meta".

If you include "appearance", it should be an object with optional nested keys like:
- hair: { color?: string; style?: string; length?: string }
- eyes: { color?: string }
- height?: "short" | "average" | "tall" | string
- torso?: string

If you include "personality", it should be an object with optional nested keys:
- traits?: string | string[]
- speechStyle?: {
  formality?: "casual" | "neutral" | "formal";
  verbosity?: "terse" | "balanced" | "lavish";
}

If you include "meta", you may copy the raw notes into
- meta.appearanceNotesRaw
- meta.personalityNotesRaw

Input:
<APPEARANCE_NOTES>
<PERSONALITY_NOTES>

Output JSON:
{ ...partial CharacterProfile... }
```

Example input and output (informal):

- Input notes: "He has messy brown hair and green eyes, very tall and skinny. She's shy but sarcastic and speaks very formally."
- Extracted JSON (before merge):

  ```jsonc
  {
    "appearance": {
      "hair": { "color": "brown", "style": "messy" },
      "eyes": { "color": "green" },
      "height": "tall",
      "torso": "slight",
    },
    "personality": {
      "traits": ["shy", "sarcastic"],
      "speechStyle": {
        "formality": "formal",
        "verbosity": "balanced",
      },
    },
  }
  ```

The resulting partial profile is validated and then deep-merged into `profile_json`. Arrays in the extracted object (such as `traits`) replace existing arrays in `profile_json`, while nested objects are merged recursively.

In the planned RAG-style pipeline, this structured `appearance` data (including more granular parts such as `legs`, `feet`, or distinctive features) is combined with outfit/item data to produce **knowledge nodes** and an `EffectiveOutfit` view. When the player explicitly examines a character (for example, “I look at her feet” or “Describe his coat in detail”), retrieval uses the latest user text plus these nodes to build small `Knowledge Context` / `Item Context` blocks (such as legs/feet appearance and currently equipped boots) that are added ahead of history in the prompt, while the always-on character block stays compact.

### 2.5 Common Anti-Patterns to Avoid

- Overloading `summary` with multi-paragraph backstory.
- Using first-person voice in fields that should be neutral descriptions (e.g. `"I am..."` inside `backstory`).
- Embedding explicit instructions to the model inside character fields (those belong in system prompts, not profiles).
- Including content that would conflict with safety constraints (e.g. underage sexual context, extreme gore).

## 3. Authoring Setting Profiles for Prompts

This section focuses on how `SettingProfile` fields influence prompts.

### 3.1 Core Fields

From [dev-docs/04-settings-schema.md](dev-docs/04-settings-schema.md):

- `name` (required)
- `lore` (required)
- `themes` (optional)
- `tags` (optional `SettingTag[]`)

Prompt behavior:

- The setting block is:
  - `Setting: NAME`
  - `Lore: ...` (truncated to around 1200 characters)
  - `Themes: THEME1; THEME2; ...` (if any)
  - `Tags: TAG1, TAG2, ...` (if any)

Authoring tips:

- `lore` should describe the world, genre, and key tensions, not specific scene instructions.
- Put the most important elements near the beginning of `lore` to survive truncation.
- Use `themes` for high-level motifs (e.g. `"betrayal"`, `"forbidden love"`, `"survival"`).

### 3.2 Tags and Genre Behavior

`tags` controls which genre-specific system rules are applied (see [dev-docs/14-prompting-conventions.md](dev-docs/14-prompting-conventions.md)):

- `romance`, `adventure`, `mystery` currently map to extra rules.
- Other tags may exist in the schema but might not have rules attached yet.

Authoring tips:

- Add only the tags that truly apply to the setting; each tag can substantially change model behavior.
- Combine tags thoughtfully (e.g. `romance + mystery` for a romantic detective story).
- Avoid using tags as free-form keywords; they are an enum meant to match configured rule sets.

### 3.3 Coordinating Characters and Settings

While character and setting are serialized separately, they are interpreted together by the model.

Guidelines:

- Ensure character `summary`, `backstory`, and `style` are consistent with the active setting’s `lore`, `themes`, and `tags`.
- For multi-setting campaigns, make sure characters that move between settings do not hard-code assumptions about a specific world in their backstory.
- Use setting `themes` to reinforce character arcs (e.g. a redeemed villain in a setting whose themes include `"redemption"`).

## 4. Writing JSON Files in data/

Static templates live in:

- `data/characters/*.json`
- `data/settings/*.json`

They are validated at startup by the API using the schemas in `@minimal-rpg/schemas`. Prompt-specific behavior is then applied by the builder in [packages/api/src/llm/prompt.ts](packages/api/src/llm/prompt.ts).

Best practices when editing/adding files:

- Run the data validator script (`node ./scripts/validate-data.js`) after changes.
- Keep JSON focused on **in-world facts and traits**, not meta-commentary about the game system.
- Use consistent casing and spelling for tags and themes to improve future search and retrieval.

## 5. Examples (Informal)

The repo currently includes example JSON files under `data/settings/` and possibly under `data/characters/`. These should be treated as **illustrative**, not as strict templates.

When creating new profiles:

- Use the example files to understand required fields and general tone.
- Then refine `summary`, `backstory`, `lore`, and style fields using the guidance in this document.

## 6. Relationship to Prompting Conventions and RAG

- This document focuses on **how to author profiles** so they combine well into prompts.
- [dev-docs/14-prompting-conventions.md](dev-docs/14-prompting-conventions.md) explains how those profiles are converted into actual LLM messages.
- A future [dev-docs/16-rag-context-injection.md](dev-docs/16-rag-context-injection.md) doc will describe how profile data is decomposed into knowledge nodes for retrieval; when that exists, it may influence how granular you make fields like `backstory` and `lore`.

## 7. TBD / Open Questions

The following are not yet fully implemented or specified. Do not rely on them until the corresponding code/docs are updated.

- **Profile fields used for retrieval/RAG**
  - We do not yet have a finalized list of which character/setting fields become standalone knowledge nodes.
  - Future RAG work may recommend more structured subfields (e.g. goals, relationships, factions).

- **Automatic style harmonization**
  - There is no system today that adjusts character or setting style dynamically based on model feedback.
  - It is up to authors to keep style sliders and descriptions consistent across related characters.

- **Per-tag authoring checklists**
  - We do not yet provide tag-specific authoring checklists (e.g. exact do/don’t lists for `romance` vs `mystery`).
  - These may be added later once the system-prompt JSONs stabilize.

- **Player-avatar specific guidance**
  - Future, first-class player avatars are expected to reuse the same character schema but could benefit from separate authoring rules (e.g. less rigid backstory, more open-ended goals).
  - That guidance is not written yet.
