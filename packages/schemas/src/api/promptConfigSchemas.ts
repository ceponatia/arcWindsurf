import { z } from 'zod';

export const SystemPromptSchema = z.object({
  rules: z.array(z.string().min(1)).nonempty(),
});

export const SafetyRulesSchema = z.object({
  rules: z.array(z.string().min(1)).nonempty(),
});

export const SafetyModeSchema = z.object({
  safetyModeMessage: z.string().min(1),
  sensitiveNote: z.string().min(1),
});

export type SystemPromptConfig = z.infer<typeof SystemPromptSchema>;
export type SafetyRulesConfig = z.infer<typeof SafetyRulesSchema>;
export type SafetyModeConfig = z.infer<typeof SafetyModeSchema>;
