import { z } from 'zod';

const SystemPromptSchema = z.object({ rules: z.array(z.string().min(1)).nonempty() });
const SafetyRulesSchema = z.object({ rules: z.array(z.string().min(1)).nonempty() });
const SafetyModeSchema = z.object({
  safetyModeMessage: z.string().min(1),
  sensitiveNote: z.string().min(1),
});

export function loadAndValidatePromptConfig() {
  throw new Error(
    'loadAndValidatePromptConfig is no longer supported without explicit JSON inputs. Use loadAndValidatePromptConfigFromJson.'
  );
}

export function loadAndValidatePromptConfigFromJson(args: {
  systemPrompt: unknown;
  safetyRules: unknown;
  safetyMode: unknown;
}): {
  systemRules: string[];
  safetyRules: string[];
  safetyMode: { safetyModeMessage: string; sensitiveNote: string };
} {
  try {
    const system = SystemPromptSchema.parse(args.systemPrompt);
    const safety = SafetyRulesSchema.parse(args.safetyRules);
    const mode = SafetyModeSchema.parse(args.safetyMode);
    return {
      systemRules: system.rules,
      safetyRules: safety.rules,
      safetyMode: mode,
    };
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    console.error('[prompts] Invalid prompt JSON configuration:', message);
    throw new Error('Invalid prompt JSON configuration');
  }
}
