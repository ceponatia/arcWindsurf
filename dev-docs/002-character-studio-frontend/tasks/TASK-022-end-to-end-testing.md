# TASK-022: End-to-End Testing

**Priority**: P0
**Estimate**: 2 hours
**Phase**: 4 - Validation & Polish
**Depends On**: All previous tasks

---

## Objective

Verify the complete Character Studio flow works end-to-end after all components are wired.

## Test Scenarios

### Scenario 1: Create New Character

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Character Studio | Empty form displays |
| 2 | Enter name "Test Character" | Name field updates |
| 3 | Fill backstory | Backstory saves |
| 4 | Adjust Big Five sliders | Values reflect in signal |
| 5 | Add a value (e.g., "Honor") | Value appears in list |
| 6 | Add a fear | Fear appears in list |
| 7 | Click Save | Character persists to DB |
| 8 | Refresh page | Character still exists |

### Scenario 2: Edit Existing Character

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Load saved character | All fields populate correctly |
| 2 | Change name | Name updates |
| 3 | Modify personality slider | Slider moves, signal updates |
| 4 | Remove a value | Value removed from list |
| 5 | Save | Changes persist |
| 6 | Reload | Changes still present |

### Scenario 3: Conversation and Trait Inference

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open character | Conversation panel ready |
| 2 | Send message: "Tell me about yourself" | LLM responds in character |
| 3 | Continue conversation | Trait suggestions appear |
| 4 | Accept a suggested trait | Trait applies to form field |
| 5 | Dismiss a suggested trait | Trait removed from pending |
| 6 | Save character | Accepted traits persist |

### Scenario 4: Validation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear name field | Required indicator shows |
| 2 | Attempt save | Validation error displays |
| 3 | Fill name | Error clears |
| 4 | Save | Success |

### Scenario 5: Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Disconnect network | Error state when saving |
| 2 | Reconnect | Can save again |
| 3 | Invalid API key | LLM error displays gracefully |

## Checklist

- [ ] All personality cards render
- [ ] All fields read/write signals correctly
- [ ] Conversation sends and receives
- [ ] Trait suggestions appear and can be accepted
- [ ] Save/load round-trips all data
- [ ] Validation prevents bad saves
- [ ] Loading states display
- [ ] Errors are user-friendly
- [ ] No console errors
- [ ] No TypeScript errors

## Acceptance Criteria

- [ ] All 5 scenarios pass
- [ ] Performance acceptable (<1s for local operations)
