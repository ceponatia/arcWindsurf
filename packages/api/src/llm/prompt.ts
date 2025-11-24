import type { CharacterProfile, SettingProfile } from '@minimal-rpg/schemas';
import type { BuildPromptOptions, BuildPromptResult, DbMessage } from '../types.js';
import safetyModeJson from './prompts/safety-mode.json' with { type: 'json' };
import systemPromptJson from './prompts/system-prompt.json' with { type: 'json' };
import safetyRulesJson from './prompts/safety-rules.json' with { type: 'json' };
import { SystemPromptSchema, SafetyRulesSchema, SafetyModeSchema } from '@minimal-rpg/schemas';

export function assertPromptConfigValid(): void {
  try {
    SystemPromptSchema.parse(systemPromptJson);
    SafetyRulesSchema.parse(safetyRulesJson);
    SafetyModeSchema.parse(safetyModeJson);
  } catch (err) {
    const message = (err as Error)?.message ?? String(err);
    console.error('[prompts] Invalid prompt JSON configuration:', message);
    throw new Error('Invalid prompt JSON configuration');
  }
}

const BASE_RULES: string[] = SystemPromptSchema.parse(systemPromptJson).rules;
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
    `Summary: ${c.summary}`,
    `Backstory: ${truncate(c.backstory, 1200)}`,
    personalityLine,
    c.appearance ? `Appearance: ${serializeAppearance(c.appearance)}` : undefined,
    `Goals: ${c.goals.join('; ')}`,
    `Speaking Style: ${c.speakingStyle}`,
    c.tags?.length ? `Tags: ${c.tags.join(', ')}` : undefined,
    // scent is optional; guard via in-operator for forward/backward compat
    'scent' in c && (c as { scent?: unknown }).scent
      ? serializeScent((c as { scent?: unknown }).scent)
      : undefined,
    serializeStyle(c) || undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function serializeSetting(s: SettingProfile) {
  return [
    `Setting: ${s.name}`,
    `Tone: ${s.tone}`,
    `Lore: ${truncate(s.lore, 1200)}`,
    s.themes?.length ? `Themes: ${s.themes.join('; ')}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function serializeStyle(c: CharacterProfile) {
  const st = c.style;
  if (!st) return '';
  const pairs: string[] = [];
  if (st.sentenceLength) pairs.push(`sentenceLength=${st.sentenceLength}`);
  if (st.humor) pairs.push(`humor=${st.humor}`);
  if (st.darkness) pairs.push(`darkness=${st.darkness}`);
  if (st.pacing) pairs.push(`pacing=${st.pacing}`);
  if (st.formality) pairs.push(`formality=${st.formality}`);
  if (st.verbosity) pairs.push(`verbosity=${st.verbosity}`);
  return pairs.length ? `Style Hints: ${pairs.join(', ')}` : '';
}

function serializeAppearance(a: CharacterProfile['appearance']): string {
  if (!a) return '';
  if (typeof a === 'string') return truncate(a, 240);

  // Structured appearance from `AppearanceSchema`
  const parts: string[] = [];

  const hair = a.hair;
  if (hair) {
    const hairBits = [hair.color, hair.length, hair.style].filter(Boolean).join(' ');
    if (hairBits) parts.push(`Hair: ${hairBits}`);
  }

  const eyes = a.eyes;
  if (eyes?.color) parts.push(`Eyes: ${eyes.color}`);

  if (a.height) parts.push(`Height: ${a.height}`);
  if (a.skinTone) parts.push(`Skin: ${a.skinTone}`);

  if (a.torso) parts.push(`Torso: ${a.torso}`);

  const arms = a.arms;
  if (arms) {
    const armBits = [arms.build, arms.length ? `length=${arms.length}` : '']
      .filter(Boolean)
      .join(', ');
    if (armBits) parts.push(`Arms: ${armBits}`);
  }

  const legs = a.legs;
  if (legs) {
    const legBits = [legs.build, legs.length ? `length=${legs.length}` : '']
      .filter(Boolean)
      .join(', ');
    if (legBits) parts.push(`Legs: ${legBits}`);
  }

  const features = a.features;
  if (Array.isArray(features) && features.length) parts.push(`Features: ${features.join(', ')}`);

  return parts.join('; ');
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
