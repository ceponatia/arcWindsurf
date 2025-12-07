import { BaseAgent } from './base.js';
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
} from './types.js';

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
    const systemPrompt = this.buildDialogueSystemPrompt(character, input);
    const userPrompt = this.buildDialogueUserPrompt(input);

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: this.config.temperature ?? 0.7,
        maxTokens: this.config.maxTokens ?? 500,
      });

      return {
        narrative: this.formatDialogueResponse(character.name, response.text),
        diagnostics: {
          tokenUsage: response.usage,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        narrative: this.generateFallbackDialogue(character),
        diagnostics: {
          warnings: [`LLM generation failed: ${errorMessage}`],
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
   * Build the system prompt for dialogue generation.
   */
  private buildDialogueSystemPrompt(character: CharacterSlice, input: AgentInput): string {
    const parts: string[] = [];

    parts.push(`You are ${character.name}.`);

    if (character.backstory) {
      parts.push(`\nBackstory: ${character.backstory}`);
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
      parts.push('\nRespond in character. Keep your response concise (1-3 sentences).');
      parts.push('Do not include stage directions or actions in parentheses.');
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

    parts.push('\nRespond as your character:');

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
   * Format the LLM response as dialogue.
   */
  private formatDialogueResponse(characterName: string, response: string): string {
    // Clean up the response
    let cleaned = response.trim();

    // Remove any leading character name if the LLM included it
    const namePattern = new RegExp(`^${characterName}:?\\s*`, 'i');
    cleaned = cleaned.replace(namePattern, '');

    // Ensure it starts with a quote if it's dialogue
    if (!cleaned.startsWith('"') && !cleaned.startsWith("'")) {
      cleaned = `"${cleaned}"`;
    }

    return `${characterName}: ${cleaned}`;
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override getFallbackNarrative(_input: AgentInput): string {
    return 'The conversation trails off into silence.';
  }
}
