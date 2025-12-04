# Governor UI Debug Bubbles — Implementation Brief

You are extending the Minimal RPG web client to expose governor debug information while keeping the current "vanilla" chat flow intact for production.

## Core Requirements

- **Flag-gated behavior**
  - Respect both server/runtime config (`GOVERNOR_DEV_MODE`) and web build flag (`VITE_GOVERNOR_DEV_MODE`).
  - When either flag is false, the experience must remain unchanged: user input goes directly to the DeepSeek chat endpoint and only the assistant narrative renders.
  - When both are true, augment the chat timeline with per-turn debug bubbles derived from governor metadata.

- **Metadata plumbing**
  - API already emits `TurnResult.metadata.intent`, `metadata.intentDebug`, and `agentOutputs` when dev mode is active. Thread these fields through the client’s data model without altering the existing message schema for non-dev sessions.
  - Derive a `debugSlices` array on the client from the metadata so the component tree can render each slice independently.

- **UI structure**
  1. `TurnDebugPanel` receives the turn metadata and returns an ordered list of debug slices (intent summary, prompt snippet, raw LLM JSON, agent output summary, etc.).
  2. `TurnDebugBubble` renders a single slice:
     - Small heading that names the source (e.g., "Intent Detection", "Prompt Snapshot", "LLM Raw").
     - Content body shows formatted text or collapsible JSON with copy support (copy interaction can be added in a later iteration; stub a button or link now).
     - Uses a variant token (`intent`, `prompt`, `raw`, `agent`) to shift the background shade so bubbles are visually distinct but still tied to the assistant color palette.

- **Styling cues**
  - Keep widths and typography aligned with existing chat bubbles.
  - Apply a subtle left border or icon to reinforce that these are diagnostics, not player/assistant chat.
  - Provide meaningful spacing between the main assistant response and the debug bubbles; treat them as a stack under the narrative.

- **Performance**
  - Avoid expensive JSON stringify/pretty-print on every render. Precompute the pretty string when the slice is created.
  - Ensure debug components do not mount when the flag is off to prevent wasted work.

## Acceptance Criteria

1. With dev mode disabled, the UI behaves exactly as today (no additional network data, no debug components mounted).
2. With dev mode enabled, each turn shows: main assistant narrative + ordered debug bubbles with headings and variant styling.
3. Collapsible JSON content for `intentDebug.rawResponse` / `parsed` works on both desktop and mobile widths.
4. Toggling the dev flag at runtime (refresh after flag change) cleanly switches between modes without leftover state.
5. Component code is colocated under `packages/web/src/features/chat` with unit-friendly hooks/transform helpers where practical.

Use this brief as the prompt for any follow-up implementation work in this phase.
