# chat-panel

Main chat interface for session messaging with NPC interactions.

## Exports

- `ChatPanel` — Primary chat UI with message history and input

## Cross-Package Imports

| Import                            | Source Package       | Usage                                          |
| --------------------------------- | -------------------- | ---------------------------------------------- |
| `getErrorMessage`, `isAbortError` | `@minimal-rpg/utils` | Error handling utilities for network failures  |
| `ChatView`                        | `@minimal-rpg/ui`    | Presentational component for message rendering |

## API Client Imports

From `../../shared/api/client.js`:

- Session and message APIs for sending user input and receiving NPC responses
- Streaming support for real-time message updates

## Local Dependencies

- `TurnDebugPanel` from `../chat` — Debug overlay for governor metadata

## Tracing Notes

The `ChatView` component is defined at [packages/ui/src/ChatView.tsx](../../../../../../ui/src/ChatView.tsx). Error utilities come from [packages/utils/src/error.ts](../../../../../../utils/src/error.ts). Message streaming connects to the API's `/sessions/:id/message` endpoint.
