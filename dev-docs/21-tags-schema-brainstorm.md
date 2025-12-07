# Tags Schema Brainstorm

> **Status**: APPROVED - proceeding with enhanced tag implementation

## Summary of Decisions

After discussion, we've finalized the following approach:

| Decision              | Outcome                                                                     |
| --------------------- | --------------------------------------------------------------------------- |
| **Storage**           | Drop old `prompt_tags`, recreate with enhanced schema (same table name)     |
| **Permissions**       | `owner` + `visibility` fields; default to `admin`/`public`                  |
| **Versioning**        | Semver `X.Y.Z`; only increments when `changelog` is provided on save        |
| **Activation**        | Hybrid model: `'always'` (cached) vs `'conditional'` (per-turn predicates)  |
| **Entity Binding**    | Session-level only via `SessionTagBinding` junction table                   |
| **Trait Interaction** | Phase 1: no checking; future phases add heuristic then LLM-based warnings   |
| **UI Priority**       | Tags are next; MVP focuses on core fields, activation mode, trigger builder |

---

This document analyzes the current tag system in `@minimal-rpg/schemas` and explores its future direction, including whether tags remain valuable given the comprehensive character, setting, and personality schemas now in place.

## 1. Current State Analysis

### 1.1 Existing Tag Implementation

The current tag system is minimal:

```typescript
// packages/schemas/src/tags/index.ts
export const TagDefinitionSchema = z.object({
  id: z.string().uuid(),
  owner: z.string().min(1),
  name: z.string().min(1).max(100),
  shortDescription: z.string().max(500).optional(),
  promptText: z.string().min(1).max(10000),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const SessionTagInstanceSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  tagId: z.string().uuid().nullable(),
  name: z.string(),
  shortDescription: z.string().optional(),
  promptText: z.string(),
  createdAt: z.date().optional(),
});
```

### 1.2 Current Usage

Tags are used in exactly one place in the prompt system:

```typescript
// packages/api/src/llm/prompt.ts
(() => {
  if (!opts.tagInstances?.length) return undefined;
  const tagPrompts = opts.tagInstances.map((t) => t.promptText).join('\n\n');
  return { role: 'system' as const, content: `Additional Style Rules:\n${tagPrompts}` };
})(),
```

**Key observations:**

- Tags are session-level only (not attached to characters, settings, or locations)
- Tags are simple prompt injections with no targeting or context awareness
- Tags have no relationship to the structured personality/trait system
- The TagBuilder UI is a basic form editor with no advanced features

### 1.3 Overlapping Systems

The codebase now has multiple "tag-like" concepts:

| System             | Location                   | Purpose                                             |
| ------------------ | -------------------------- | --------------------------------------------------- |
| **Session Tags**   | `tags/index.ts`            | Arbitrary prompt injection per session              |
| **Setting Tags**   | `setting/background.ts`    | Predefined genre tags (romance, adventure, mystery) |
| **Character Tags** | `character/basics.ts`      | Status/category labels (draft, published, etc.)     |
| **Detail Tags**    | `character/details.ts`     | Free-form labels on profile details                 |
| **Location Tags**  | `location/*.ts`            | Flavor descriptors (dusty, haunted, guarded)        |
| **Item Tags**      | `items/definition.ts`      | Item categorization                                 |
| **Trait Prompts**  | `character/personality.ts` | Structured personality → prompt mapping             |

## 2. The Core Question: Are Session Tags Still Needed?

### 2.1 Arguments for Deprecation

**Redundancy with Personality System:**
The new `personality.ts` schema provides:

- `TRAIT_PROMPTS` registry with 100+ micro-prompts
- Structured trait-to-prompt resolution
- Conflict detection and validation
- Relationship-aware modulation

This covers most use cases where users would write custom "personality" tags.

**Lack of Targeting:**
Current session tags apply to the _entire session_ without context for:

- Which character(s) they affect
- Which situations trigger them
- When they should be active vs. inactive

**No Composability:**
Tags don't interact with each other or the personality system. A tag can't say "only apply when the character is stressed" or "amplify when talking to strangers."

**Maintenance Burden:**
The TagBuilder UI is outdated and requires maintenance. If tags aren't providing significant value, this is wasted effort.

