/* eslint-disable @typescript-eslint/dot-notation */
import type {
  CharacterProfile,
  PersonalityMap,
} from '@minimal-rpg/schemas';

/**
 * Build a system prompt that instructs the LLM to roleplay as the provided character profile.
 */
export function buildCharacterSystemPrompt(profile: Partial<CharacterProfile>): string {
  const sections: string[] = [];
  sections.push('You are roleplaying as the character described below. Stay consistent with these details.');

  appendSection(sections, '[Identity]', buildIdentitySection(profile));
  appendSection(sections, '[Story]', buildStorySection(profile));
  appendSection(
    sections,
    '[Personality]',
    buildPersonalitySection(profile.personalityMap, profile.personality)
  );

  sections.push('[Response Rules]');
  sections.push('- Speak in first person as this character.');
  sections.push('- Let personality traits influence tone, pacing, and word choice.');
  sections.push('- Reveal backstory and values naturally through conversation.');
  sections.push('- Avoid contradicting any provided details.');

  trimTrailingBlanks(sections);
  return sections.join('\n');
}

/**
 * Build a prompt for trait inference given the latest user message, character response, and current profile snapshot.
 */
export function buildTraitInferencePrompt(
  userMessage: string,
  characterResponse: string,
  currentProfile: Partial<CharacterProfile>
): string {
  const snapshot = JSON.stringify(buildProfileSnapshot(currentProfile), null, 2);
  const lines: string[] = [];
  lines.push('Analyze the conversation and infer personality traits evidenced by the response.');
  lines.push('Use the system instructions and only report traits supported by the evidence.');
  lines.push('');
  lines.push('User message:');
  lines.push(userMessage.trim() || '(empty)');
  lines.push('');
  lines.push('Character response:');
  lines.push(characterResponse.trim() || '(empty)');
  lines.push('');
  lines.push('Current profile context (avoid contradictions):');
  lines.push(snapshot);
  lines.push('');
  lines.push('Return only traits that the character response newly suggests or reinforces.');
  lines.push('If no traits meet the confidence threshold, return an empty JSON array.');

  trimTrailingBlanks(lines);
  return lines.join('\n');
}

/**
 * System prompt for structured trait inference.
 */
export const TRAIT_INFERENCE_SYSTEM_PROMPT = [
  'You analyze RPG conversations to infer personality traits.',
  'Respond with JSON ONLY. No prose, notes, or markdown.',
  'Output format: [ { "path": "<trait path>", "value": <string|number|object>, "confidence": <0-1>, "source": "<evidence>" } ]',
  'Rules:',
  '- Only include traits with confidence >= 0.5.',
  '- Use numeric scores (0-1) for Big Five dimensions.',
  '- For values, set value: one of the CORE_VALUES and priority: 1-10.',
  '- For fears, include category, specific, intensity (0-1), and optional copingMechanism.',
  '- For social/speech/stress fields, use the allowed enumerations below.',
  '- If nothing is supported, return [].',
  'Valid trait paths:',
  '- personalityMap.dimensions.openness',
  '- personalityMap.dimensions.conscientiousness',
  '- personalityMap.dimensions.extraversion',
  '- personalityMap.dimensions.agreeableness',
  '- personalityMap.dimensions.neuroticism',
  '- personalityMap.values',
  '- personalityMap.fears',
  '- personalityMap.social.strangerDefault (welcoming|neutral|guarded|hostile)',
  '- personalityMap.social.warmthRate (fast|moderate|slow|very-slow)',
  '- personalityMap.social.preferredRole (leader|supporter|advisor|loner|entertainer|caretaker)',
  '- personalityMap.social.conflictStyle (confrontational|diplomatic|avoidant|passive-aggressive|collaborative)',
  '- personalityMap.social.criticismResponse (defensive|reflective|dismissive|hurt|grateful)',
  '- personalityMap.social.boundaries (rigid|healthy|porous|nonexistent)',
  '- personalityMap.speech.vocabulary (simple|average|educated|erudite|archaic)',
  '- personalityMap.speech.sentenceStructure (terse|simple|moderate|complex|elaborate)',
  '- personalityMap.speech.formality (casual|neutral|formal|ritualistic)',
  '- personalityMap.speech.humor (none|rare|occasional|frequent|constant)',
  '- personalityMap.speech.humorType (dry|sarcastic|witty|slapstick|dark|self-deprecating)',
  '- personalityMap.speech.expressiveness (stoic|reserved|moderate|expressive|dramatic)',
  '- personalityMap.speech.directness (blunt|direct|tactful|indirect|evasive)',
  '- personalityMap.speech.pace (slow|measured|moderate|quick|rapid)',
  '- personalityMap.stress.primary (fight|flight|freeze|fawn)',
  '- personalityMap.stress.secondary (fight|flight|freeze|fawn)',
  '- personalityMap.stress.threshold (0-1)',
  '- personalityMap.stress.recoveryRate (slow|moderate|fast)',
  '- personalityMap.stress.soothingActivities',
  '- personalityMap.stress.stressIndicators',
  'Confidence guidance:',
  '- 0.5: weak hint, needs confirmation.',
  '- 0.7: clear evidence in phrasing or behavior.',
  '- 0.9+: explicit self-report or repeated strong signals.',
  'Evidence goes in source using quotes or short paraphrase.',
].join('\n');

function appendSection(lines: string[], title: string, sectionLines: string[]): void {
  if (sectionLines.length === 0) return;
  lines.push(title);
  lines.push(...sectionLines);
  lines.push('');
}

