import { z } from 'zod';
import systemPromptJson from '../../../api/src/llm/prompts/system-prompt.json' with { type: 'json' };
import safetyRulesJson from '../../../api/src/llm/prompts/safety-rules.json' with { type: 'json' };
import safetyModeJson from '../../../api/src/llm/prompts/safety-mode.json' with { type: 'json' };

const SystemPromptSchema = z.object({ rules: z.array(z.string().min(1)).nonempty() });
const SafetyRulesSchema = z.object({ rules: z.array(z.string().min(1)).nonempty() });
const SafetyModeSchema = z.object({
  safetyModeMessage: z.string().min(1),
  sensitiveNote: z.string().min(1),
});

export function loadAndValidatePromptConfig() {
  try {
    const system = SystemPromptSchema.parse(systemPromptJson);
    const safety = SafetyRulesSchema.parse(safetyRulesJson);
    const mode = SafetyModeSchema.parse(safetyModeJson);
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
