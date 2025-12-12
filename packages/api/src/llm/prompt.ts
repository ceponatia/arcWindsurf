import type { SettingProfile } from '@minimal-rpg/schemas';
import type { BuildPromptOptions, BuildPromptResult } from './types.js';
import safetyModeJson from './prompts/safety-mode.json' with { type: 'json' };
import systemPromptJson from './prompts/system-prompt.json' with { type: 'json' };
import safetyRulesJson from './prompts/safety-rules.json' with { type: 'json' };
import systemPromptRomanceJson from './prompts/system-prompt-romance.json' with { type: 'json' };
import systemPromptAdventureJson from './prompts/system-prompt-adventure.json' with { type: 'json' };
import systemPromptMysteryJson from './prompts/system-prompt-mystery.json' with { type: 'json' };
import { SystemPromptSchema, SafetyRulesSchema, SafetyModeSchema } from '@minimal-rpg/schemas';
import { serializeCharacter, serializeSetting } from './prompts/serializers.js';
import { summarizeHistory } from './prompts/summarizers.js';
import { simpleContentFilter } from './prompts/filters.js';

export function assertPromptConfigValid(): void {
  try {
    SystemPromptSchema.parse(systemPromptJson);
    SystemPromptSchema.parse(systemPromptRomanceJson);
    SystemPromptSchema.parse(systemPromptAdventureJson);
    SystemPromptSchema.parse(systemPromptMysteryJson);
    SafetyRulesSchema.parse(safetyRulesJson);
    SafetyModeSchema.parse(safetyModeJson);
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    console.error('[prompts] Invalid prompt JSON configuration:', message);
    throw new Error('Invalid prompt JSON configuration');
  }
}

const BASE_RULES: string[] = SystemPromptSchema.parse(systemPromptJson).rules;
/** Predefined tag-specific rules keyed by tag string */
const TAG_RULES_BY_TAG: Record<string, string[]> = {
  romance: SystemPromptSchema.parse(systemPromptRomanceJson).rules,
  adventure: SystemPromptSchema.parse(systemPromptAdventureJson).rules,
  mystery: SystemPromptSchema.parse(systemPromptMysteryJson).rules,
};
// const SAFETY_RULES: string[] = SafetyRulesSchema.parse(safetyRulesJson).rules;

/**
 * Build tag-specific rules from setting tags.
 */
function buildTagSpecificRules(setting: SettingProfile): string[] {
  const tags: string[] = setting.tags ?? [];
  const seenRules = new Set<string>();
  const out: string[] = [];

  for (const tag of tags) {
    // Normalize tag to lowercase for matching predefined rules
    const rules = TAG_RULES_BY_TAG[tag.toLowerCase()];
    if (!rules) continue;
    for (const rule of rules) {
      if (seenRules.has(rule)) continue;
      seenRules.add(rule);
      out.push(rule);
    }
  }

  return out;
}

export function buildPrompt(opts: BuildPromptOptions): BuildPromptResult {
  const { character, setting } = opts;
  // historyWindow controls how many recent turns are kept verbatim; older turns may be summarized.
  const historyWindow = opts.historyWindow ?? 10;
  const summaryMaxChars = opts.summaryMaxChars ?? 16000;
  const recent = opts.history.slice(Math.max(0, opts.history.length - historyWindow));
  const summary = summarizeHistory(opts.history, historyWindow, summaryMaxChars);
  const lastUser = [...opts.history].reverse().find((m) => m.role === 'user');
  const filter = simpleContentFilter(lastUser?.content);

  const systemMessages = [
    { role: 'system' as const, content: BASE_RULES.join(' ') },
    (() => {
      const rules = buildTagSpecificRules(setting);
      return rules.length ? { role: 'system' as const, content: rules.join(' ') } : undefined;
    })(),
    (() => {
      if (!opts.tagInstances?.length) return undefined;
      const tagPrompts = opts.tagInstances.map((t) => t.promptText).join('\n\n');
      return { role: 'system' as const, content: `Additional Style Rules:\n${tagPrompts}` };
    })(),
    // { role: 'system' as const, content: SAFETY_RULES.join(' ') },
    { role: 'system' as const, content: serializeCharacter(character) },
    { role: 'system' as const, content: serializeSetting(setting) },
    summary
      ? { role: 'system' as const, content: `Context Summary (older turns):\n${summary}` }
      : undefined,
    filter.flagged
      ? {
          role: 'system' as const,
          content: (safetyModeJson as { safetyModeMessage?: string })?.safetyModeMessage ?? '',
        }
      : undefined,
    filter.flagged
      ? {
          role: 'system' as const,
          content: (safetyModeJson as { sensitiveNote?: string })?.sensitiveNote ?? '',
        }
      : undefined,
  ].filter(Boolean) as { role: 'system'; content: string }[];

  const convo = recent.map((m) => ({ role: m.role, content: m.content }));

  return [...systemMessages, ...convo];
}
