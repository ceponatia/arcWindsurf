# Character Studio Feature

## Purpose

The Character Studio is an interactive React feature for creating and editing RPG characters. It combines a conversational AI interface with form-based editing, allowing users to discover character traits through dialogue or manually input them. The system automatically infers personality traits from conversation and suggests them for acceptance/rejection.

## Architecture Overview

```text
CharacterStudio.tsx (main orchestrator)
├── StudioHeader.tsx (save/cancel, completion indicator)
├── ConversationPane/ (left panel - chat with character)
│   ├── ConversationPrompts.tsx (starter prompts)
│   └── MessageBubble.tsx (chat messages)
├── TraitSuggestions.tsx (pending inferred traits bar)
└── IdentityPanel.tsx (right panel - scrollable form cards)
    ├── IdentityCard.tsx (collapsible wrapper)
    ├── personality/ (Big Five, emotions, values, fears, etc.)
    ├── AppearanceCard.tsx (physical appearance)
    └── BodyCard.tsx (body region descriptions)
```

## State Management (Preact Signals)

All state is managed via **Preact Signals** in [signals.ts](signals.ts). This is a reactive state system - signals automatically re-render components when their values change.

### Key Signals

| Signal | Type | Purpose |
|--------|------|---------|
| `characterProfile` | `Partial<CharacterProfile>` | Main character data being edited |
| `characterId` | `string \| null` | ID for editing mode, null for new |
| `isDirty` | `boolean` | Unsaved changes flag |
| `saveStatus` | `'idle' \| 'saving' \| 'saved' \| 'error'` | Save operation state |
| `fieldErrors` | `StudioFieldErrors` | Validation errors by field |
| `conversationHistory` | `ConversationMessage[]` | Chat messages |
| `pendingTraits` | `InferredTrait[]` | Traits awaiting user decision |
| `isGenerating` | `boolean` | LLM response in progress |
| `completionScore` | `computed` | 0-100 profile completeness |

### Signal Usage Pattern

```tsx
import { useSignals } from '@preact/signals-react/runtime';
import { characterProfile, updateProfile } from '../signals.js';

export const MyComponent: React.FC = () => {
  useSignals(); // Required - enables signal reactivity

  const profile = characterProfile.value; // Read signal

  const handleChange = (value: string) => {
    updateProfile('name', value); // Use action functions, not direct mutation
  };
};
```

### Action Functions

Never mutate signals directly. Use the exported action functions:

- `updateProfile(key, value)` - Update top-level profile field
- `updatePersonalityMap(updates)` - Merge into personality sub-object
- `addMessage(msg)` - Add conversation message
- `acceptTrait(id)` / `rejectTrait(id)` - Handle trait suggestions
- `validateProfile()` - Run validation, populates `fieldErrors`
- `resetStudio()` - Clear all state for new character

## Component Patterns

### IdentityCard Wrapper

All form sections use the `IdentityCard` collapsible wrapper:

```tsx
<IdentityCard
  title="Section Name"
  defaultOpen={false}
  completionPercent={calculateCompletion()}
>
  {/* form fields */}
</IdentityCard>
```

### Form Input Pattern

```tsx
<label className="block">
  <span className="text-xs text-slate-400">Field Label</span>
  <input
    type="text"
    value={profile.fieldName ?? ''}
    onChange={(e) => updateProfile('fieldName', e.target.value)}
    className="mt-1 w-full bg-slate-900 text-slate-200 rounded-md px-3 py-2 outline-none ring-1 ring-slate-700 focus:ring-2 focus:ring-violet-500"
    placeholder="Placeholder..."
  />
</label>
```

### Error Display Pattern

```tsx
<input
  className={`... ${
    fieldErrors.value.fieldName
      ? 'ring-red-500 focus:ring-red-500'
      : 'ring-slate-700 focus:ring-violet-500'
  }`}
  onChange={(e) => {
    updateProfile('fieldName', e.target.value);
    clearFieldError('fieldName'); // Clear error on change
  }}
/>
{fieldErrors.value.fieldName && (
  <div className="mt-1 text-xs text-red-400">{fieldErrors.value.fieldName}</div>
)}
```

## Data Flow

### Conversation → Trait Inference

1. User sends message via `ConversationPane`
2. `useConversation.sendMessage()` calls `generateCharacterResponse()` API
3. After response, `inferTraitsFromMessage()` analyzes the exchange
4. Inferred traits are added to `pendingTraits` signal with `status: 'pending'`
5. `TraitSuggestions` component displays pending traits
6. User accepts/rejects → `applyTrait()` updates `characterProfile`

### Save Flow

1. User clicks Save in `StudioHeader`
2. `useCharacterStudio.save()` runs `validateProfile()`
3. If valid, `persistCharacter()` sends to API
4. On success: `isDirty = false`, `saveStatus = 'saved'`
5. Status resets to 'idle' after 3 seconds