### 2.2 Arguments for Keeping Tags (with Enhancements)

**User Freedom:**
Not everything fits into the Big Five or predefined taxonomies. Users may want:

- Custom narrative styles ("Write like Hemingway")
- Game mechanics prompts ("Roll checks with 2d6")
- Content preferences ("Keep combat descriptions brief")
- World-building rules ("Magic requires verbal components")

**Session-Level Concerns:**
Some behaviors are truly session-wide, not character-specific:

- GM/narrator style preferences
- Tone and rating guidelines
- Pacing preferences
- Meta-game rules

**Rapid Prototyping:**
Tags let users experiment with prompts without modifying character/setting JSON.

**Modularity:**
A tag can be shared across multiple sessions without duplicating content.

## 3. Proposed Direction: Evolution, Not Deprecation

Rather than removing tags, I propose evolving them into a **more powerful and targeted system** that complements the personality schema.

### 3.1 New Tag Taxonomy

```typescript
export const TAG_CATEGORIES = [
  'style', // Narrative/writing style directives
  'mechanic', // Game mechanics and rule systems
  'content', // Content preferences and restrictions
  'world', // World-building rules and lore constraints
  'behavior', // Character behavior modifiers (complements personality)
  'trigger', // Conditional prompts based on situations
  'meta', // Meta-game and session management
] as const;

export type TagCategory = (typeof TAG_CATEGORIES)[number];
```

### 3.2 Target Binding

Tags should be able to target specific entities:

```typescript
export const TAG_TARGET_TYPES = [
  'session', // Applies to entire session (current behavior)
  'character', // Applies to specific character(s)
  'npc', // Applies only to NPCs, not player
  'player', // Applies only to player character
  'location', // Active when in specific location(s)
  'setting', // Applies to setting/world context
  'relationship', // Active for specific relationship levels
] as const;

export type TagTargetType = (typeof TAG_TARGET_TYPES)[number];

export interface TagTarget {
  type: TagTargetType;
  /** Entity IDs this tag applies to (null = all entities of type) */
  entityIds?: string[];
  /** For relationship targets, the relationship levels to match */
  relationshipLevels?: RelationshipLevel[];
}
```

### 3.3 Conditional Activation

Tags should support conditional triggering:

```typescript
export const TAG_TRIGGER_CONDITIONS = [
  'always', // Always active
  'intent', // Active for specific intents
  'emotion', // Active when character in emotional state
  'stress', // Active under stress conditions
  'relationship', // Active at relationship levels
  'time', // Active during time periods
  'location', // Active in locations
  'keyword', // Active when keywords detected in input
  'state', // Active based on state flags
] as const;

export type TagTriggerCondition = (typeof TAG_TRIGGER_CONDITIONS)[number];

export interface TagTrigger {
  condition: TagTriggerCondition;
  /** Condition-specific parameters */
  params?: Record<string, unknown>;
  /** If true, trigger inverts (active when condition is NOT met) */
  invert?: boolean;
}
```

### 3.4 Priority and Composition

Tags should have clear ordering and composition rules:

```typescript
export const TAG_PRIORITIES = [
  'override', // Always applied, can override other tags
  'high', // High priority, applied early
  'normal', // Default priority
  'low', // Low priority, applied late
  'fallback', // Only applied if no higher-priority tag matches
] as const;

export type TagPriority = (typeof TAG_PRIORITIES)[number];

export const TAG_COMPOSITION_MODES = [
  'append', // Add to existing prompts
  'prepend', // Add before existing prompts
  'replace', // Replace conflicting prompts
  'merge', // Attempt to merge with existing
] as const;

export type TagCompositionMode = (typeof TAG_COMPOSITION_MODES)[number];
```

### 3.5 Enhanced Tag Schema

