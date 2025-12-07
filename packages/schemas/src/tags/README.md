# Tag Schemas

Zod schemas for the prompt tag system—reusable prompt directives that can be bound to sessions.

## Files

| File             | Description                                                                  |
| ---------------- | ---------------------------------------------------------------------------- |
| `definitions.ts` | Core tag schemas: `TagDefinitionSchema`, `SessionTagBindingSchema`           |
| `helpers.ts`     | Utility functions: `isConditionalTag`, `incrementVersion`, `validateTrigger` |
| `index.ts`       | Re-exports all schemas, types, and helpers                                   |

## Tag Categories

```ts
'style'; // Narrative/writing style
'mechanic'; // Game mechanics and rules
'content'; // Content preferences/restrictions
'world'; // World-building constraints
'behavior'; // Character behavior modifiers
'trigger'; // Conditional situation prompts
'meta'; // Meta-game/session management
```

## Activation Modes

```ts
'always'; // Always injected (zero runtime cost)
'conditional'; // Evaluated per-turn based on triggers
```

## Target Types

```ts
'session'; // Applies to entire session
'character'; // Specific character(s)
'npc'; // NPCs only
'player'; // Player character only
'location'; // Active in specific location(s)
'setting'; // Applies to world context
```

## TagDefinitionSchema

The main tag definition:

```ts
{
  id: uuid,
  owner: string,
  visibility: 'private' | 'public' | 'unlisted',
  name: string,
  shortDescription?: string,
  category: TagCategory,
  promptText: string,           // The actual prompt content
  activationMode: 'always' | 'conditional',
  targetType: TagTargetType,
  triggers: TagTrigger[],       // Conditional activation rules
  priority: TagPriority,
  compositionMode: TagCompositionMode,
  conflictsWith?: string[],
  requires?: string[],
  version: string,
  changelog?: string,
  isBuiltIn: boolean,
}
```

## SessionTagBindingSchema

Binds a tag to a session:

```ts
{
  id: uuid,
  sessionId: uuid,
  tagId: uuid,
  targetType: TagTargetType,
  targetEntityId?: uuid,  // null = all of targetType
  enabled: boolean,
}
```

## Trigger Conditions

For conditional tags, triggers define when they're active:

```ts
'intent'; // Active for specific intents (talk, move, examine)
'keyword'; // Keywords detected in input
'emotion'; // Character emotional state
'relationship'; // Relationship levels
'time'; // Time periods
'location'; // In specific locations
'state'; // Based on state flags
```
