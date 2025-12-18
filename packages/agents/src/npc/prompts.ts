import { buildDimensionTraitPhrases } from './personality-mapping.js';
import type { AgentInput, CharacterSlice } from '../core/types.js';
import type { NpcAgentInput } from './types.js';
import type { NpcResponseConfig } from '@minimal-rpg/schemas';
import { extractNpcContext } from './context.js';
import { getSegmentLabel } from './formatting.js';
import { countSensoryDetails, getSentenceRange } from './prompt/metrics.js';
import { serializeActionSequence } from './prompt/serialize/action-sequence.js';
import { serializeAffinity } from './prompt/serialize/affinity.js';
import { buildFormattingContract } from './prompt/serialize/formatting.js';
import { serializeIntentGuidance } from './prompt/serialize/intent.js';
import { serializeNpcContext } from './prompt/serialize/npc-context.js';
import { serializePersona } from './prompt/serialize/persona.js';
import { serializeSensoryContext } from './prompt/serialize/sensory.js';

export function buildEnhancedSystemPrompt(
  character: CharacterSlice,
  input: NpcAgentInput,
  responseConfig: NpcResponseConfig
): string {
  const parts: string[] = [];

  const basePrompt = buildDialogueSystemPrompt(character, input);
  parts.push(basePrompt);

  parts.push(...serializeActionSequence(input, responseConfig));

  const actionCount = input.actionSequence?.completedActions.length ?? 0;
  const sensoryCount = countSensoryDetails(input.accumulatedContext);

  parts.push('\n--- TURN RULES ---');

  if (actionCount > 0) {
    parts.push('Rule: Cover each completed action in order.');
    if (responseConfig.enforceTemporalOrdering) {
      parts.push('Rule: Do not describe action N+1 consequences before action N completes.');
    }
    parts.push('Rule: Weave provided sensory details naturally where they enhance the scene.');
    if (input.actionSequence?.interruptedAt) {
      parts.push('Rule: If interrupted, end narrative at the interruption point.');
      parts.push('Rule: Do not list what the player could not do; let the narrative imply it.');
    } else {
      parts.push('Rule: Do not invent sensory details that were not provided.');
    }
  } else {
    parts.push('Rule: Keep it concise and in character.');
    parts.push('Rule: Weave provided sensory details naturally where they enhance the scene.');
    parts.push('Rule: Do not invent sensory details that were not provided.');
  }

  parts.push('\n--- TURN FACTS ---');
  if (actionCount > 0) {
    parts.push(`Completed actions: ${actionCount}`);
    parts.push(`Sensory details available: ${sensoryCount}`);
    const sentenceRange = getSentenceRange(actionCount, responseConfig);
    parts.push(`Target length: ${sentenceRange.min}-${sentenceRange.max} sentences`);
  } else {
    parts.push('Completed actions: 0');
    parts.push('Action sequence: none');
    if (sensoryCount > 0) {
      parts.push(`Sensory details available: ${sensoryCount}`);
    }
  }

  parts.push('\n--- TURN TASK ---');
  parts.push('Task: Write the NPC response now.');

  return parts.join('\n');
}

export function buildDialogueSystemPrompt(character: CharacterSlice, input: AgentInput): string {
  const parts: string[] = [];

  parts.push(`You are writing for the character ${character.name}.`);
  parts.push(buildFormattingContract());

  if (character.backstory) {
    parts.push(`\nBackstory: ${character.backstory}`);
  }

  parts.push(...serializePersona(input.persona));

  if (character.personality) {
    const traits = Array.isArray(character.personality)
      ? character.personality.join(', ')
      : character.personality;
    parts.push(`\nYour personality traits: ${traits}`);
  }

  if (character.personalityMap) {
    const pm = character.personalityMap;
    const speechParts: string[] = [];
    if (pm.speech?.vocabulary) speechParts.push(`vocabulary: ${pm.speech.vocabulary}`);
    if (pm.speech?.formality) speechParts.push(`formality: ${pm.speech.formality}`);
    if (pm.speech?.directness) speechParts.push(`directness: ${pm.speech.directness}`);
    if (speechParts.length) parts.push(`\nSpeech style: ${speechParts.join(', ')}`);
    if (pm.values?.length) parts.push(`\nCore values: ${pm.values.map((v) => v.value).join(', ')}`);

    const sliderLines = buildDimensionTraitPhrases(pm);
    if (sliderLines.length) {
      parts.push('\nCore temperament from sliders:');
      parts.push(...sliderLines.map((line) => `- ${line}`));
    }
  }

  if (character.goals && character.goals.length > 0) {
    parts.push(`\nYour current goals: ${character.goals.join('; ')}`);
  }

  if (input.knowledgeContext?.length) {
    parts.push('\nRelevant information about you:');
    parts.push(...input.knowledgeContext.slice(0, 5).map((item) => `- ${item.content}`));
  }

  parts.push(...serializeAffinity(input));

  const npcContext = extractNpcContext(input);
  parts.push(...serializeNpcContext(npcContext));

  const intentGuidance = serializeIntentGuidance(input.intent);
  if (intentGuidance.length) {
    parts.push(...intentGuidance);
  } else {
    parts.push('\nRespond in character using third person for actions.');
    parts.push('Avoid stage directions or parentheses.');
  }
  parts.push(...serializeSensoryContext(input.sensoryContext));

  return parts.join('\n');
}

// NPC context serialization lives in prompt/serialize/npc-context.ts

export function buildDialogueUserPrompt(input: AgentInput): string {
  const parts: string[] = [];

  const convo = input.npcConversationHistory ?? input.conversationHistory;

  if (convo && convo.length > 0) {
    parts.push('Recent conversation:');
    for (const turn of convo.slice(-3)) {
      const speaker = turn.speaker === 'player' ? 'Player' : 'You';
      parts.push(`${speaker}: ${turn.content}`);
    }
    parts.push('');
  }

  if (input.intent?.segments && input.intent.segments.length > 0) {
    parts.push('Player input (multiple parts):');
    for (const segment of input.intent.segments) {
      const label = getSegmentLabel(segment);
      parts.push(`  [${label}] ${segment.content}`);
    }
    if (input.intent.segments.some((s) => s.type === 'thought')) {
      parts.push('\n(Remember: you cannot know their thoughts, only observe their demeanor)');
    }
  } else if (input.intent?.type === 'narrate') {
    const narrateType = input.intent.params?.narrateType;
    switch (narrateType) {
      case 'thought':
        parts.push(`Player's internal thought: ${input.playerInput}`);
        parts.push('\n(Remember: you cannot know their thoughts, only observe their demeanor)');
        break;
      case 'action':
        parts.push(`Player's action: ${input.playerInput}`);
        break;
      case 'emote':
        parts.push(`Player's reaction: ${input.playerInput}`);
        break;
      case 'narrative':
        parts.push(`Narrative: ${input.playerInput}`);
        break;
      default:
        parts.push(`Player: ${input.playerInput}`);
    }
  } else {
    parts.push(`Player says: "${input.playerInput}"`);
  }

  parts.push('\nWrite your response now (no name prefix, third person for actions):');

  return parts.join('\n');
}

export function getDefaultResponseConfig(): NpcResponseConfig {
  return {
    minSentencesPerAction: 2,
    maxSentencesPerAction: 3,
    minSensoryDetailsPerAction: 1,
    enforceTemporalOrdering: true,
    showPendingActions: true,
  };
}
