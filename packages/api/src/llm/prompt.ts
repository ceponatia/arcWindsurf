import type { CharacterProfile, SettingProfile, Appearance } from '@minimal-rpg/schemas';
import type { Message } from '@minimal-rpg/db/node';
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
    s.constraints?.length ? `Constraints: ${s.constraints.join('; ')}` : undefined,
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
  const obj: Appearance = a as Appearance;
  const parts: string[] = [];
  if (obj.hair) {
    const hairBits = [obj.hair.color, obj.hair.length, obj.hair.style].filter(Boolean).join(' ');
    if (hairBits) parts.push(`Hair: ${hairBits}`);
  }
  if (obj.eyes?.color) parts.push(`Eyes: ${obj.eyes.color}`);
  if (obj.height) parts.push(`Height: ${obj.height}`);
  if (obj.skinTone) parts.push(`Skin: ${obj.skinTone}`);
  // Build is encoded within torso/arms/legs; pull representative values
  if (obj.torso) parts.push(`Torso: ${obj.torso}`);
  if (obj.arms) {
    const armBits = [obj.arms.build, obj.arms.length ? `length=${obj.arms.length}` : '']
      .filter(Boolean)
      .join(', ');
    if (armBits) parts.push(`Arms: ${armBits}`);
  }
  if (obj.legs) {
    const legBits = [obj.legs.build, obj.legs.length ? `length=${obj.legs.length}` : '']
      .filter(Boolean)
      .join(', ');
    if (legBits) parts.push(`Legs: ${legBits}`);
  }
  if (obj.features?.length) parts.push(`Features: ${obj.features.join(', ')}`);
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

function summarizeHistory(messages: Message[], keepLast: number, maxChars: number) {
  if (messages.length <= keepLast) return '';
  const older = messages.slice(0, Math.max(0, messages.length - keepLast));
  // Lightweight summary: extract key lines; limit size
  const keyPoints: string[] = [];
  for (const m of older) {
    const prefix = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Narration' : 'System';
    const line = m.content.replace(/\s+/g, ' ').slice(0, 160);
    keyPoints.push(`${prefix}: ${line}`);
    if (keyPoints.join('\n').length >= maxChars) break;
  }
  const summary = keyPoints.join('\n');
  return summary.length > maxChars ? summary.slice(0, maxChars - 1) + '…' : summary;
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

export function buildPrompt(opts: {
  character: CharacterProfile;
  setting: SettingProfile;
  history: Message[];
  maxHistory?: number; // deprecated; use historyWindow
  historyWindow?: number;
  summaryMaxChars?: number;
}) {
  const { character, setting } = opts;
  const historyWindow = opts.historyWindow ?? opts.maxHistory ?? 10;
  const summaryMaxChars = opts.summaryMaxChars ?? 1000;
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
