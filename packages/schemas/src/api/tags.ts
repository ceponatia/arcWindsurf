import { z } from 'zod';
import {
  TAG_CATEGORIES,
  TAG_ACTIVATION_MODES,
  TAG_TARGET_TYPES,
  TAG_VISIBILITIES,
  TAG_PRIORITIES,
  TAG_COMPOSITION_MODES,
  TagDefinitionSchema,
  TagTriggerSchema,
  SessionTagBindingSchema,
} from '../tags/index.js';

// ============================================================================
// Tag CRUD Requests/Responses
// ============================================================================

export const CreateTagRequestSchema = z.object({
  name: z.string().min(1).max(100),
  shortDescription: z.string().max(500).optional(),
  category: z.enum(TAG_CATEGORIES).optional(),
  promptText: z.string().min(1).max(10000),
  activationMode: z.enum(TAG_ACTIVATION_MODES).optional(),
  targetType: z.enum(TAG_TARGET_TYPES).optional(),
  triggers: z.array(TagTriggerSchema).optional(),
  priority: z.enum(TAG_PRIORITIES).optional(),
  compositionMode: z.enum(TAG_COMPOSITION_MODES).optional(),
  conflictsWith: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),
  visibility: z.enum(TAG_VISIBILITIES).optional(),
});

export type CreateTagRequest = z.infer<typeof CreateTagRequestSchema>;

export const UpdateTagRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  shortDescription: z.string().max(500).optional(),
  category: z.enum(TAG_CATEGORIES).optional(),
  promptText: z.string().min(1).max(10000).optional(),
  activationMode: z.enum(TAG_ACTIVATION_MODES).optional(),
  targetType: z.enum(TAG_TARGET_TYPES).optional(),
  triggers: z.array(TagTriggerSchema).optional(),
  priority: z.enum(TAG_PRIORITIES).optional(),
  compositionMode: z.enum(TAG_COMPOSITION_MODES).optional(),
  conflictsWith: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),
  visibility: z.enum(TAG_VISIBILITIES).optional(),
  changelog: z.string().max(1000).optional(), // If provided, version will increment
});

export type UpdateTagRequest = z.infer<typeof UpdateTagRequestSchema>;

export const TagResponseSchema = TagDefinitionSchema;
export type TagResponse = z.infer<typeof TagResponseSchema>;

export const TagListResponseSchema = z.object({
  tags: z.array(TagDefinitionSchema),
  total: z.number(),
});
export type TagListResponse = z.infer<typeof TagListResponseSchema>;

// ============================================================================
// Tag Query Filters
// ============================================================================

export const TagQuerySchema = z.object({
  category: z.enum(TAG_CATEGORIES).optional(),
  activationMode: z.enum(TAG_ACTIVATION_MODES).optional(),
  visibility: z.enum(TAG_VISIBILITIES).optional(),
  isBuiltIn: z.coerce.boolean().optional(),
});

export type TagQuery = z.infer<typeof TagQuerySchema>;

// ============================================================================
// Session Tag Binding Requests/Responses
// ============================================================================

export const CreateTagBindingRequestSchema = z.object({
  tagId: z.string().uuid(),
  targetType: z.enum(TAG_TARGET_TYPES).optional(),
  targetEntityId: z.string().uuid().nullable().optional(),
  enabled: z.boolean().optional(),
});

export type CreateTagBindingRequest = z.infer<typeof CreateTagBindingRequestSchema>;

export const UpdateTagBindingRequestSchema = z.object({
  enabled: z.boolean(),
});

export type UpdateTagBindingRequest = z.infer<typeof UpdateTagBindingRequestSchema>;

export const TagBindingResponseSchema = SessionTagBindingSchema;
export type TagBindingResponse = z.infer<typeof TagBindingResponseSchema>;

export const TagBindingWithDefinitionSchema = SessionTagBindingSchema.extend({
  tag: TagDefinitionSchema,
});
export type TagBindingWithDefinition = z.infer<typeof TagBindingWithDefinitionSchema>;

export const SessionTagBindingsResponseSchema = z.object({
  bindings: z.array(TagBindingWithDefinitionSchema),
  total: z.number(),
});
export type SessionTagBindingsResponse = z.infer<typeof SessionTagBindingsResponseSchema>;

// ============================================================================
// Legacy Support (deprecated)
// ============================================================================

/** @deprecated Use CreateTagBindingRequestSchema instead */
export const SessionTagSelectionSchema = z.array(z.string().uuid());
/** @deprecated Use CreateTagBindingRequest[] instead */
export type SessionTagSelection = z.infer<typeof SessionTagSelectionSchema>;