```typescript
export const TAG_ACTIVATION_MODES = [
  'always', // Always injected - zero runtime cost
  'conditional', // Evaluated per-turn based on triggers
] as const;

export type TagActivationMode = (typeof TAG_ACTIVATION_MODES)[number];

export const TAG_VISIBILITIES = [
  'private', // Only visible to owner
  'public', // Listed in public library
  'unlisted', // Shareable via direct link, not in library
] as const;

export type TagVisibility = (typeof TAG_VISIBILITIES)[number];

export const TagDefinitionSchema = z.object({
  // Identity
  id: z.string().uuid(),
  owner: z.string().min(1).default('admin'),
  visibility: z.enum(TAG_VISIBILITIES).default('public'),
  name: z.string().min(1).max(100),
  shortDescription: z.string().max(500).optional(),

  // Classification
  category: z.enum(TAG_CATEGORIES).default('style'),

  // The actual prompt content
  promptText: z.string().min(1).max(10000),

  // Activation mode
  activationMode: z.enum(TAG_ACTIVATION_MODES).default('always'),

  // Targeting (binding happens at session level via SessionTagBinding)
  targetType: z.enum(TAG_TARGET_TYPES).default('session'),

  // Activation conditions (only evaluated when activationMode === 'conditional')
  triggers: z.array(TagTriggerSchema).default([]),

  // Composition behavior (deferred to v2)
  priority: z.enum(TAG_PRIORITIES).default('normal'),
  compositionMode: z.enum(TAG_COMPOSITION_MODES).default('append'),

  // Conflict handling (deferred to v2)
  conflictsWith: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),

  // Versioning
  version: z.string().default('1.0.0'), // semver: X.Y.Z
  changelog: z.string().max(1000).optional(), // If provided, version increments on save

  // Metadata
  isBuiltIn: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type TagDefinition = z.infer<typeof TagDefinitionSchema>;
```

## 4. Integration with Personality System

### 4.1 Tags as Personality Supplements

Tags should _complement_ the personality system, not duplicate it:

```typescript
/**
 * Tag-Personality Integration:
 *
 * Personality traits provide CHARACTER-INTRINSIC behavior:
 * - How the character naturally behaves
 * - Core personality dimensions and facets
 * - Emotional baselines and stress responses
 *
 * Tags provide EXTRINSIC modifiers:
 * - Narrative style preferences (how the LLM writes)
 * - Mechanical rules (how the game works)
 * - Situational overrides (when context demands different behavior)
 * - User preferences (content filters, pacing, etc.)
 */
```

### 4.2 Trait-Tag Binding

Some tags should explicitly bind to personality traits:

```typescript
export interface TraitBoundTag {
  /** The trait ID this tag modifies (e.g., 'friendliness:high') */
  boundTraitId: string;

  /** How the tag modifies the trait's behavior */
  modification: 'amplify' | 'suppress' | 'redirect' | 'contextualize';

  /** The modification strength (0-1) */
  strength: number;

  /** When this modification applies */
  context?: string; // e.g., "when stressed", "with strangers"
}

// Example: A tag that amplifies friendliness toward children
const childFriendlyTag: EnhancedTagDefinition = {
  id: 'uuid-here',
  owner: 'system',
  name: 'Child-Friendly',
  category: 'behavior',
  promptText: 'When interacting with children, speak gently and show extra patience.',
  targets: [{ type: 'character' }],
  triggers: [
    {
      condition: 'keyword',
      params: { keywords: ['child', 'kid', 'boy', 'girl', 'young'] },
    },
  ],
  priority: 'high',
  compositionMode: 'prepend',
};
```

## 5. Built-in Tag Library

### 5.1 Style Tags

```typescript
const BUILT_IN_STYLE_TAGS = [
  {
    name: 'Minimalist Prose',
    category: 'style',
    promptText: 'Use short, declarative sentences. Avoid purple prose. Let actions speak.',
  },
  {
    name: 'Evocative Description',
    category: 'style',
    promptText: 'Paint vivid sensory pictures. Use metaphor and simile. Engage all senses.',
  },
  {
    name: 'Dialogue Heavy',
    category: 'style',
    promptText:
      'Favor dialogue over narration. Show character through speech. Minimize exposition.',
  },
  {
    name: 'Internal Monologue',
    category: 'style',
    promptText:
      'Include character thoughts and internal reactions. Show motivation through reflection.',
  },
] as const;
```

### 5.2 Mechanic Tags

