import { BaseAgent } from '../core/base.js';
import { buildDimensionTraitPhrases } from './personality-mapping.js';
import type {
  AgentConfig,
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  CharacterSlice,
  IntentSegment,
  IntentType,
  AccumulatedSensoryContext,
} from '../core/types.js';
import type { NpcAgentInput } from './types.js';
import type {
  SensoryDetail,
  NpcResponseConfig,
  CharacterInstanceAffinity,
} from '@minimal-rpg/schemas';
import { buildAffinityContext, formatAffinityPrompt } from '@minimal-rpg/schemas';

/**
 * Agent responsible for NPC dialogue and reactions.
 * Handles 'talk' intents (dialogue) and 'narrate' intents (reactions to player actions).
 */
export class NpcAgent extends BaseAgent {
  public readonly agentType: AgentType = 'npc';
  public readonly name = 'NPC/Dialogue Agent';

  /** Intent types this agent can handle */
  private static readonly HANDLED_INTENTS: IntentType[] = ['talk', 'narrate'];

  constructor(config: AgentConfig = {}) {
    super(config);
  }

  canHandle(intent: AgentIntent): boolean {
    return NpcAgent.HANDLED_INTENTS.includes(intent.type);
  }

  protected async process(input: AgentInput): Promise<AgentOutput> {
    // Prefer an explicit NPC slice when provided; fall back to the
    // primary character slice for backward compatibility.
    const character = input.stateSlices.npc ?? input.stateSlices.character;

    if (!character) {
      return {
        narrative: 'There is no one here to talk to.',
        diagnostics: {
          warnings: ['No character data available'],
        },
      };
    }

    // If we have an LLM provider, use it for dialogue
    if (this.llmProvider) {
      return this.generateLlmDialogue(input, character);
    }

    // Fallback to template-based dialogue
    return this.generateTemplateDialogue(input, character);
  }

