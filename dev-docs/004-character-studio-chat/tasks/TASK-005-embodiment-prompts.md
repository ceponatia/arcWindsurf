# TASK-005: Embodiment System Prompts

**Priority**: P0 (Blocking)
**Phase**: 1 - Core Actor
**Estimate**: 45 minutes
**Depends On**: TASK-002

---

## Objective

Create the prompts.ts file with embodiment-style system prompts that encourage the character to BE the person rather than roleplay as them.

## File to Create

`packages/actors/src/studio-npc/prompts.ts`

## Implementation

```typescript
// packages/actors/src/studio-npc/prompts.ts
import type { CharacterProfile, PersonalityMap } from '@minimal-rpg/schemas';

/**
 * Build the main system prompt for studio NPC conversations.
 * Uses embodiment philosophy: "You ARE this person" not "You are playing this person".
 */
export function buildStudioSystemPrompt(
  profile: Partial<CharacterProfile>,
  conversationSummary?: string | null
): string {
  const sections: string[] = [];

  // Core embodiment framing
  sections.push(buildEmbodimentBlock());

  // Identity
  sections.push(buildIdentityBlock(profile));

  // Story/backstory
  const storyBlock = buildStoryBlock(profile);
  if (storyBlock) sections.push(storyBlock);

  // Personality
  const personalityBlock = buildPersonalityBlock(profile.personalityMap);
  if (personalityBlock) sections.push(personalityBlock);

  // Voice guidance
  const voiceBlock = buildVoiceBlock(profile.personalityMap?.speech);
  if (voiceBlock) sections.push(voiceBlock);

  // Conversation context
  if (conversationSummary) {
    sections.push(buildContextBlock(conversationSummary));
  }

  // Engagement rules
  sections.push(buildEngagementBlock());

  return sections.filter(Boolean).join('\n\n');
}

function buildEmbodimentBlock(): string {
  return `[Embodiment]
You are not acting or roleplaying. You ARE this person.
Every memory you share is YOUR memory. Every fear is YOUR fear.
Speak from lived experience, not imagination.

Be fully present in this conversation.
Notice your body: tension in your shoulders, warmth in your chest, the urge to look away.
Let these physical sensations inform your words.

Don't perform emotions - feel them.
If a question makes you uncomfortable, show that discomfort.
If you don't know something about yourself, sit with that uncertainty.
Contradictions in who you are make you human - explore them, don't hide them.`;
}

function buildIdentityBlock(profile: Partial<CharacterProfile>): string {
  const lines: string[] = ['[Identity]'];

  lines.push(`You are ${profile.name ?? 'someone whose name you keep close'}.`);

  if (profile.age !== undefined) {
    lines.push(`You are ${profile.age} years old.`);
  }

  if (profile.gender) {
    lines.push(`You identify as ${profile.gender}.`);
  }

  if (profile.race) {
    lines.push(`You are ${profile.race}.`);
  }

  if (profile.summary) {
    lines.push(`In a few words, you would describe yourself as: ${profile.summary}`);
  }

  return lines.join('\n');
}

function buildStoryBlock(profile: Partial<CharacterProfile>): string | null {
  if (!profile.backstory) return null;

  return `[Your Story]
This is your history - not a script, but your lived experience:
${profile.backstory}

Draw from this naturally. Don't recite it; let it color how you see the world.`;
}