```typescript
const BUILT_IN_MECHANIC_TAGS = [
  {
    name: 'Roll-Based Outcomes',
    category: 'mechanic',
    promptText:
      'When uncertainty exists, roll dice. State the roll and interpret results. Format: [Roll: 2d6 → result]',
  },
  {
    name: 'Skill Checks',
    category: 'mechanic',
    promptText:
      'When characters attempt difficult actions, reference their skills. Describe how competence affects outcomes.',
  },
  {
    name: 'Resource Tracking',
    category: 'mechanic',
    promptText:
      'Track consumable resources. Note when items are used or depleted. Mention inventory constraints.',
  },
] as const;
```

### 5.3 Content Tags

```typescript
const BUILT_IN_CONTENT_TAGS = [
  {
    name: 'Fade to Black',
    category: 'content',
    promptText:
      'Intimate scenes fade to black. Suggest rather than describe. Resume after time skip.',
  },
  {
    name: 'Graphic Violence',
    category: 'content',
    promptText: 'Combat is visceral and detailed. Describe injuries, blood, and consequences.',
  },
  {
    name: 'Family Friendly',
    category: 'content',
    promptText: 'Keep content appropriate for all ages. No explicit violence, language, or themes.',
  },
] as const;
```

### 5.4 World Tags

```typescript
const BUILT_IN_WORLD_TAGS = [
  {
    name: 'Verbal Magic',
    category: 'world',
    promptText:
      'Magic requires spoken incantations. Mages must speak to cast. Silence blocks spellcasting.',
  },
  {
    name: 'Technology Grounded',
    category: 'world',
    promptText: 'Technology follows real-world physics. No handwaving. Explain how devices work.',
  },
  {
    name: 'Consequences Matter',
    category: 'world',
    promptText:
      'Actions have lasting consequences. NPCs remember. The world reacts to player choices.',
  },
] as const;
```

## 6. Tag Resolution System

### 6.1 Resolution Pipeline

```typescript
interface TagResolutionContext {
  sessionId: string;
  characterId?: string;
  npcId?: string;
  locationId?: string;
  intent: AgentIntent;
  emotionalState?: EmotionalState;
  relationshipLevel?: RelationshipLevel;
  timeOfDay?: string;
  keywords: string[];
  stateFlags: Record<string, boolean>;
}

/**
 * Resolves which tags are active given the current context.
 */
export function resolveActiveTags(
  allTags: EnhancedTagDefinition[],
  context: TagResolutionContext
): EnhancedTagDefinition[] {
  return allTags
    .filter((tag) => isTagActive(tag, context))
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

/**
 * Assembles tag prompts into injection-ready content.
 */
export function assembleTagPrompts(
  activeTags: EnhancedTagDefinition[],
  context: TagResolutionContext
): string[] {
  const prompts: string[] = [];
  const seenCategories = new Set<TagCategory>();

  for (const tag of activeTags) {
    // Handle composition modes
    if (tag.compositionMode === 'replace' && seenCategories.has(tag.category)) {
      continue; // Skip if replaced by earlier tag
    }

    prompts.push(tag.promptText);
    seenCategories.add(tag.category);
  }

  return prompts;
}
```

### 6.2 Conflict Resolution

```typescript
/**
 * Validates tag set for conflicts.
 */
export function validateTagSet(tags: EnhancedTagDefinition[]): {
  valid: boolean;
  conflicts: Array<{ tag1: string; tag2: string; reason: string }>;
  missingRequirements: Array<{ tag: string; requires: string }>;
} {
  const conflicts: Array<{ tag1: string; tag2: string; reason: string }> = [];
  const missingRequirements: Array<{ tag: string; requires: string }> = [];
  const tagNames = new Set(tags.map((t) => t.name));

  for (const tag of tags) {
    // Check explicit conflicts
    for (const conflictName of tag.conflictsWith ?? []) {
      if (tagNames.has(conflictName)) {
        conflicts.push({
          tag1: tag.name,
          tag2: conflictName,
          reason: 'Explicitly declared conflict',
        });
      }
    }

    // Check requirements
    for (const reqName of tag.requires ?? []) {
      if (!tagNames.has(reqName)) {
        missingRequirements.push({
          tag: tag.name,
          requires: reqName,
        });
      }
    }
  }

  return {
    valid: conflicts.length === 0 && missingRequirements.length === 0,
    conflicts,
    missingRequirements,
  };
}
```

