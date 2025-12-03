import { BaseAgent } from './base.js';
import type {
  AgentConfig,
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  CharacterSlice,
  IntentType,
} from './types.js';

/**
 * Agent responsible for NPC dialogue and conversation.
 * Handles 'talk' intents and generates in-character responses.
 */
export class NpcAgent extends BaseAgent {
  public readonly agentType: AgentType = 'npc';
  public readonly name = 'NPC/Dialogue Agent';

  /** Intent types this agent can handle */
  private static readonly HANDLED_INTENTS: IntentType[] = ['talk'];

  constructor(config: AgentConfig = {}) {
    super(config);
  }

  canHandle(intent: AgentIntent): boolean {
    return NpcAgent.HANDLED_INTENTS.includes(intent.type);
  }

  protected async process(input: AgentInput): Promise<AgentOutput> {
    const character = input.stateSlices.character;

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
    parts.push(character.summary);

    if (character.personalityTraits && character.personalityTraits.length > 0) {
      parts.push(`\nYour personality traits: ${character.personalityTraits.join(', ')}`);
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

    parts.push('\nRespond in character. Keep your response concise (1-3 sentences).');
    parts.push('Do not include stage directions or actions in parentheses.');

    return parts.join('\n');
  }

  /**
   * Build the user prompt for dialogue generation.
   */
  private buildDialogueUserPrompt(input: AgentInput): string {
    const parts: string[] = [];

    // Add recent conversation history
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      parts.push('Recent conversation:');
      for (const turn of input.conversationHistory.slice(-3)) {
        const speaker = turn.speaker === 'player' ? 'Player' : 'You';
        parts.push(`${speaker}: ${turn.content}`);
      }
      parts.push('');
    }

    parts.push(`Player says: "${input.playerInput}"`);
    parts.push('\nRespond as your character:');

    return parts.join('\n');
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