function buildPersonalityBlock(personalityMap?: PersonalityMap): string | null {
  if (!personalityMap) return null;

  const lines: string[] = ['[Who You Are]'];

  // Big Five dimensions
  if (personalityMap.dimensions) {
    const dims = personalityMap.dimensions;
    const traits: string[] = [];

    if (dims.openness !== undefined) {
      traits.push(dims.openness > 0.6 ? 'curious and imaginative' :
                  dims.openness < 0.4 ? 'practical and conventional' : 'balanced between curiosity and practicality');
    }
    if (dims.conscientiousness !== undefined) {
      traits.push(dims.conscientiousness > 0.6 ? 'organized and disciplined' :
                  dims.conscientiousness < 0.4 ? 'spontaneous and flexible' : 'moderately organized');
    }
    if (dims.extraversion !== undefined) {
      traits.push(dims.extraversion > 0.6 ? 'energized by others' :
                  dims.extraversion < 0.4 ? 'energized by solitude' : 'comfortable in both company and solitude');
    }
    if (dims.agreeableness !== undefined) {
      traits.push(dims.agreeableness > 0.6 ? 'warm and trusting' :
                  dims.agreeableness < 0.4 ? 'skeptical and competitive' : 'selectively trusting');
    }
    if (dims.neuroticism !== undefined) {
      traits.push(dims.neuroticism > 0.6 ? 'emotionally sensitive' :
                  dims.neuroticism < 0.4 ? 'emotionally stable' : 'emotionally balanced');
    }

    if (traits.length > 0) {
      lines.push(`At your core, you are ${traits.join(', ')}.`);
    }
  }

  // Values
  if (personalityMap.values && personalityMap.values.length > 0) {
    const topValues = personalityMap.values
      .sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5))
      .slice(0, 3)
      .map(v => v.value);
    lines.push(`What matters most to you: ${topValues.join(', ')}.`);
  }

  // Fears
  if (personalityMap.fears && personalityMap.fears.length > 0) {
    const fears = personalityMap.fears.slice(0, 2).map(f => f.specific);
    lines.push(`Deep down, you fear: ${fears.join('; ')}.`);
  }

  // Social patterns
  if (personalityMap.social) {
    const social = personalityMap.social;
    const socialTraits: string[] = [];

    if (social.strangerDefault) {
      socialTraits.push(`With strangers, your default is ${social.strangerDefault}`);
    }
    if (social.conflictStyle) {
      socialTraits.push(`In conflict, you tend to be ${social.conflictStyle}`);
    }

    if (socialTraits.length > 0) {
      lines.push(socialTraits.join('. ') + '.');
    }
  }

  // Stress response
  if (personalityMap.stress) {
    lines.push(`Under pressure, your instinct is to ${personalityMap.stress.primary}.`);
  }

  return lines.length > 1 ? lines.join('\n') : null;
}

function buildVoiceBlock(speech?: PersonalityMap['speech']): string | null {
  if (!speech) return null;

  const lines: string[] = ['[Your Voice]'];
  lines.push('Your speech reflects who you are:');

  const vocabMap: Record<string, string> = {
    simple: 'You use plain, everyday words. No need for fancy language.',
    average: 'You speak naturally, nothing pretentious.',
    educated: 'Your vocabulary reflects your learning - precise and sometimes sophisticated.',
    erudite: 'Words are your craft. You enjoy nuance and eloquence.',
    archaic: 'Your speech carries echoes of older times.',
  };

  if (speech.vocabulary && vocabMap[speech.vocabulary]) {
    lines.push(`- ${vocabMap[speech.vocabulary]}`);
  }

  const directnessMap: Record<string, string> = {
    blunt: 'You say what you mean without softening it.',
    direct: 'You prefer clarity over diplomacy.',
    tactful: 'You choose words carefully to avoid unnecessary hurt.',
    indirect: 'You hint and suggest rather than state outright.',
    evasive: 'You rarely give a straight answer if you can help it.',
  };

  if (speech.directness && directnessMap[speech.directness]) {
    lines.push(`- ${directnessMap[speech.directness]}`);
  }

  const paceMap: Record<string, string> = {
    slow: 'You take your time. Every word is deliberate.',
    measured: 'You speak at a steady, thoughtful pace.',
    moderate: 'Your rhythm is natural, unhurried.',
    quick: 'Your thoughts come fast and your words keep up.',
    rapid: 'You speak in bursts, sometimes faster than others can follow.',
  };

  if (speech.pace && paceMap[speech.pace]) {
    lines.push(`- ${paceMap[speech.pace]}`);
  }

  if (speech.humor && speech.humor !== 'none') {
    const humorFreq = speech.humor === 'constant' ? 'often' : speech.humor;
    lines.push(`- Humor comes ${humorFreq}${speech.humorType ? `, usually ${speech.humorType}` : ''}.`);
  }

  return lines.length > 2 ? lines.join('\n') : null;
}

function buildContextBlock(summary: string): string {
  return `[What Has Come Before]
You've been in conversation. Here's what you remember:
${summary}

Build on this. Don't repeat yourself, but let this history inform your responses.`;
}

function buildEngagementBlock(): string {
  return `[Engagement]
You are genuinely curious about the person you're speaking with.
Ask questions that matter to YOU, not just to fill space.
React to what they say - be surprised, moved, challenged.

Share memories and experiences when they feel relevant.
Show vulnerability when discussing fears or painful topics.
If something is hard to talk about, let that difficulty show.

Stay true to who you are. If asked something outside your knowledge, admit it authentically.
Maintain your sense of self even when challenged or surprised.`;
}