## Type System

### Types Location

- **Form types**: [types.ts](types.ts) - UI-specific form state types
- **Schema types**: `@minimal-rpg/schemas` - Canonical data types

### Key Form Types

```typescript
interface PersonalityFormState {
  traits: string;                    // Comma-separated keywords
  dimensions: DimensionEntry[];      // Big Five scores
  emotionalBaseline: EmotionalBaselineEntry;
  values: ValueEntry[];
  fears: FearEntry[];
  attachment: AttachmentStyle;
  social: SocialPatternEntry;
  speech: SpeechStyleEntry;
  stress: StressBehaviorEntry;
}
```

### Transformers

[transformers.ts](transformers.ts) handles conversion between:

- `FormState` ↔ `CharacterProfile` (schema type)
- `PersonalityFormState` ↔ `PersonalityMap`

Key functions:

- `buildProfile(form)` - Form → API-ready profile
- `mapProfileToForm(profile)` - API profile → Form
- `buildPersonalityMap(pm)` - Only includes non-default values
- `mergeGeneratedIntoForm(current, generated)` - AI-generated merge

## Validation

### Pre-Save Validation

Located in [validation/](validation/):

- `validateCharacterProfileBeforeSave()` - Returns `StudioFieldErrors`
- Currently validates: `name`, `summary`, `backstory` (required strings)

### Adding New Validations

1. Add field key to `StudioFieldKey` type in [validation/types.ts](validation/types.ts)
2. Add validation logic in [validation/validateCharacterProfileBeforeSave.ts](validation/validateCharacterProfileBeforeSave.ts)
3. Add error display in the relevant component

## Services

### API Service ([services/api.ts](services/api.ts))

- `loadCharacter(id)` - Fetch existing character
- `persistCharacter(profile)` - Save character
- `generateCharacterId()` - UUID generation

### LLM Service ([services/llm.ts](services/llm.ts))

- `generateCharacterResponse(input)` - Get AI response in character voice
- `inferTraitsFromMessage(input)` - Extract personality traits from dialogue

### Trait Inference ([services/trait-inference.ts](services/trait-inference.ts))

Client-side fallback for trait detection using keyword patterns. Used when API is unavailable.

## Hooks

### useCharacterStudio

Main hook for the studio feature:

```typescript
const {
  profile,      // Current profile data
  isDirty,      // Has unsaved changes
  saveStatus,   // Save operation state
  isLoading,    // Initial load in progress
  isEditing,    // Edit mode (has ID)
  save,         // Save function
  reset,        // Clear and start new
  updateField,  // Update profile field
} = useCharacterStudio({ id, onSave });
```

### useConversation

Conversation panel logic:

```typescript
const {
  messages,        // Chat history
  isGenerating,    // AI thinking
  sendMessage,     // Send user message
  clearConversation,
} = useConversation();
```

## Styling Conventions

- **Background**: `bg-slate-900`, `bg-slate-950`
- **Text**: `text-slate-200` (primary), `text-slate-400` (secondary)
- **Borders**: `ring-1 ring-slate-700`, focus: `ring-2 ring-violet-500`
- **Accent**: `violet-500`, `violet-600`
- **Errors**: `red-400`, `red-500`
- **Success**: `green-400`, `green-600`

## Adding New Cards

1. Create component in `components/` or appropriate subdirectory
2. Wrap content in `<IdentityCard>` for consistency
3. Read from `characterProfile.value`
4. Write using `updateProfile()` or `updatePersonalityMap()`
5. Add completion calculation if needed
6. Import and add to `IdentityPanel.tsx`

## File Organization

```text
character-studio/
├── CharacterStudio.tsx      # Root component
├── signals.ts               # All reactive state
├── types.ts                 # Form-specific types
├── transformers.ts          # Data conversion
├── utils.ts                 # Helper functions
├── index.ts                 # Public exports
├── components/              # UI components
│   ├── IdentityCard.tsx     # Reusable wrapper
│   ├── IdentityPanel.tsx    # Card container
│   ├── BodyCard.tsx         # Body regions
│   ├── AppearanceCard.tsx   # Physical traits
│   ├── conversation/        # Chat UI
│   ├── personality/         # Personality forms
│   └── traits/              # Trait suggestions
├── hooks/                   # React hooks
├── services/                # API/LLM calls
├── utils/                   # Utilities
│   └── trait-applicator.ts  # Apply inferred traits
└── validation/              # Save validation
```

## Common Gotchas

1. **Always call `useSignals()`** at the top of components that read signals
2. **Never mutate signals directly** - use action functions
3. **Use `.value` to read** signals, not the signal itself
4. **Form types vs Schema types** - `types.ts` for forms, `@minimal-rpg/schemas` for data
5. **Completion scores** should handle undefined/null gracefully
6. **Clear field errors** when the user modifies the field
