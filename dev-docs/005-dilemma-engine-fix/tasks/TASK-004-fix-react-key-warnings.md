# TASK-004: Fix React Key Collision Warnings

**Priority**: P0 - Immediate
**Estimate**: 30 minutes
**Depends On**: None

---

## Objective

Fix the React "Encountered two children with the same key" warnings that flood the console during Character Studio usage.

## Observed Error

```text
[ERROR] Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates.
```

This warning appeared repeatedly during:

- Character profile editing
- Conversation interactions
- Trait inference display
- Save/load operations

## Investigation Areas

### 1. Detected Traits List

File: `packages/web/src/features/character-studio/components/conversation/DetectedTraits.tsx`

The inferred traits list may be using non-unique keys:

```typescript
// Check for patterns like:
{traits.map((trait, index) => (
  <div key={index}>  // BAD: index keys cause issues when list changes
    ...
  </div>
))}

// Or duplicate trait paths:
{traits.map((trait) => (
  <div key={trait.path}>  // BAD if multiple traits have same path
    ...
  </div>
))}
```

**Fix**: Use a unique identifier combining multiple fields:

```typescript
{traits.map((trait, index) => (
  <div key={`${trait.path}-${trait.evidence?.slice(0, 20)}-${index}`}>
    ...
  </div>
))}
```

### 2. Conversation Messages

File: `packages/web/src/features/character-studio/components/conversation/ConversationMessage.tsx`

Messages should use their unique ID:

```typescript
{messages.map((message) => (
  <ConversationMessage key={message.id} message={message} />
))}
```

### 3. Suggested Prompts

File: `packages/web/src/features/character-studio/components/conversation/ConversationPrompts.tsx`

The prompts array may contain duplicates:

```typescript
// Line 41-48
{prompts.map((prompt) => (
  <button
    key={prompt}  // BAD if prompts array has duplicates
    onClick={() => onSelect(prompt)}
  >
```

**Fix**: Use index as part of key:

```typescript
{prompts.map((prompt, index) => (
  <button
    key={`prompt-${index}-${prompt.slice(0, 20)}`}
    onClick={() => onSelect(prompt)}
  >
```

### 4. Identity Cards / Form Fields

File: `packages/web/src/features/character-studio/components/identity/`

Dropdowns and form fields may have duplicate option keys:

```typescript
// Check for patterns like:
{options.map((option) => (
  <option key={option.value} value={option.value}>  // OK if values unique
    {option.label}
  </option>
))}
```

### 5. Values and Fears Lists

Files in `packages/web/src/features/character-studio/components/personality/`

Arrays of values/fears may be rendered with non-unique keys.

## Debugging Steps

1. **Enable React DevTools key warnings**:

   ```typescript
   // In browser console
   localStorage.setItem('reactDevToolsKey', 'true');
   ```

2. **Add temporary logging**:

   ```typescript
   console.log('Rendering traits:', traits.map(t => t.path));
   ```

3. **Search for key patterns**:

   ```bash
   grep -r "key={" packages/web/src/features/character-studio/ --include="*.tsx"
   ```

## Files to Check

| File | Component | Likely Issue |
|------|-----------|--------------|
| `DetectedTraits.tsx` | Trait list | Duplicate trait paths |
| `ConversationPrompts.tsx` | Prompt buttons | Duplicate prompts |
| `ConversationPanel.tsx` | Message list | Check message IDs |
| `ValuesCard.tsx` | Values list | Duplicate value names |
| `FearsCard.tsx` | Fears list | Duplicate fear names |

## Acceptance Criteria

- [ ] No "same key" warnings in console during normal usage
- [ ] Keys are stable across re-renders (no flickering)
- [ ] Keys are unique within their list context
- [ ] Using semantic keys where possible (IDs), indexed keys only as fallback

## Testing

1. Open Character Studio in fresh browser
2. Create new character
3. Fill all fields
4. Start conversation, receive response
5. View detected traits
6. Save and reload character
7. Verify **zero** key collision warnings in console