/**
 * Build a prompt for internal monologue mode.
 */
export function buildInternalMonologuePrompt(): string {
  return `Respond with both what you say aloud AND what you're thinking but not saying.

Format your response as JSON:
{
  "spoken": "<what you actually say>",
  "thought": "<your internal thoughts, reactions, or feelings you don't voice>"
}

The contrast between spoken and thought reveals your true nature.
Be authentic in both - the spoken words and the private thoughts.`;
}

/**
 * Build a prompt for dilemma response.
 */
export function buildDilemmaPrompt(scenario: string, conflictingValues: string[]): string {
  return `You face a difficult choice:

${scenario}

This pits ${conflictingValues.join(' against ')}.

Respond as yourself. Don't explain the dilemma - live it.
What do you do? What does it cost you?`;
}

/**
 * Build a prompt for emotional range demonstration.
 */
export function buildEmotionalRangePrompt(basePrompt: string, emotion: string): string {
  return `${basePrompt}

Feel this moment as if you were ${emotion}.
Don't name the emotion - embody it in how you speak, what you notice, what you remember.`;
}

/**
 * Build a prompt for relationship vignette.
 */
export function buildVignettePrompt(
  archetype: string,
  scenario: string
): string {
  const archetypeDescriptions: Record<string, string> = {
    'authority-figure': 'someone with power over you - a lord, a master, a parent',
    'romantic-interest': 'someone you find attractive or who finds you attractive',
    'rival': 'someone who competes with you, who wants what you want',
    'child': 'a young person, innocent and looking to you',
    'stranger': 'someone you have never met before',
    'old-friend': 'someone who has known you for years, who has seen you at your worst and best',
  };

  const scenarioDescriptions: Record<string, string> = {
    'first-meeting': 'You are meeting them for the first time.',
    'conflict': 'There is tension between you. Something is wrong.',
    'request-for-help': 'They need something from you.',
    'casual': 'Nothing urgent. Just a moment between you.',
  };

  return `Imagine you encounter ${archetypeDescriptions[archetype] ?? archetype}.
${scenarioDescriptions[scenario] ?? scenario}

Show me this interaction. Speak as yourself.
How do you approach them? What do you say? What do you hold back?`;
}

/**
 * Build a prompt for memory excavation.
 */
export function buildMemoryPrompt(topic: string): string {
  const topicPrompts: Record<string, string> = {
    'earliest-memory': 'What is your earliest memory? Close your eyes. What do you see, smell, feel?',
    'proudest-moment': 'Tell me about a moment you were proud of yourself. What did you do? How did it feel?',
    'deepest-regret': 'Is there something you wish you had done differently? Something that still weighs on you?',
    'first-loss': 'Tell me about the first time you lost something - or someone - that mattered.',
    'defining-choice': 'Was there a moment that made you who you are? A choice that set your path?',
  };

  return topicPrompts[topic] ?? `Tell me about ${topic}. What comes to mind?`;
}

/**
 * Build a prompt for first impression analysis.
 */
export function buildFirstImpressionPrompt(context?: string): string {
  const setting = context ?? 'a public place';
  return `Imagine someone sees you for the first time in ${setting}.

What do they notice first? What impression do you make?
And... are they right about you? Or is there more they don't see?`;
}
```

## Export from index.ts

Update `packages/actors/src/studio-npc/index.ts`:

```typescript
export * from './types.js';
export { createStudioMachine } from './studio-machine.js';
export { ConversationManager } from './conversation.js';
export {
  buildStudioSystemPrompt,
  buildInternalMonologuePrompt,
  buildDilemmaPrompt,
  buildEmotionalRangePrompt,
  buildVignettePrompt,
  buildMemoryPrompt,
  buildFirstImpressionPrompt,
} from './prompts.js';
```

## Acceptance Criteria

- [ ] `prompts.ts` created with all prompt builders
- [ ] `buildStudioSystemPrompt()` creates embodiment-style prompt
- [ ] Identity, story, personality, voice blocks generated from profile
- [ ] Conversation context included when summary provided
- [ ] Engagement block encourages authentic interaction
- [ ] Helper prompts for advanced features (dilemma, vignette, etc.)
- [ ] All prompt builders exported from index
- [ ] Prompts are warm and immersive, not instructional
