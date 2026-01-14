# TASK-011: Dilemma Engine

**Priority**: P2
**Phase**: 5 - Advanced Features
**Estimate**: 45 minutes
**Depends On**: TASK-003, TASK-005

---

## Objective

Implement the Dilemma Engine that generates tailored moral dilemmas based on the character's values and analyzes responses to infer value priorities.

## File to Create

`packages/actors/src/studio-npc/dilemma.ts`

## Implementation

```typescript
// packages/actors/src/studio-npc/dilemma.ts
import type { LLMProvider, LLMMessage } from '@minimal-rpg/llm';
import type { CharacterProfile } from '@minimal-rpg/schemas';
import { Effect } from 'effect';
import type { Dilemma, ValueSignal } from './types.js';
import { buildDilemmaPrompt } from './prompts.js';

const DILEMMA_GENERATION_PROMPT = `Generate a moral dilemma for a character.
The dilemma should force a choice between two conflicting values.

Output JSON only:
{
  "scenario": "<2-3 sentence scenario description>",
  "conflictingValues": ["<value1>", "<value2>"],
  "targetTraits": ["<trait path this could reveal>"]
}

Make the dilemma:
- Personal and emotionally charged
- Specific to the character's context
- Without a clearly "right" answer
- Grounded in their world and relationships`;

const VALUE_ANALYSIS_PROMPT = `Analyze this character's response to a moral dilemma.

Dilemma: {scenario}
Conflicting values: {values}
Character's response: {response}

Output JSON only:
[
  {
    "value": "<value name>",
    "priority": <1-10>,
    "evidence": "<quote or reasoning>"
  }
]

