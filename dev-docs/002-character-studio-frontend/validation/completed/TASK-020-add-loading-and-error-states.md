# TASK-020: Add Loading and Error States

**Priority**: P1
**Estimate**: 1 hour
**Phase**: 4 - Validation & Polish
**Depends On**: TASK-002

---

## Objective

Add proper loading indicators and error handling UI for API operations.

## Areas to Add Loading States

### Conversation Panel

- Loading indicator while waiting for LLM response
- Typing indicator or spinner
- Disable send button during generation

### Save Operation

- Loading state on save button
- Success/failure toast or notification

### Character Load

- Skeleton or spinner while loading character data

## Implementation

### 1. Conversation Loading

```tsx
// In ConversationPane.tsx or equivalent

const [isGenerating, setIsGenerating] = useState(false);

const handleSend = async () => {
  setIsGenerating(true);
  try {
    await generateResponse(message);
  } finally {
    setIsGenerating(false);
  }
};

// In render:
{isGenerating && (
  <div className="flex items-center gap-2 text-gray-500">
    <Loader2 className="animate-spin h-4 w-4" />
    <span>Thinking...</span>
  </div>
)}

<button
  disabled={isGenerating || !message.trim()}
  onClick={handleSend}
>
  {isGenerating ? 'Generating...' : 'Send'}
</button>
```

### 2. Error Display

```tsx
// For API errors
const [error, setError] = useState<string | null>(null);

// After failed API call:
setError('Failed to generate response. Please try again.');

// In render:
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
    {error}
    <button onClick={() => setError(null)}>Dismiss</button>
  </div>
)}
```

### 3. Save State

```tsx
const [isSaving, setIsSaving] = useState(false);
const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

const handleSave = async () => {
  setIsSaving(true);
  try {
    await saveCharacter();
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  } catch {
    setSaveStatus('error');
  } finally {
    setIsSaving(false);
  }
};

<button disabled={isSaving} onClick={handleSave}>
  {isSaving ? 'Saving...' : 'Save'}
</button>
{saveStatus === 'success' && <span className="text-green-600">Saved!</span>}
{saveStatus === 'error' && <span className="text-red-600">Save failed</span>}
```

## Acceptance Criteria

- [x] Loading spinner shows during LLM generation
- [x] Send button disabled while generating
- [x] API errors display user-friendly message
- [x] Save button shows loading state
- [x] Success/failure feedback after save
- [x] Errors are dismissible
