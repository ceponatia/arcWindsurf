# TASK-006: Add Manual Summarize Button (Dev Mode)

**Priority**: P3
**Status**: 🔲 TODO
**Estimate**: 30m
**Plan**: PLAN-1.0
**Depends On**: TASK-004

---

## Description

Add a manual "Summarize" button to the chat UI, visible only in development mode.

## Acceptance Criteria

- [x] Button appears in chat UI (near input or in toolbar)
- [x] Only visible when `DEV_MODE` flag is true
- [x] Clicking triggers `POST /studio/summarize`
- [x] Shows loading state while summarizing
- [x] Shows success/error feedback (toast or inline message)
- [x] Disabled if no session or < 10 messages

## Technical Notes

### Dev Mode Check

```typescript
// Check for dev mode - may need to expose from API or env
const isDevMode = import.meta.env.DEV || window.__DEV_MODE__;
```

### Button Placement Options

1. Small icon button next to chat input
2. In a "..." menu dropdown
3. Below conversation history

Recommend option 1 for discoverability during development.

### UI

```tsx
{isDevMode && (
  <button
    onClick={handleSummarize}
    disabled={!sessionId || messageCount < 10 || isSummarizing}
    className="text-xs text-slate-500 hover:text-slate-300"
    title="Summarize conversation (dev only)"
  >
    {isSummarizing ? 'Summarizing...' : '📋 Summarize'}
  </button>
)}
```

## Files to Modify

- `packages/web/src/features/character-studio/components/conversation/ConversationPane.tsx`

## Dependencies

- TASK-004 (endpoint must exist)
