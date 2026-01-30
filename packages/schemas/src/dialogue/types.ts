/**
 * Dialogue Tree Types
 *
 * TypeScript types for dialogue trees, nodes, conditions, and effects.
 */
import type { z } from 'zod';
import type {
  DialogueConditionSchema,
  DialogueEffectSchema,
  DialogueNodeSchema,
  DialogueOptionSchema,
  DialogueQuestActionSchema,
  DialogueQuestStatusSchema,
  DialogueItemActionSchema,
  DialogueToneSchema,
  DialogueTreeSchema,
  DialogueTriggerSchema,
  DialogueStateSchema,
} from './schemas.js';

export type DialogueTone = z.infer<typeof DialogueToneSchema>;
export type DialogueQuestStatus = z.infer<typeof DialogueQuestStatusSchema>;
export type DialogueQuestAction = z.infer<typeof DialogueQuestActionSchema>;
export type DialogueItemAction = z.infer<typeof DialogueItemActionSchema>;
export type DialogueCondition = z.infer<typeof DialogueConditionSchema>;
export type DialogueEffect = z.infer<typeof DialogueEffectSchema>;
export type DialogueOption = z.infer<typeof DialogueOptionSchema>;
export type DialogueNode = z.infer<typeof DialogueNodeSchema>;
export type DialogueTrigger = z.infer<typeof DialogueTriggerSchema>;
export type DialogueTree = z.infer<typeof DialogueTreeSchema>;
export type DialogueState = z.infer<typeof DialogueStateSchema>;
