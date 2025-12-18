import { BaseAgent } from '../core/base.js';
import type {
  AgentConfig,
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  CharacterSlice,
  IntentType,
} from '../core/types.js';
import type { NpcAgentInput } from './types.js';
import type { NpcResponseConfig } from '@minimal-rpg/schemas';
import {
  buildDialogueSystemPrompt,
  buildDialogueUserPrompt,
  buildEnhancedSystemPrompt,
  getDefaultResponseConfig,
} from './prompts.js';
import {
  findRelevantContext,
  formatDialogueResponse,
  generateContextualResponse,
  generateFallbackDialogue,
} from './formatting.js';

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
      const responseConfig: NpcResponseConfig =
        npcInput.responseConfig ?? getDefaultResponseConfig();
      systemPrompt = buildEnhancedSystemPrompt(character, npcInput, responseConfig);
    } else {
      systemPrompt = buildDialogueSystemPrompt(character, input);
    }

    const userPrompt = buildDialogueUserPrompt(input);

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
        narrative: formatDialogueResponse(character.name, response.text),
        diagnostics: {
          tokenUsage: response.usage,
          debug: promptDebug,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        narrative: generateFallbackDialogue(character),
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
    const relevantContext = findRelevantContext(input);

    if (relevantContext.length > 0) {
      // Use knowledge context to inform the response
      const contextInfo = relevantContext.map((c) => c.content).join(' ');
      return {
        narrative: `${character.name} considers your words. "${generateContextualResponse(contextInfo)}"`,
      };
    }

    // Generic response based on personality
    return {
      narrative: generateFallbackDialogue(character),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override getFallbackNarrative(_input: AgentInput): string {
    return 'The conversation trails off into silence.';
  }
}