## 7. UI Considerations

### 7.1 Enhanced TagBuilder Features

The updated TagBuilder should support:

1. **Category Selection** - Dropdown for tag category
2. **Target Configuration** - Multi-select for target types with entity pickers
3. **Trigger Builder** - Visual trigger condition builder
4. **Priority & Composition** - Dropdowns for priority and composition mode
5. **Conflict Declaration** - Tag relationship editor
6. **Preview Panel** - Shows when tag would be active based on sample contexts
7. **Template Library** - Browse and clone built-in tags

### 7.2 Session Tag Manager

A new "Tag Manager" view in sessions:

- Shows all tags attached to the session
- Displays which tags are currently active
- Allows quick enable/disable toggles
- Shows tag activation history
- Provides conflict warnings

## 8. Alternative: Merge Tags into Other Systems

### 8.1 The "No Tags" Approach

Instead of enhancing tags, we could:

1. **Merge style tags into settings** - Add `narrativeStyle` field to SettingProfile
2. **Merge behavior tags into personality** - Extend the trait prompt system
3. **Merge mechanic tags into session config** - Add `gameRules` to session schema
4. **Merge content tags into safety system** - Extend content filtering

This would eliminate the tag system entirely, reducing complexity.

### 8.2 Pros and Cons

**Pros of merging:**

- Simpler mental model (no "where does this go?" questions)
- Less code to maintain
- Cleaner integration with existing systems

**Cons of merging:**

- Less flexibility for user-created content
- Harder to share configurations across sessions
- Some things genuinely are "add-ons" and don't fit existing schemas

## 9. Recommendation

I recommend **Option A: Enhanced Tags with Targeting**.

**Rationale:**

1. The current tag system is too simple to be useful
2. The personality system handles character behavior well, but not session/world concerns
3. Targeted, conditional tags provide value that other systems can't easily replicate
4. A well-designed tag system encourages community sharing and experimentation

**Migration path:**

1. Drop existing `prompt_tags` table (no migration needed—existing tags will be deleted)
2. Recreate `prompt_tags` table with new enhanced schema columns
3. Rename schema to `TagDefinitionSchema` (replaces old schema, same table name)

## 10. Open Questions

1. **Storage**: Should enhanced tags be stored in the same table with nullable new fields, or a new table?

   > **Response**: Create a new table and we will deprecate the current one when ready.

   **Feedback**: Agreed. We'll create `enhanced_prompt_tags` (or similar) with all new columns. The schema will be `EnhancedTagDefinitionSchema`. We can add a simple migration script later that converts old `prompt_tags` rows into the new format (category defaults to `'style'`, triggers default to `[{ condition: 'always' }]`, etc.).

   > **Response 2**: We do not need to convert old prompt_tags because I will be deleting the existing ones. Instead, when we begin development of the enhanced tags, let's drop the old promp_tags table and recreate prompt_tags (instead of enhanced_prompt_tags) with the new enhanced schema, for table name simplicity.

2. **Permissions**: Should tags be user-owned, or can they be shared publicly?

   > **Response**: Tags will eventually be created by developers only so the owner should normally be admin, but we should retain the ability to allow users to create them if we decide to go that route. If we do, they would likely be private to individual users unless they chose to share them in the public library.

   **Feedback**: Good approach. I suggest we model this with two fields:
   - `owner: string` — the creator (admin, or user ID)
   - `visibility: 'private' | 'public' | 'unlisted'` — unlisted means shareable via direct link but not in public library

   For now, we can default all tags to `owner: 'admin'` and `visibility: 'public'`. This keeps the door open for user-created tags without over-engineering upfront.

   > **Response 2**: I agree.

