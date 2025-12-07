# chat

Debug visualization components for governor turn metadata.

## Exports

- `TurnDebugPanel` — Collapsible panel showing intent detection, agent outputs, and timing
- `TurnDebugPanelProps` — TypeScript interface for the panel component
- `buildTurnDebugSlices` — Transforms raw `TurnMetadata` into display slices

## Cross-Package Imports

None — this feature uses only local types from `../../types.js`.

## Local Modules

- `TurnDebugPanel.tsx` — Accordion-style panel rendering debug slices
- `TurnDebugBubble.tsx` — Individual expandable section for each debug slice
- `buildTurnDebugSlices.ts` — Pure function that parses `TurnMetadata` into `TurnDebugSlice[]`

## Type Dependencies

From `../../types.js`:

- `TurnMetadata` — Raw metadata attached to each governor turn
- `TurnDebugSlice` — Structured slice for display (text, code, JSON, list variants)
- `IntentParams` — Parameters extracted by intent detection

## Tracing Notes

`TurnMetadata` originates from the API's governor response. The slices display intent detection results, prompts, context signals, and agent outputs in a developer-friendly format.
