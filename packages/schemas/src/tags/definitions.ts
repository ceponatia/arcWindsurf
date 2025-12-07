import { z } from 'zod';

// ============================================================================
// Tag Categories
// ============================================================================

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

// ============================================================================
// Activation Modes
// ============================================================================

export const TAG_ACTIVATION_MODES = [
  'always', // Always injected - zero runtime cost
  'conditional', // Evaluated per-turn based on triggers
] as const;

export type TagActivationMode = (typeof TAG_ACTIVATION_MODES)[number];

// ============================================================================
// Visibility
// ============================================================================

export const TAG_VISIBILITIES = [
  'private', // Only visible to owner
  'public', // Listed in public library
  'unlisted', // Shareable via direct link, not in library
] as const;

export type TagVisibility = (typeof TAG_VISIBILITIES)[number];

// ============================================================================
// Target Types
// ============================================================================

export const TAG_TARGET_TYPES = [
  'session', // Applies to entire session (current behavior)
  'character', // Applies to specific character(s)
  'npc', // Applies only to NPCs, not player
  'player', // Applies only to player character
  'location', // Active when in specific location(s)
  'setting', // Applies to setting/world context
] as const;

export type TagTargetType = (typeof TAG_TARGET_TYPES)[number];

// ============================================================================
// Trigger Conditions
// ============================================================================

export const TAG_TRIGGER_CONDITIONS = [
  'intent', // Active for specific intents (talk, move, examine, etc.)
  'keyword', // Active when keywords detected in input
  'emotion', // Active when character in emotional state
  'relationship', // Active at relationship levels
  'time', // Active during time periods
  'location', // Active in locations
  'state', // Active based on state flags
] as const;

export type TagTriggerCondition = (typeof TAG_TRIGGER_CONDITIONS)[number];

/**
 * Trigger schema - defines when a conditional tag is active.
 * Each trigger type has specific params.
 */
export const TagTriggerSchema = z.object({
  /** The condition type */
  condition: z.enum(TAG_TRIGGER_CONDITIONS),

  /** Condition-specific parameters */
  params: z
    .object({
      // For 'intent': which intent types trigger this
      intents: z.array(z.string()).optional(),

      // For 'keyword': which keywords trigger this
      keywords: z.array(z.string()).optional(),

      // For 'emotion': which emotions trigger this
      emotions: z.array(z.string()).optional(),

      // For 'relationship': which levels trigger this
      relationshipLevels: z.array(z.string()).optional(),

      // For 'time': time range (e.g., "morning", "night")
      timeRange: z.string().optional(),

      // For 'location': location IDs or tags
      locationIds: z.array(z.string()).optional(),
      locationTags: z.array(z.string()).optional(),

      // For 'state': state flag keys
      stateFlags: z.array(z.string()).optional(),
    })
    .optional(),

  /** If true, trigger inverts (active when condition is NOT met) */
  invert: z.boolean().default(false),
});

export type TagTrigger = z.infer<typeof TagTriggerSchema>;

// ============================================================================
// Priority and Composition (v2 - included but not used in MVP)
// ============================================================================

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

// ============================================================================
// Main Tag Definition Schema
// ============================================================================

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

  // Composition behavior (deferred to v2 - included for schema completeness)
  priority: z.enum(TAG_PRIORITIES).default('normal'),
  compositionMode: z.enum(TAG_COMPOSITION_MODES).default('append'),

  // Conflict handling (deferred to v2)
  conflictsWith: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),

  // Versioning
  version: z.string().default('1.0.0'),
  changelog: z.string().max(1000).optional(),

  // Metadata
  isBuiltIn: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type TagDefinition = z.infer<typeof TagDefinitionSchema>;

// ============================================================================
// Session Tag Binding (junction table schema)
// ============================================================================

/**
 * Binds a tag to a session, optionally targeting a specific entity.
 * This is stored in a junction table, not on the tag itself.
 */
export const SessionTagBindingSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  tagId: z.string().uuid(),

  // Which entity type this binding targets
  targetType: z.enum(TAG_TARGET_TYPES).default('session'),

  // Optional: specific entity ID (null = applies to all of targetType)
  targetEntityId: z.string().uuid().nullable().default(null),

  // Quick toggle without removing the binding
  enabled: z.boolean().default(true),

  createdAt: z.date().optional(),
});

export type SessionTagBinding = z.infer<typeof SessionTagBindingSchema>;

// ============================================================================
// Deprecated: Session Tag Instance (kept for backward compatibility)
// Will be removed after migration to SessionTagBinding
// ============================================================================

export const SessionTagInstanceSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  tagId: z.string().uuid().nullable(),
  name: z.string(),
  shortDescription: z.string().optional(),
  promptText: z.string(),
  createdAt: z.date().optional(),
});

export type SessionTagInstance = z.infer<typeof SessionTagInstanceSchema>;