Identify which values the character prioritized and why.`;

/**
 * Pre-defined dilemma templates for common value conflicts.
 */
const DILEMMA_TEMPLATES: Array<{
  values: [string, string];
  scenarios: string[];
}> = [
  {
    values: ['loyalty', 'honesty'],
    scenarios: [
      'Your closest friend has committed a crime. The authorities ask you directly if you know where they are hiding.',
      'You discover your mentor has been lying to protect the village from a hard truth. Someone asks you what you know.',
      'Your sibling begs you to lie to your parents about where they were last night. You know they were doing something dangerous.',
    ],
  },
  {
    values: ['justice', 'mercy'],
    scenarios: [
      'You catch the thief who stole food to feed orphans. The law demands harsh punishment.',
      'The person who wronged you years ago now lies helpless before you, begging forgiveness.',
      'A soldier who killed innocents under orders now surrenders to you alone. No one would know if you let them go.',
    ],
  },
  {
    values: ['duty', 'love'],
    scenarios: [
      'Your sworn duty calls you away on the night your child is born. You may never return.',
      'Following orders means betraying someone you love. Refusing means others will suffer.',
      'The person you love asks you to abandon your responsibilities and run away with them.',
    ],
  },
  {
    values: ['self-preservation', 'sacrifice'],
    scenarios: [
      'You can save many by sacrificing yourself, or save yourself and let them perish.',
      'Staying silent keeps you safe. Speaking out puts you in danger but might save others.',
      'You have one healing potion. You need it to survive, but so does the stranger beside you.',
    ],
  },
  {
    values: ['tradition', 'progress'],
    scenarios: [
      'A new method could save lives but violates sacred customs your people have followed for generations.',
      'Your elders forbid a practice that you know would help the community.',
      'Keeping an ancient promise means refusing change that could benefit everyone.',
    ],
  },
];

export interface DilemmaEngineConfig {
  llmProvider: LLMProvider;
}

export class DilemmaEngine {
  private readonly llmProvider: LLMProvider;

  constructor(config: DilemmaEngineConfig) {
    this.llmProvider = config.llmProvider;
  }

  /**
   * Generate a dilemma tailored to the character's profile.
   */
  async generateDilemma(profile: Partial<CharacterProfile>): Promise<Dilemma> {
    // Try to use existing values to create relevant conflict
    const characterValues = profile.personalityMap?.values?.map(v => v.value) ?? [];

    // Find a template that matches character values
    let selectedTemplate = DILEMMA_TEMPLATES.find(t =>
      characterValues.some(v =>
        t.values[0].toLowerCase().includes(v.toLowerCase()) ||
        t.values[1].toLowerCase().includes(v.toLowerCase())
      )
    );

    // Fall back to random template if no match
    if (!selectedTemplate) {
      selectedTemplate = DILEMMA_TEMPLATES[
        Math.floor(Math.random() * DILEMMA_TEMPLATES.length)
      ];
    }

    // Pick random scenario from template
    const scenario = selectedTemplate.scenarios[
      Math.floor(Math.random() * selectedTemplate.scenarios.length)
    ];

    return {
      id: crypto.randomUUID(),
      scenario,
      conflictingValues: selectedTemplate.values,
      targetTraits: ['personalityMap.values'],
    };
  }

  /**
   * Generate a custom dilemma using LLM.
   */
  async generateCustomDilemma(
    profile: Partial<CharacterProfile>,
    focusValues?: string[]
  ): Promise<Dilemma> {
    const contextLines: string[] = [];

    if (profile.name) contextLines.push(`Character: ${profile.name}`);
    if (profile.backstory) contextLines.push(`Backstory: ${profile.backstory.slice(0, 200)}`);
    if (focusValues?.length) {
      contextLines.push(`Focus on conflict between: ${focusValues.join(' and ')}`);
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: DILEMMA_GENERATION_PROMPT },
      { role: 'user', content: contextLines.join('\n') || 'Generate a general moral dilemma.' },
    ];

    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      const parsed = JSON.parse(result.content ?? '{}') as Partial<Dilemma>;

      return {
        id: crypto.randomUUID(),
        scenario: parsed.scenario ?? 'You face a difficult choice.',
        conflictingValues: parsed.conflictingValues ?? ['duty', 'desire'],
        targetTraits: parsed.targetTraits ?? ['personalityMap.values'],
      };
    } catch {
      // Fall back to template
      return this.generateDilemma(profile);
    }
  }

  /**
   * Analyze character's response to a dilemma.
   */
  async analyzeResponse(
    dilemma: Dilemma,
    response: string
  ): Promise<ValueSignal[]> {
    const prompt = VALUE_ANALYSIS_PROMPT
      .replace('{scenario}', dilemma.scenario)
      .replace('{values}', dilemma.conflictingValues.join(', '))
      .replace('{response}', response);

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You analyze character responses to identify value priorities. Output JSON only.' },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await Effect.runPromise(this.llmProvider.chat(messages));
      const parsed = JSON.parse(result.content ?? '[]') as ValueSignal[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Build the prompt to present the dilemma to the character.
   */
  buildCharacterPrompt(dilemma: Dilemma): string {
    return buildDilemmaPrompt(dilemma.scenario, dilemma.conflictingValues);
  }
}
```

## Export from index.ts

Add to `packages/actors/src/studio-npc/index.ts`:

```typescript
export { DilemmaEngine, type DilemmaEngineConfig } from './dilemma.js';
```

## Integration with XState Machine

Update `studio-machine.ts`:

```typescript
generateDilemma: fromPromise(async ({ input }) => {
  const ctx = input as StudioMachineContext;
  const engine = new DilemmaEngine({ llmProvider: ctx.llmProvider });
  const dilemma = await engine.generateDilemma(ctx.profile);
  const prompt = engine.buildCharacterPrompt(dilemma);

  // Store dilemma for later analysis
  return { dilemma, prompt };
}),
```

## Acceptance Criteria

- [x] `DilemmaEngine` class created
- [x] `generateDilemma()` creates dilemma from templates
- [x] `generateCustomDilemma()` uses LLM for custom scenarios
- [x] `analyzeResponse()` extracts value signals from response
- [x] `buildCharacterPrompt()` formats dilemma for character
- [x] Pre-defined templates for common value conflicts
- [x] Template selection based on character's existing values
- [x] Graceful fallback on LLM failure
- [x] Exported from package index
