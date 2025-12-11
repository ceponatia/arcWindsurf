import { z } from 'zod';

/**
 * Types of actions that can be performed in the game world
 */
export const ActionTypeSchema = z.enum([
  'move',
  'take',
  'use',
  'consume',
  'observe',
  'interact',
  'attack',
  'talk',
  'give',
  'drop',
  'wear',
  'remove',
  'open',
  'close',
  'other',
]);

export type ActionType = z.infer<typeof ActionTypeSchema>;

/**
 * Requirements that must be met for an action to succeed
 */
export const ActionRequirementSchema = z.object({
  type: z.enum(['location', 'item', 'state', 'proximity']),
  target: z.string(),
  description: z.string(),
});

export type ActionRequirement = z.infer<typeof ActionRequirementSchema>;

/**
 * State changes that result from an action
 */
export const StateChangeSchema = z.object({
  entity: z.string(),
  property: z.string(),
  oldValue: z.unknown().optional(),
  newValue: z.unknown(),
  description: z.string(),
});

export type StateChange = z.infer<typeof StateChangeSchema>;

/**
 * A single parsed action from player input
 */
export const ParsedActionSchema = z.object({
  id: z.string(),
  order: z.number().int().positive(),
  type: ActionTypeSchema,
  description: z.string(),
  target: z.string().optional(),
  requirements: z.array(ActionRequirementSchema).optional(),
  stateChanges: z.array(StateChangeSchema).optional(),
});

export type ParsedAction = z.infer<typeof ParsedActionSchema>;

/**
 * Source of an action interrupt
 */
export const InterruptSourceSchema = z.enum(['environment', 'npc', 'rule', 'random']);

export type InterruptSource = z.infer<typeof InterruptSourceSchema>;

/**
 * An interrupt that stops action processing
 */
export const ActionInterruptSchema = z.object({
  interruptedActionId: z.string(),
  reason: z.string(),
  source: InterruptSourceSchema,
  blocking: z.boolean(),
  consequence: z.string().optional(),
  recoverable: z.boolean(),
});

export type ActionInterrupt = z.infer<typeof ActionInterruptSchema>;

/**
 * A sequence of actions with dependencies
 */
export const ActionSequenceSchema = z.object({
  actions: z.array(ParsedActionSchema),
  dependencies: z.record(z.string(), z.array(z.string())),
});

export type ActionSequence = z.infer<typeof ActionSequenceSchema>;

/**
 * Sensory context for a single action
 */
export const ActionSensoryContextSchema = z.object({
  actionId: z.string(),
  actionDescription: z.string(),
  sensory: z.object({
    smell: z.array(z.unknown()).optional(),
    touch: z.array(z.unknown()).optional(),
    taste: z.array(z.unknown()).optional(),
    sound: z.array(z.unknown()).optional(),
    sight: z.array(z.unknown()).optional(),
  }),
});

export type ActionSensoryContext = z.infer<typeof ActionSensoryContextSchema>;

/**
 * Accumulated sensory context across multiple actions
 */
export const AccumulatedSensoryContextSchema = z.object({
  perAction: z.array(ActionSensoryContextSchema),
});

export type AccumulatedSensoryContext = z.infer<typeof AccumulatedSensoryContextSchema>;

/**
 * Result of processing an action sequence
 */
export const ActionSequenceResultSchema = z.object({
  completedActions: z.array(ParsedActionSchema),
  interruptedAt: ActionInterruptSchema.optional(),
  pendingActions: z.array(ParsedActionSchema),
  accumulatedContext: AccumulatedSensoryContextSchema,
  finalState: z.record(z.string(), z.unknown()),
});

export type ActionSequenceResult = z.infer<typeof ActionSequenceResultSchema>;

/**
 * Precondition check result
 */
export const PreconditionResultSchema = z.object({
  met: z.boolean(),
  reason: z.string().optional(),
});

export type PreconditionResult = z.infer<typeof PreconditionResultSchema>;
