/**
 * Dialogue Tree Schemas
 *
 * Runtime validation for dialogue trees, conditions, and effects.
 */
import { z } from 'zod';

// =============================================================================
// Dialogue Tone
// =============================================================================

/**
 * Voice or tone hint for the NPC line.
 */
export const DialogueToneSchema = z.enum([
  'neutral',
  'angry',
  'happy',
  'sad',
  'mysterious',
]);

// =============================================================================
// Conditions
// =============================================================================

export const DialogueQuestStatusSchema = z.enum(['not_started', 'active', 'complete']);

export const DialogueConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('relationship'),
    factionId: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({
    type: z.literal('quest'),
    questId: z.string().min(1),
    status: DialogueQuestStatusSchema,
  }),
  z.object({
    type: z.literal('item'),
    itemId: z.string().min(1),
    has: z.boolean(),
  }),
  z.object({
    type: z.literal('flag'),
    flagId: z.string().min(1),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal('time'),
    after: z.number().optional(),
    before: z.number().optional(),
  }),
  z.object({
    type: z.literal('custom'),
    evaluator: z.string().min(1),
  }),
]);

// =============================================================================
// Effects
// =============================================================================

export const DialogueQuestActionSchema = z.enum(['start', 'advance', 'complete']);
export const DialogueItemActionSchema = z.enum(['give', 'take']);

export const DialogueEffectSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('reputation'),
    factionId: z.string().min(1),
    delta: z.number(),
  }),
  z.object({
    type: z.literal('quest'),
    questId: z.string().min(1),
    action: DialogueQuestActionSchema,
  }),
  z.object({
    type: z.literal('item'),
    itemId: z.string().min(1),
    action: DialogueItemActionSchema,
    quantity: z.number().int().positive().optional(),
  }),
  z.object({
    type: z.literal('flag'),
    flagId: z.string().min(1),
    value: z.boolean(),
  }),
  z.object({
    type: z.literal('custom'),
    handler: z.string().min(1),
  }),
]);

// =============================================================================
// Dialogue Nodes
// =============================================================================

export const DialogueOptionSchema = z.object({
  id: z.string().min(1),
  playerText: z.string().min(1),
  nextNodeId: z.string().nullable(),
  conditions: z.array(DialogueConditionSchema).optional(),
  effects: z.array(DialogueEffectSchema).optional(),
  hint: z.string().optional(),
});

export const DialogueNodeSchema = z.object({
  id: z.string().min(1),
  npcLine: z.string().min(1),
  tone: DialogueToneSchema.optional(),
  conditions: z.array(DialogueConditionSchema).optional(),
  options: z.array(DialogueOptionSchema),
  onEnter: z.array(DialogueEffectSchema).optional(),
});

// =============================================================================
// Dialogue Tree
// =============================================================================

export const DialogueTriggerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('keyword'),
    keywords: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('topic'),
    topic: z.string().min(1),
  }),
  z.object({
    type: z.literal('greeting'),
    priority: z.number().int().min(0).optional(),
  }),
  z.object({
    type: z.literal('quest'),
    questId: z.string().min(1),
  }),
  z.object({
    type: z.literal('item'),
    itemId: z.string().min(1),
  }),
]);

export const DialogueTreeSchema = z.object({
  id: z.string().min(1),
  npcId: z.string().min(1),
  trigger: DialogueTriggerSchema,
  startNodeId: z.string().min(1),
  nodes: z.record(z.string(), DialogueNodeSchema),
});

// =============================================================================
// Dialogue State
// =============================================================================

export const DialogueStateSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  npcId: z.string().min(1),
  treeId: z.string().min(1),
  currentNodeId: z.string().nullable(),
  visitedNodes: z.array(z.string()),
});