3. **Versioning**: How do we handle breaking changes to built-in tags?

   > **Response**: We should test any changes to tags prior to moving them to production. I'm open to your suggestions about improving this process. I do not see it as a major risk.

   **Feedback**: Agreed it's low risk. For safety, I suggest:
   - Built-in tags get a `version: number` field (start at 1)
   - When we update a built-in tag, we increment version and add a `changelog` entry
   - Sessions that use built-in tags store a reference to the tag ID, not a copy—so updates propagate automatically
   - If we ever need a breaking change, we can create a new tag and deprecate the old one

   > **Response 2**: Agreed. How about an enhancement is that we have the changelog field and increment version on save (so 1.0.0 would be come 1.0.1; decimals are single digit so 1.0.9 if incremented would become 1.1.0). The changelog field is NOT required, and if left blank, the version number will not increment. This prevents version number being incremented if save is accidentally clicked or if insubstantial changes are made.

4. **Performance**: With conditional triggers, how do we efficiently evaluate tag activation?

   > **Response**: My initial design was that tags would always be present in the relevant agent's prompt, but I like the idea of conditional triggers. Speak more about what we could do with this. Maybe some tags could be flagged as conditional and some could be the vanilla "always present" prompt injections.

   **Feedback**: Great instinct. I propose a **hybrid model**:

   ```typescript
   export const TAG_ACTIVATION_MODES = [
     'always', // Always injected (current behavior) - zero runtime cost
     'conditional', // Evaluated per-turn based on triggers
   ] as const;
   ```

   **Always-active tags** (the majority):
   - Loaded once when session starts
   - Concatenated into a cached prompt fragment
   - No per-turn evaluation

   **Conditional tags**:
   - Evaluated each turn by the tag resolution pipeline
   - Trigger conditions are simple predicate checks (not LLM calls):
     - `intent`: check `intent.type === 'talk'` (O(1))
     - `keyword`: check `input.includes(keyword)` (O(n) where n = keywords)
     - `emotion`: check `emotionalState.primary === 'fear'` (O(1))
     - `relationship`: check `relationshipLevel in ['friend', 'close']` (O(1))

   This keeps evaluation fast (microseconds per tag) while enabling dynamic behavior. For complex conditions that truly need LLM reasoning, we could add a `'llm-evaluated'` mode later, but I'd defer that—most use cases can be handled with simple predicates.

   > **Response 2**: Agreed.

5. **Entity Binding**: Should we support binding tags to entities at creation time, or only at session level?

   > **Response**: Only at session level. On creation, all entities (locations, characters, tags, items) are isolated templates.

   **Feedback**: Perfect. This aligns with the template/instance pattern already established. Tags are templates; `SessionTagBinding` (a new junction table) connects them to sessions and optionally to specific entities within that session:

   ```typescript
   // When attaching a tag to a session
   interface SessionTagBinding {
     sessionId: string;
     tagId: string;
     targetType: TagTargetType; // 'session' | 'character' | 'npc' | ...
     targetEntityId?: string; // null = applies to all of targetType
     enabled: boolean; // quick toggle without removing
     createdAt: Date;
   }
   ```

   > **Response 2**: Agreed.

6. **Trait Interaction**: How deeply should tags integrate with the personality trait system?

   > **Response**: Perhaps (and this is an advanced idea which may not be feasible) there can be a checking system. When tags are created, they are isolated so no check needs to be done. But when a tag is added to a session and tied to an entity (a character for example) an agent can quickly check the tags and the target's traits to determine if they clash. This would probably be an LLM using reasoning to check because we cannot possibly hard code every possible tag value.

   **Feedback**: I love this idea. Here's a phased approach:

   **Phase 1 (Now)**: No automatic checking. Tags and traits coexist independently.

   **Phase 2 (Near-term)**: Soft warnings via heuristics. We add optional `relatedTraits` to tags:

   ```typescript
   relatedTraits?: {
     traitId: string;           // e.g., 'friendliness:high'
     relationship: 'supports' | 'conflicts' | 'modifies';
   }[];
   ```

   When binding a tag to a character, we check if any `conflicts` traits are present and show a warning (not a blocker).

   **Phase 3 (Advanced)**: LLM-based compatibility check. When a user binds a tag to an entity, we run a quick LLM call:

   ```text
   System: You are a consistency checker. Given a character's personality traits and a tag's prompt text, identify any potential conflicts or contradictions.

   Character Traits: [extracted trait prompts]
   Tag Prompt: [tag.promptText]

   Respond with: COMPATIBLE, WARNING: <reason>, or CONFLICT: <reason>
   ```

   This could be a lightweight model call (DeepSeek or similar) that runs async when the binding is created. Results are cached and shown in the UI as a badge.

   This is definitely feasible—the key is making it async and advisory rather than blocking.

   > **Response 2**: Agreed. For now (phase 1) we will keep the tags as simple injections without checking and will plan future phases when other tag-based work is done.