  /**
   * Generate dialogue using the LLM provider.
   */
  private async generateLlmDialogue(
    input: AgentInput,
    character: CharacterSlice
  ): Promise<AgentOutput> {
    // Use enhanced prompt if we have action sequences
    const npcInput = input as NpcAgentInput;
    const hasActionSequence =
      npcInput.actionSequence && npcInput.actionSequence.completedActions.length > 0;

    let systemPrompt: string;
    if (hasActionSequence) {
      // Import the default config at runtime to avoid circular dependencies
      const responseConfig: NpcResponseConfig = npcInput.responseConfig ?? {
        minSentencesPerAction: 2,
        maxSentencesPerAction: 3,
        minSensoryDetailsPerAction: 1,
        enforceTemporalOrdering: true,
        showPendingActions: true,
      };
      systemPrompt = this.buildEnhancedSystemPrompt(character, npcInput, responseConfig);
    } else {
      systemPrompt = this.buildDialogueSystemPrompt(character, input);
    }

    const userPrompt = this.buildDialogueUserPrompt(input);

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: this.config.temperature ?? 0.7,
        maxTokens: this.config.maxTokens ?? 800, // Increased from 500 to allow richer responses with sensory details
      });

      const promptDebug = {
        system: systemPrompt,
        user: userPrompt,
        response: response.text,
      };

      return {
        narrative: this.formatDialogueResponse(character.name, response.text),
        diagnostics: {
          tokenUsage: response.usage,
          debug: promptDebug,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        narrative: this.generateFallbackDialogue(character),
        diagnostics: {
          warnings: [`LLM generation failed: ${errorMessage}`],
          debug: {
            system: systemPrompt,
            user: userPrompt,
          },
        },
      };
    }
  }

  /**
   * Generate dialogue using templates (no LLM).
   */
  private generateTemplateDialogue(input: AgentInput, character: CharacterSlice): AgentOutput {
    // Check for relevant knowledge context
    const relevantContext = this.findRelevantContext(input);

    if (relevantContext.length > 0) {
      // Use knowledge context to inform the response
      const contextInfo = relevantContext.map((c) => c.content).join(' ');
      return {
        narrative: `${character.name} considers your words. "${this.generateContextualResponse(contextInfo)}"`,
      };
    }

    // Generic response based on personality
    return {
      narrative: this.generateFallbackDialogue(character),
    };
  }

  /**
   * Count the total number of sensory details available in accumulated context.
   */
  private countSensoryDetails(context?: AccumulatedSensoryContext): number {
    if (!context?.perAction) return 0;

    let count = 0;
    for (const action of context.perAction) {
      if (action.sensory.smell?.length) count += action.sensory.smell.length;
      if (action.sensory.touch?.length) count += action.sensory.touch.length;
      if (action.sensory.taste?.length) count += action.sensory.taste.length;
      if (action.sensory.sound?.length) count += action.sensory.sound.length;
      if (action.sensory.sight?.length) count += action.sensory.sight.length;
    }
    return count;
  }

  /**
   * Build enhanced system prompt with action sequence and response guidelines.
   */
  private buildEnhancedSystemPrompt(
    character: CharacterSlice,
    input: NpcAgentInput,
    responseConfig: NpcResponseConfig
  ): string {
    const parts: string[] = [];

    // Start with base character prompt
    const basePrompt = this.buildDialogueSystemPrompt(character, input);
    parts.push(basePrompt);

    // Add action sequence section (NEW)
    if (input.actionSequence?.completedActions.length) {
      parts.push('\n--- ACTION SEQUENCE ---');
      parts.push('The player performed these actions in order:');

      for (const action of input.actionSequence.completedActions) {
        const sensory = input.accumulatedContext?.perAction.find((p) => p.actionId === action.id);
        parts.push(`\n${action.order}. ✅ ${action.description}`);

        if (sensory?.sensory) {
          const senses = Object.entries(sensory.sensory)
            .filter(([, v]) => v?.length)
            .map(([k, v]) => {
              const details = v as SensoryDetail[];
              return `${k}: ${details.map((s) => s.description).join(', ')}`;
            });
          if (senses.length) {
            parts.push(`   Sensory: ${senses.join('; ')}`);
          }
        }
      }

      if (input.actionSequence.interruptedAt) {
        parts.push(`\n❌ INTERRUPTED: ${input.actionSequence.interruptedAt.reason}`);
        if (input.actionSequence.interruptedAt.consequence) {
          parts.push(`   Consequence: ${input.actionSequence.interruptedAt.consequence}`);
        }
      }

      if (responseConfig.showPendingActions && input.actionSequence.pendingActions.length) {
        parts.push('\n⏸️ PENDING (not attempted):');
        for (const action of input.actionSequence.pendingActions) {
          parts.push(`   - ${action.description}`);
        }
      }
    }

    // Add response guidelines (NEW)
    const actionCount = input.actionSequence?.completedActions.length ?? 1;
    const sensoryCount = this.countSensoryDetails(input.accumulatedContext);

    parts.push('\n--- RESPONSE GUIDELINES ---');
    parts.push(`Actions to cover: ${actionCount}`);
    parts.push(`Sensory details available: ${sensoryCount}`);

    const minLength = actionCount * responseConfig.minSentencesPerAction;
    const maxLength = actionCount * responseConfig.maxSentencesPerAction;
    parts.push(`Minimum response length: ${minLength}-${maxLength} sentences`);
    parts.push('');
    parts.push('RULES:');
    parts.push('1. Cover each action IN ORDER in your narrative');

    if (responseConfig.enforceTemporalOrdering) {
      parts.push('2. Do not describe action N+1 consequences before action N completes');
    }

    parts.push('3. Weave sensory details naturally where they enhance the scene');

    if (input.actionSequence?.interruptedAt) {
      parts.push('4. If interrupted, end narrative at the interruption point');
      parts.push('5. Do NOT list what player "couldn\'t do" - let narrative imply it');
    } else {
      parts.push('4. Do NOT invent sensory details not provided');
    }

    return parts.join('\n');
  }

  /**
   * Build the system prompt for dialogue generation.
   */
  private buildDialogueSystemPrompt(character: CharacterSlice, input: AgentInput): string {
    const parts: string[] = [];

    // Core identity and POV instructions
    parts.push(`You are writing for the character ${character.name}.`);
    parts.push('\n--- CRITICAL FORMATTING RULES ---');
    parts.push(
      '1. Write in THIRD PERSON for all actions and descriptions ("she giggles", NOT "I giggle")'
    );
    parts.push('2. Use FIRST PERSON only inside quoted dialogue ("I love that!")');
    parts.push(
      '3. Do NOT prefix your response with the character name (no "Taylor Swift:" prefix)'
    );
    parts.push('4. Only wrap SPOKEN words in quotes. Actions go in *asterisks* without quotes.');
    parts.push('5. Keep response concise (1-3 sentences).');
    parts.push('\nCorrect: *She giggles softly.* "I love that!"');
    parts.push('Wrong: Taylor Swift: "*I giggle softly.* I love that!"');

    if (character.backstory) {
      parts.push(`\nBackstory: ${character.backstory}`);
    }

    // Include player character (persona) context when available
    if (input.persona) {
      parts.push('\n--- PLAYER CHARACTER ---');
      if (input.persona.name) {
        parts.push(`The player character is named ${input.persona.name}.`);
      }
      if (input.persona.age !== undefined) {
        parts.push(`Age: ${input.persona.age}`);
      }
      if (input.persona.gender) {
        parts.push(`Gender: ${input.persona.gender}`);
      }
      if (input.persona.summary) {
        parts.push(`${input.persona.summary}`);
      }
      if (input.persona.appearance) {
        const appearance = input.persona.appearance;
        const appearanceDescription =
          typeof appearance === 'string'
            ? appearance
            : `build: ${appearance.build.height} height, ${appearance.build.torso} torso, ${appearance.build.arms.build} arms, ${appearance.build.legs.build} legs`;
        parts.push(`Appearance: ${appearanceDescription}`);
      }
      parts.push('This information describes the USER, not your character.');
    }

    // Handle personality (string or string[])
    if (character.personality) {
      const traits = Array.isArray(character.personality)
        ? character.personality.join(', ')
        : character.personality;
      parts.push(`\nYour personality traits: ${traits}`);
    }

    // Use personalityMap if available for richer behavior
    if (character.personalityMap) {
      const pm = character.personalityMap;
      if (pm.speech) {
        const speechParts: string[] = [];
        if (pm.speech.vocabulary) speechParts.push(`vocabulary: ${pm.speech.vocabulary}`);
        if (pm.speech.formality) speechParts.push(`formality: ${pm.speech.formality}`);
        if (pm.speech.directness) speechParts.push(`directness: ${pm.speech.directness}`);
        if (speechParts.length) {
          parts.push(`\nSpeech style: ${speechParts.join(', ')}`);
        }
      }
      if (pm.values?.length) {
        parts.push(`\nCore values: ${pm.values.map((v) => v.value).join(', ')}`);
      }

      const sliderLines = buildDimensionTraitPhrases(pm);
      if (sliderLines.length) {
        parts.push('\nCore temperament based on personality sliders:');
        for (const line of sliderLines) {
          parts.push(`- ${line}`);
        }
      }
    }

    if (character.goals && character.goals.length > 0) {
      parts.push(`\nYour current goals: ${character.goals.join('; ')}`);
    }

    // Add relevant knowledge context
    if (input.knowledgeContext && input.knowledgeContext.length > 0) {
      parts.push('\nRelevant information about you:');
      for (const item of input.knowledgeContext.slice(0, 5)) {
        parts.push(`- ${item.content}`);
      }
    }

    // Add affinity/relationship context if available
    const affinityContext = this.extractAffinityContext(input);
    if (affinityContext) {
      parts.push('\n--- RELATIONSHIP WITH PLAYER ---');
      parts.push(formatAffinityPrompt(affinityContext));

      // Add disposition-based behavioral guidance
      const disposition = affinityContext.relationship;
      parts.push(`\nCurrent disposition: ${disposition}`);
      parts.push(this.getDispositionGuidance(disposition));
    }

    // Add NPC context if available (schedule, availability)
    const npcContext = this.extractNpcContext(input);
    if (npcContext) {
      if (npcContext.schedule && !npcContext.schedule.available) {
        parts.push('\n--- AVAILABILITY ---');
        parts.push(`You are currently unavailable: ${npcContext.schedule.unavailableReason}`);
        parts.push(
          'You may briefly acknowledge the player but should indicate you cannot talk now.'
        );
      }

      if (npcContext.awareness) {
        const awareness = npcContext.awareness;
        if (!awareness.hasMet) {
          parts.push('\n--- FIRST MEETING ---');
          parts.push(
            'This is your first time meeting this player. Introduce yourself appropriately.'
          );
        } else if (awareness.interactionCount && awareness.interactionCount > 10) {
          parts.push('\n--- ESTABLISHED RELATIONSHIP ---');
          parts.push(`You have interacted with this player ${awareness.interactionCount} times.`);
          parts.push('You know them well and can reference past conversations naturally.');
        }
      }

      if (npcContext.mood) {
        parts.push(
          `\nCurrent mood: ${npcContext.mood.primary} (intensity: ${npcContext.mood.intensity?.toFixed(1) ?? '0.5'})`
        );
      }
    }

    // Handle compound intents with segments
    if (input.intent?.segments && input.intent.segments.length > 0) {
      parts.push('\n--- COMPOUND INPUT ---');
      parts.push(
        'The player has sent a complex input with multiple parts. React to ALL segments naturally, in order:'
      );
      this.appendSegmentGuidance(parts, input.intent.segments);
    }
    // Handle single narrate intent
    else if (input.intent?.type === 'narrate') {
      const narrateType = input.intent.params?.narrateType;
      if (narrateType) {
        parts.push('\n--- RESPONSE CONTEXT ---');
        switch (narrateType) {
          case 'thought':
            parts.push(
              'The player has described an INTERNAL THOUGHT. You may be narratively aware of their emotional state or body language, but your character cannot know or reference their actual thoughts. Respond naturally to what you can observe.'
            );
            break;
          case 'action':
            parts.push(
              'The player has described a PHYSICAL ACTION. React naturally to what they did. You may respond with dialogue, actions, or both.'
            );
            break;
          case 'emote':
            parts.push(
              'The player has described an EMOTIONAL STATE or reaction. Respond naturally to their visible emotional cues. You may respond with dialogue, actions, or both.'
            );
            break;
          case 'narrative':
            parts.push(
              'The player has described a NARRATIVE passage (time skip, scene setting, etc). Continue the narrative naturally, describing how you react or what happens next.'
            );
            break;
        }
        parts.push('You may include actions (in *asterisks*) alongside or instead of dialogue.');
      }
    } else {
      parts.push('\nRespond in character using third person for actions.');
      parts.push('Do not include stage directions or actions in parentheses.');
    }

    // Add sensory context if provided (Phase 1 redesign)
    if (input.sensoryContext) {
      parts.push('\n--- SENSORY CONTEXT (available for narrative use) ---');
      const sc = input.sensoryContext;

      if (sc.playerFocus) {
        parts.push(
          `Player is focusing on: ${sc.playerFocus.sense}` +
            (sc.playerFocus.target ? ` (${sc.playerFocus.target})` : '') +
            (sc.playerFocus.bodyPart ? ` - ${sc.playerFocus.bodyPart}` : '')
        );
      }

      if (sc.available.smell?.length) {
        parts.push('\nSmell data:');
        for (const s of sc.available.smell) {
          parts.push(`- ${s.source}: ${s.description} (intensity: ${s.intensity})`);
        }
      }

      if (sc.available.touch?.length) {
        parts.push('\nTouch data:');
        for (const t of sc.available.touch) {
          parts.push(`- ${t.source}: ${t.description} (intensity: ${t.intensity})`);
        }
      }

      if (sc.available.taste?.length) {
        parts.push('\nTaste data:');
        for (const t of sc.available.taste) {
          parts.push(`- ${t.source}: ${t.description} (intensity: ${t.intensity})`);
        }
      }

      if (sc.available.sound?.length) {
        parts.push('\nSound data:');
        for (const s of sc.available.sound) {
          parts.push(`- ${s.source}: ${s.description}`);
        }
      }

      if (sc.available.sight?.length) {
        parts.push('\nSight data:');
        for (const s of sc.available.sight) {
          parts.push(`- ${s.source}: ${s.description}`);
        }
      }

      // Stronger instruction when player is actively performing sensory action
      if (sc.narrativeHints?.recentSensoryAction) {
        parts.push('\n--- IMPORTANT: SENSORY NARRATION REQUIRED ---');
        parts.push('The player is ACTIVELY experiencing a sensory moment. Your response MUST:');
        parts.push(
          '1. START with sensory narration: describe what the player experiences using the data above'
        );
        parts.push('2. Use SECOND PERSON for sensory narration ("You catch...", "You feel...")');
        parts.push(
          '3. Include the SPECIFIC sensory details from the data (e.g., "vinegary", "cheesy", "warm")'
        );
        parts.push('4. Then add NPC reaction in THIRD PERSON ("she giggles", NOT "I giggle")');
        parts.push('5. Only wrap SPOKEN dialogue in quotes, actions in *asterisks*');
        parts.push('\nCorrect format:');
        parts.push(
          '*You catch the vinegary aroma from her feet.* "We need to talk about this," *she giggles, pulling her foot back.*'
        );
        parts.push('\nWrong format:');
        parts.push('Taylor Swift: "*You catch...* I giggle..."');
      } else {
        parts.push('\nWeave these details naturally into your response where appropriate.');
      }
      parts.push('Do NOT invent sensory details not listed above.');
    }

    return parts.join('\n');
  }

  /**
   * Append guidance for compound input segments.
   */
  private appendSegmentGuidance(parts: string[], segments: IntentSegment[]): void {
    const hasTalk = segments.some((s) => s.type === 'talk');
    const hasThought = segments.some((s) => s.type === 'thought');
    const hasAction = segments.some((s) => s.type === 'action');
    const hasEmote = segments.some((s) => s.type === 'emote');
    const hasSensory = segments.some((s) => s.type === 'sensory');

    if (hasThought) {
      parts.push(
        '- THOUGHT segments: You may be narratively aware of their emotional state, but cannot know or reference their actual thoughts.'
      );
    }
    if (hasAction) {
      parts.push('- ACTION segments: React naturally to what they physically do.');
    }
    if (hasEmote) {
      parts.push('- EMOTE segments: Respond to their visible emotional cues.');
    }
    if (hasTalk) {
      parts.push('- SPEECH segments: Respond to what they say with dialogue.');
    }
    if (hasSensory) {
      parts.push(
        '- SENSORY segments: The player is aware of sensory details. React naturally if appropriate.'
      );
    }

    parts.push('\nYou may include actions (in *asterisks*) alongside or instead of dialogue.');
  }

  /**
   * Build the user prompt for dialogue generation.
   */
  private buildDialogueUserPrompt(input: AgentInput): string {
    const parts: string[] = [];

    const convo = input.npcConversationHistory ?? input.conversationHistory;

    // Add recent conversation history
    if (convo && convo.length > 0) {
      parts.push('Recent conversation:');
      for (const turn of convo.slice(-3)) {
        const speaker = turn.speaker === 'player' ? 'Player' : 'You';
        parts.push(`${speaker}: ${turn.content}`);
      }
      parts.push('');
    }

    // Handle compound inputs with segments
    if (input.intent?.segments && input.intent.segments.length > 0) {
      parts.push('Player input (multiple parts):');
      for (const segment of input.intent.segments) {
        const label = this.getSegmentLabel(segment);
        parts.push(`  [${label}] ${segment.content}`);
      }
      if (input.intent.segments.some((s) => s.type === 'thought')) {
        parts.push('\n(Remember: you cannot know their thoughts, only observe their demeanor)');
      }
    }
    // Single narrate intent (legacy support)
    else if (input.intent?.type === 'narrate') {
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
    }
    // Standard talk intent
    else {
      parts.push(`Player says: "${input.playerInput}"`);
    }

    // Remind about format (do NOT say "Respond as [Name]:" which encourages prefixing)
    parts.push('\nWrite your response now (no name prefix, third person for actions):');

    return parts.join('\n');
  }

  /**
   * Get a human-readable label for a segment.
   */
  private getSegmentLabel(segment: IntentSegment): string {
    switch (segment.type) {
      case 'talk':
        return 'SPEECH';
      case 'action':
        return 'ACTION';
      case 'thought':
        return 'THOUGHT';
      case 'emote':
        return 'EMOTE';
      case 'sensory':
        return segment.sensoryType?.toUpperCase() ?? 'SENSORY';
      default:
        return 'NARRATION';
    }
  }

  /**
   * Format the LLM response, cleaning up common issues.
   * Does NOT add character name prefix - that's handled by UI layer.
   */
  private formatDialogueResponse(characterName: string, response: string): string {
    // Clean up the response
    let cleaned = response.trim();

    // Remove any leading character name if the LLM included it (various formats)
    const namePatterns = [
      new RegExp(`^${characterName}:\\s*`, 'i'), // "Taylor Swift: ..."
      new RegExp(`^${characterName.split(' ')[0]}:\\s*`, 'i'), // "Taylor: ..."
      new RegExp(`^\\*?${characterName}\\*?:\\s*`, 'i'), // "*Taylor Swift*: ..."
    ];
    for (const pattern of namePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove outer quotes if the entire response is wrapped in them
    // (but keep individual dialogue quotes inside)
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      const inner = cleaned.slice(1, -1);
      // Only unwrap if it looks like the whole thing was wrapped
      // (i.e., there's action content starting with *)
      if (inner.startsWith('*') || inner.includes('*')) {
        cleaned = inner;
      }
    }

    // Return WITHOUT name prefix - UI will handle that
    return cleaned;
  }

  /**
   * Find relevant knowledge context for the conversation.
   */
  private findRelevantContext(
    input: AgentInput
  ): typeof input.knowledgeContext extends undefined
    ? never[]
    : NonNullable<typeof input.knowledgeContext> {
    if (!input.knowledgeContext) {
      return [] as never[];
    }

    // Sort by score and return top items
    return [...input.knowledgeContext].sort((a, b) => b.score - a.score).slice(0, 3) as never;
  }

  /**
   * Generate a contextual response based on knowledge.
   */
  private generateContextualResponse(contextInfo: string): string {
    // This is a placeholder for more sophisticated response generation
    const responses = [
      'Ah, yes... I know something about that.',
      'Let me think about that...',
      "That's an interesting question.",
      'Hmm, I have some thoughts on that.',
    ];

    // Use context length to pick a response (deterministic but varied)
    const index = contextInfo.length % responses.length;
    return responses[index] ?? responses[0] ?? '';
  }

  /**
   * Generate a fallback dialogue response.
   */
  private generateFallbackDialogue(character: CharacterSlice): string {
    const greetings = [
      `${character.name} nods in acknowledgment.`,
      `${character.name} regards you thoughtfully.`,
      `${character.name} pauses before speaking.`,
      `${character.name} looks at you with interest.`,
    ];

    // Pick based on name length for consistency
    const index = character.name.length % greetings.length;
    return greetings[index] ?? greetings[0] ?? '';
  }

  /**
   * Extract affinity context from input state slices.
   */
  private extractAffinityContext(
    input: AgentInput
  ): ReturnType<typeof buildAffinityContext> | null {
    const npc = input.stateSlices.npc ?? input.stateSlices.character;
    if (!npc?.instanceId) return null;

    // Get affinity state from the affinity map in state slices
    // The stateSlices object may have additional properties beyond the typed interface
    const slices = input.stateSlices as Record<string, unknown>;
    const affinityMap = slices['affinity'] as Record<string, unknown> | undefined;
    if (!affinityMap) return null;

    const affinityState = affinityMap[npc.instanceId] as CharacterInstanceAffinity | undefined;
    if (!affinityState?.scores) return null;

    return buildAffinityContext(affinityState.scores);
  }

  /**
   * Extract NPC context from input state slices.
   */
  private extractNpcContext(input: AgentInput): NpcContextSlice | null {
    // The stateSlices object may have additional properties beyond the typed interface
    const slices = input.stateSlices as Record<string, unknown>;
    const npcContext = slices['npcContext'] as NpcContextSlice | undefined;
    return npcContext ?? null;
  }

  /**
   * Get behavioral guidance based on disposition level.
   */
  private getDispositionGuidance(disposition: string): string {
    switch (disposition) {
      case 'hostile':
        return 'Be cold, dismissive, or actively antagonistic. You do not like this person.';
      case 'unfriendly':
        return 'Be distant and guarded. Keep responses short and unenthusiastic.';
      case 'neutral':
        return 'Be polite but not warm. Treat them as you would any stranger.';
      case 'friendly':
        return 'Be warm and open. You enjoy talking to this person.';
      case 'close':
        return 'Be affectionate and familiar. You consider this person a good friend.';
      case 'devoted':
        return 'Be deeply warm and caring. This person means a great deal to you.';
      default:
        return 'Respond naturally based on the conversation context.';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override getFallbackNarrative(_input: AgentInput): string {
    return 'The conversation trails off into silence.';
  }
}

/**
 * NPC context slice type (matches NpcContext from governor).
 */
interface NpcContextSlice {
  schedule?: {
    currentSlotId?: string;
    activity?: string;
    scheduledLocationId?: string;
    available: boolean;
    unavailableReason?: string;
  };
  awareness?: {
    hasMet: boolean;
    lastInteractionTurn?: number;
    interactionCount?: number;
    reputation?: number;
  };
  mood?: {
    primary: string;
    intensity?: number;
  };
}
