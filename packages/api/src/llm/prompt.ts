import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { BuildPromptOptions, BuildPromptResult, DbMessage } from '../types.js';
import safetyModeJson from './prompts/safety-mode.json' with { type: 'json' };
import systemPromptJson from './prompts/system-prompt.json' with { type: 'json' };
import safetyRulesJson from './prompts/safety-rules.json' with { type: 'json' };
import systemPromptRomanceJson from './prompts/system-prompt-romance.json' with { type: 'json' };
import systemPromptAdventureJson from './prompts/system-prompt-adventure.json' with { type: 'json' };
import systemPromptMysteryJson from './prompts/system-prompt-mystery.json' with { type: 'json' };
import { SystemPromptSchema, SafetyRulesSchema, SafetyModeSchema } from '@minimal-rpg/schemas';

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

function serializeCharacter(c: CharacterProfile) {
  const rawPersonality = c.personality;
  const personalityLine = Array.isArray(rawPersonality)
    ? `Personality Traits: ${rawPersonality.map((p) => truncate(p, 120)).join('; ')}`
    : `Personality: ${truncate(rawPersonality, 400)}`;

  return [
    `Character: ${c.name}`,
    'age' in c && typeof (c as { age?: unknown }).age === 'number'
      ? `Age: ${(c as { age?: number }).age}`
      : undefined,
    'gender' in c && typeof (c as { gender?: unknown }).gender === 'string'
      ? `Gender: ${(c as { gender?: string }).gender}`
      : undefined,
    `Backstory: ${c.backstory}`,
    personalityLine,
    'physique' in c && (c as { physique?: unknown }).physique
      ? `Appearance: ${serializePhysique((c as { physique?: unknown }).physique)}`
      : undefined,
    // scent is optional; guard via in-operator for forward/backward compat
    'scent' in c && (c as { scent?: unknown }).scent
      ? serializeScent((c as { scent?: unknown }).scent)
      : undefined,
    serializeDetails(c.details),
  ]
    .filter(Boolean)
    .join('\n');
}

function serializeSetting(s: SettingProfile) {
  return [
    `Setting: ${s.name}`,
    `Lore: ${truncate(s.lore, 1200)}`,
    s.themes?.length ? `Themes: ${s.themes.join('; ')}` : undefined,
    s.tags?.length ? `Tags: ${s.tags.join(', ')}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

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

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function serializePhysique(physique: unknown): string {
  if (!physique) return '';
  if (typeof physique === 'string') return truncate(physique, 240);

  const p = physique as {
    build?: {
      height?: string;
      torso?: string;
      skinTone?: string;
      arms?: { build?: string; length?: string };
      legs?: { build?: string; length?: string };
    };
    appearance?: {
      hair?: { color?: string; style?: string; length?: string };
      eyes?: { color?: string };
      features?: string[];
    };
  };

  const parts: string[] = [];

  const hair = p.appearance?.hair;
  if (hair) {
    const hairBits = [hair.color, hair.length, hair.style].filter(Boolean).join(' ');
    if (hairBits) parts.push(`Hair: ${hairBits}`);
  }

  const eyes = p.appearance?.eyes;
  if (eyes?.color) parts.push(`Eyes: ${eyes.color}`);

  const build = p.build;
  if (build) {
    if (build.height) parts.push(`Height: ${build.height}`);
    if (build.skinTone) parts.push(`Skin: ${build.skinTone}`);
    if (build.torso) parts.push(`Torso: ${build.torso}`);

    const arms = build.arms;
    if (arms) {
      const armBits = [arms.build, arms.length ? `length=${arms.length}` : '']
        .filter(Boolean)
        .join(', ');
      if (armBits) parts.push(`Arms: ${armBits}`);
    }

    const legs = build.legs;
    if (legs) {
      const legBits = [legs.build, legs.length ? `length=${legs.length}` : '']
        .filter(Boolean)
        .join(', ');
      if (legBits) parts.push(`Legs: ${legBits}`);
    }
  }

  const features = p.appearance?.features;
  if (Array.isArray(features) && features.length) {
    parts.push(`Features: ${features.join(', ')}`);
  }

  return parts.join('; ');
}

function serializeDetails(details: CharacterProfile['details'] | undefined) {
  if (!details?.length) return '';
  const sorted = [...details].sort((a, b) => (b.importance ?? 0.5) - (a.importance ?? 0.5));
  const lines = sorted.map((detail) => {
    const areaPrefix = detail.area && detail.area !== 'custom' ? `${detail.area}: ` : '';
    return `${areaPrefix}${detail.label}: ${truncate(detail.value, 200)}`;
  });
  return lines.length ? `Profile Details:\n- ${lines.join('\n- ')}` : '';
}

function serializeScent(s: unknown): string {
  if (!s || typeof s !== 'object') return '';
  const obj = s as { hairScent?: string; bodyScent?: string; perfume?: string };
  const bits: string[] = [];
  if (typeof obj.hairScent === 'string') bits.push(`hair=${obj.hairScent}`);
  if (typeof obj.bodyScent === 'string') bits.push(`body=${obj.bodyScent}`);
  if (typeof obj.perfume === 'string') bits.push(`perfume=${truncate(obj.perfume, 40)}`);
  return bits.length ? `Scent Hints: ${bits.join(', ')}` : '';
}

function summarizeHistory(messages: DbMessage[], keepLast: number, maxChars: number) {
  if (messages.length <= keepLast) return '';
  const older = messages.slice(0, Math.max(0, messages.length - keepLast));

  // Prioritize the most recent of the "older" messages by processing in reverse
  const reversedOlder = [...older].reverse();
  const keyPoints: string[] = [];
  let currentLen = 0;

  for (const m of reversedOlder) {
    const prefix = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Narration' : 'System';
    // Keep more content (500 chars) to preserve context
    const content = m.content.replace(/\s+/g, ' ');
    const line = content.length > 500 ? content.slice(0, 499) + '…' : content;
    const entry = `${prefix}: ${line}`;

    if (currentLen + entry.length + 1 > maxChars) break;

    keyPoints.push(entry);
    currentLen += entry.length + 1;
  }

  // Reverse back to chronological order
  return keyPoints.reverse().join('\n');
}

function simpleContentFilter(latestUserText: string | undefined) {
  if (!latestUserText) return { flagged: false as const, note: '' };
  const text = latestUserText.toLowerCase();
  const banned = [
    /child abuse/,
    /sexual violence/,
    /bestiality/,
    /necrophilia/,
    /extreme gore/,
    /hate speech/,
  ];
  const flagged = banned.some((re) => re.test(text));
  if (!flagged) return { flagged: false as const, note: '' };
  const note =
    'Sensitive content detected: avoid explicit details, keep events implied or off-screen, and redirect respectfully.';
  try {
    console.warn('[safety] filtered sensitive request');
  } catch {
    // noop
  }
  return { flagged: true as const, note };
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