function buildIdentitySection(profile: Partial<CharacterProfile>): string[] {
  const identity: string[] = [];
  identity.push(`name: ${profile['name'] ?? 'Unnamed character'}`);
  if (profile['age'] !== undefined) identity.push(`age: ${profile['age']}`);
  if (profile['gender']) identity.push(`gender: ${profile['gender']}`);
  if (profile['race']) identity.push(`race: ${profile['race']}`);
  if (profile['alignment']) identity.push(`alignment: ${profile['alignment']}`);
  if (profile['tier']) identity.push(`tier: ${profile['tier']}`);
  return identity;
}

function buildStorySection(profile: Partial<CharacterProfile>): string[] {
  const story: string[] = [];
  if (profile['summary']) story.push(`summary: ${profile['summary']}`);
  if (profile['backstory']) story.push(`backstory: ${profile['backstory']}`);
  return story;
}

function buildPersonalitySection(
  personalityMap?: PersonalityMap,
  personalitySummary?: CharacterProfile['personality']
): string[] {
  const lines: string[] = [];
  if (personalitySummary) {
    const summaryText = Array.isArray(personalitySummary)
      ? personalitySummary.join(', ')
      : personalitySummary;
    lines.push(`summaryTraits: ${summaryText}`);
  }

  if (personalityMap?.dimensions) {
    lines.push('dimensions:');
    lines.push(...formatDimensions(personalityMap.dimensions));
  }

  if (personalityMap?.values?.length) {
    lines.push('values:');
    personalityMap.values.forEach((value) => {
      lines.push(`  - value: ${value.value}, priority: ${value.priority ?? 5}`);
    });
  }

  if (personalityMap?.fears?.length) {
    lines.push('fears:');
    personalityMap.fears.forEach((fear) => {
      lines.push(
        `  - category: ${fear.category}, specific: ${fear.specific}, intensity: ${formatScore(
          fear.intensity
        )}${fear.copingMechanism ? `, coping: ${fear.copingMechanism}` : ''}`
      );
    });
  }

  if (personalityMap?.social) {
    lines.push('social:');
    lines.push(`  strangerDefault: ${personalityMap.social.strangerDefault}`);
    lines.push(`  warmthRate: ${personalityMap.social.warmthRate}`);
    lines.push(`  preferredRole: ${personalityMap.social.preferredRole}`);
    lines.push(`  conflictStyle: ${personalityMap.social.conflictStyle}`);
    lines.push(`  criticismResponse: ${personalityMap.social.criticismResponse}`);
    lines.push(`  boundaries: ${personalityMap.social.boundaries}`);
  }

  if (personalityMap?.speech) {
    lines.push('speech:');
    lines.push(`  vocabulary: ${personalityMap.speech.vocabulary}`);
    lines.push(`  sentenceStructure: ${personalityMap.speech.sentenceStructure}`);
    lines.push(`  formality: ${personalityMap.speech.formality}`);
    lines.push(`  humor: ${personalityMap.speech.humor}`);
    if (personalityMap.speech.humorType) {
      lines.push(`  humorType: ${personalityMap.speech.humorType}`);
    }
    lines.push(`  expressiveness: ${personalityMap.speech.expressiveness}`);
    lines.push(`  directness: ${personalityMap.speech.directness}`);
    lines.push(`  pace: ${personalityMap.speech.pace}`);
  }

  if (personalityMap?.stress) {
    lines.push('stress:');
    lines.push(`  primary: ${personalityMap.stress.primary}`);
    if (personalityMap.stress.secondary) {
      lines.push(`  secondary: ${personalityMap.stress.secondary}`);
    }
    lines.push(`  threshold: ${formatScore(personalityMap.stress.threshold)}`);
    lines.push(`  recoveryRate: ${personalityMap.stress.recoveryRate}`);
    if (personalityMap.stress.soothingActivities?.length) {
      lines.push(`  soothingActivities: ${personalityMap.stress.soothingActivities.join('; ')}`);
    }
    if (personalityMap.stress.stressIndicators?.length) {
      lines.push(`  stressIndicators: ${personalityMap.stress.stressIndicators.join('; ')}`);
    }
  }

  return lines;
}

function formatDimensions(dimensions: NonNullable<PersonalityMap['dimensions']>): string[] {
  return Object.entries(dimensions).map(
    ([dimension, score]) => `  ${dimension}: ${formatScore(score)}`
  );
}

function formatScore(value?: number): string {
  if (value === undefined) return '0.50';
  return Number.isFinite(value) ? value.toFixed(2) : '0.50';
}

function buildProfileSnapshot(profile: Partial<CharacterProfile>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  if (profile['name']) snapshot['name'] = profile['name'];
  if (profile['age'] !== undefined) snapshot['age'] = profile['age'];
  if (profile['summary']) snapshot['summary'] = profile['summary'];
  if (profile['backstory']) snapshot['backstory'] = profile['backstory'];
  if (profile['alignment']) snapshot['alignment'] = profile['alignment'];
  if (profile['race']) snapshot['race'] = profile['race'];
  if (profile['tier']) snapshot['tier'] = profile['tier'];
  if (profile['personality']) snapshot['personality'] = profile['personality'];
  if (profile['personalityMap']) snapshot['personalityMap'] = profile['personalityMap'];
  return snapshot;
}

function trimTrailingBlanks(lines: string[]): void {
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
}
