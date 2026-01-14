# TASK-013: Character Deletion from Studio

**Priority**: P1
**Phase**: 6 - Polish & Integration
**Estimate**: 30 minutes
**Depends On**: None

---

## Objective

Add a delete button to the Character Studio header that allows users to delete the character they are currently editing.

## Files to Modify

1. `packages/web/src/features/character-studio/components/StudioHeader.tsx`
2. `packages/web/src/features/character-studio/hooks/useCharacterStudio.ts`

## Implementation

### Step 1: Add delete function to useCharacterStudio

Update `packages/web/src/features/character-studio/hooks/useCharacterStudio.ts`:

```typescript
import { removeCharacter } from '../services/api.js';

// Add to the hook return type
export interface UseCharacterStudioResult {
  // ... existing fields
  deleteCharacter: () => Promise<boolean>;
  isDeleting: boolean;
}

// Add state for deletion
const [isDeleting, setIsDeleting] = useState(false);

// Add delete function
const deleteCharacter = useCallback(async (): Promise<boolean> => {
  const id = characterId.value;
  if (!id) {
    console.warn('Cannot delete: no character ID');
    return false;
  }

  // Confirm deletion
  const confirmed = window.confirm(
    `Are you sure you want to delete "${characterProfile.value.name ?? 'this character'}"? This action cannot be undone.`
  );

  if (!confirmed) {
    return false;
  }

  setIsDeleting(true);

  try {
    await removeCharacter(id);

    // Reset studio state
    resetStudio();

    // Notify parent (e.g., to navigate away or refresh list)
    if (onDelete) {
      onDelete(id);
    }

    return true;
  } catch (error) {
    console.error('Failed to delete character:', error);
    alert('Failed to delete character. Please try again.');
    return false;
  } finally {
    setIsDeleting(false);
  }
}, [onDelete]);

// Add to return object
return {
  // ... existing fields
  deleteCharacter,
  isDeleting,
};
```

### Step 2: Update hook props interface

```typescript
export interface UseCharacterStudioOptions {
  id?: string;
  onSave?: (profile: CharacterProfile) => void;
  onDelete?: (id: string) => void; // Add this
}
```

### Step 3: Update StudioHeader component

Update `packages/web/src/features/character-studio/components/StudioHeader.tsx`:

```typescript
import { Trash2 } from 'lucide-react';

interface StudioHeaderProps {
  characterName?: string;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  completionPercent: number;
  isEditing: boolean; // Add: true if editing existing character
  isDeleting?: boolean; // Add: deletion in progress
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void; // Add: delete handler
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  characterName,
  isDirty,
  saveStatus,
  completionPercent,
  isEditing,
  isDeleting = false,
  onSave,
  onCancel,
  onDelete,
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-900">
      {/* Left side: Character name and completion */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-slate-100">
          {characterName || 'New Character'}
        </h1>
        {/* Completion indicator */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{completionPercent}%</span>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-3">
        {/* Delete button (only for existing characters) */}
        {isEditing && onDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete character"
          >
            <Trash2 className="w-4 h-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-md transition-colors"
        >
          Cancel
        </button>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saveStatus === 'saving' || !isDirty}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveStatus === 'saving' ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <span className="text-green-400">✓</span>
              Saved
            </>
          ) : saveStatus === 'error' ? (
            <>
              <span className="text-red-400">!</span>
              Error
            </>
          ) : (
            'Save'
          )}
        </button>
      </div>
    </header>
  );
};
```

### Step 4: Wire up in CharacterStudio

Update `packages/web/src/features/character-studio/CharacterStudio.tsx`:

```typescript
const {
  // ... existing destructured values
  deleteCharacter,
  isDeleting,
} = useCharacterStudio({
  id,
  onSave: handleSaveComplete,
  onDelete: handleDeleteComplete, // Add this
});

// Add handler
const handleDeleteComplete = useCallback((deletedId: string) => {
  // Navigate away or refresh
  // This depends on your routing setup
  if (onClose) {
    onClose();
  }
}, [onClose]);

// Update StudioHeader usage
<StudioHeader
  characterName={profile.name}
  isDirty={isDirty}
  saveStatus={saveStatus}
  completionPercent={completionScore.value}
  isEditing={isEditing}
  isDeleting={isDeleting}
  onSave={save}
  onCancel={handleCancel}
  onDelete={isEditing ? deleteCharacter : undefined}
/>
```

## Acceptance Criteria

- [ ] Delete button appears only when editing existing character
- [ ] Delete button shows loading state during deletion
- [ ] Confirmation dialog before deletion
- [ ] Character removed from database on confirm
- [ ] Studio state reset after deletion
- [ ] Parent component notified via `onDelete` callback
- [ ] Proper error handling with user feedback
- [ ] Delete button has appropriate styling (red, warning appearance)
- [ ] Button disabled during deletion operation