7. **UI Priority**: Is the enhanced TagBuilder worth the development investment, or should we prioritize other features?

   > **Response**: I think we should work on tags next as characters are done (in an alpha state) and settings / locations / items are less important for test sessions.

   **Feedback**: Agreed. For the MVP TagBuilder, I suggest focusing on:
   1. **Core fields**: name, category, promptText (keep it simple)
   2. **Activation mode**: toggle between "always" and "conditional"
   3. **Simple trigger builder**: for conditional tags, a basic UI to select trigger type + params
   4. **Target type selector**: dropdown for session/character/npc/etc.
   5. **Preview panel**: shows the assembled prompt text

   We can defer these to v2:
   - Priority/composition controls
   - Conflict declaration
   - Template library browser
   - LLM-based trait compatibility checking

   This gives us a functional enhanced tag system for testing without over-investing in UI polish.

   > **Response 2**: Agreed.

## 11. Next Steps

### Phase 1: MVP Implementation

1. [x] Drop old `prompt_tags` table and recreate with enhanced schema
2. [x] Implement `TagDefinitionSchema` in `packages/schemas/src/tags/definitions.ts`
3. [x] Define `TagTriggerSchema` with condition type discriminators
4. [x] Create `SessionTagBinding` junction table for session-entity binding
5. [x] Update `prompt.ts` to use tag resolution (always vs conditional)
6. [x] Build MVP TagBuilder UI:
   - Core fields: name, category, promptText
   - Activation mode toggle (always/conditional)
   - Simple trigger builder for conditional tags
   - Target type dropdown
   - Preview panel
7. [x] Create initial built-in tag library (style, content, world tags)

### Phase 2: Enhancements (Deferred)

- [ ] Priority/composition controls in UI
- [ ] Conflict declaration and validation
- [ ] Template library browser
- [ ] `relatedTraits` field for heuristic conflict warnings
- [ ] LLM-based trait compatibility checking

---

## Appendix A: Current Tag Flow

```mermaid
┌────────────────────┐
│   TagBuilder UI    │
│  (simple form)     │
└─────────┬──────────┘
          │ saves
          ▼
┌────────────────────┐
│  TagDefinition     │
│  (Postgres)        │
└─────────┬──────────┘
          │ attached to session
          ▼
┌────────────────────┐
│ SessionTagInstance │
│  (per-session)     │
└─────────┬──────────┘
          │ loaded for turns
          ▼
┌────────────────────┐
│   prompt.ts        │
│  (blind concat)    │
└────────────────────┘
```

## Appendix B: Enhanced Tag Flow

```text
┌──────────────────────────┐
│      TagBuilder UI       │
│  (category, activation,  │
│   triggers, target type) │
└───────────┬──────────────┘
            │ saves
            ▼
┌──────────────────────────┐
│    TagDefinition         │
│  (prompt_tags table)     │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│   SessionTagBinding      │
│  (junction table)        │
│  binds tag + entity      │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│    Tag Resolution        │
│  always: cached prompt   │
│  conditional: per-turn   │
└───────────┬──────────────┘
            │ active tags
            ▼
┌──────────────────────────┐
│   Context Builder        │
│  (injects per-entity)    │
└──────────────────────────┘
```

## Appendix C: Versioning Behavior

```text
Version format: X.Y.Z (semver-style, single digit per segment)

On save:
  IF changelog field is empty:
    → version unchanged (prevents accidental bumps)
  ELSE:
    → increment Z (patch): 1.0.0 → 1.0.1
    → if Z = 9, roll over: 1.0.9 → 1.1.0
    → if Y = 9, roll over: 1.9.9 → 2.0.0
    → append changelog entry to history
```
