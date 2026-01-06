import { BaseAgent } from '../core/base.js';
import type {
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  CharacterSlice,
  ConversationTurn,
  IntentType,
} from '../core/types.js';
import type {
  NpcAgentConfig,
  NpcAgentInput,
  NpcAgentOutput,
  NpcAgentServices,
  NpcMessageRepository,
} from './types.js';
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

  private readonly messageRepository: NpcMessageRepository | undefined;
  private readonly historyLimit: number;
  private readonly services: NpcAgentServices;

  constructor(config: NpcAgentConfig = {}) {
    super(config);
    this.services = config.services ?? {};
    this.messageRepository = this.services.messageRepository;
    this.historyLimit = config.historyLimit ?? 30;
  }

  canHandle(intent: AgentIntent): boolean {
    return NpcAgent.HANDLED_INTENTS.includes(intent.type);
  }

  protected async process(input: AgentInput): Promise<NpcAgentOutput> {
    // Prefer an explicit NPC slice when provided; fall back to the
    // primary character slice for backward compatibility.
    const npcInput = input as NpcAgentInput;
    const character = npcInput.stateSlices.npc ?? npcInput.stateSlices.character;

    if (!character) {
      return {
        narrative: 'There is no one here to talk to.',
        diagnostics: {
          warnings: ['No character data available'],
        },
      };
    }

    // Enrich input with sensory context if service is available
    if (this.services.sensoryService && !npcInput.sensoryContext) {
      try {
        const sensoryOutput = this.services.sensoryService.getSensoryContext(npcInput);
        if (sensoryOutput.sensoryContext) {
          npcInput.sensoryContext = sensoryOutput.sensoryContext;
        }
      } catch (error) {
        console.warn('[NpcAgent] Failed to get sensory context', error);
      }
    }

    const dialogueInput = await this.buildDialogueInput(npcInput);

    const output = this.llmProvider
      ? await this.generateLlmDialogue(dialogueInput, character)
      : this.generateTemplateDialogue(dialogueInput, character);

    const outputWithDiagnostics = this.annotateWithServiceDiagnostics(output);

    return {
      ...outputWithDiagnostics,
      npcPriority: this.computeNpcPriority(dialogueInput),
    };
  }

  private async buildDialogueInput(input: NpcAgentInput): Promise<NpcAgentInput> {
    const { conversationHistory: _omitSharedHistory, npcConversationHistory, ...rest } = input;
    void _omitSharedHistory; // Explicitly drop shared history from NPC context
    const fetchedHistory = await this.loadConversationHistory(input);
    const effectiveHistory = fetchedHistory ?? npcConversationHistory;

    if (effectiveHistory && effectiveHistory.length > 0) {
      return { ...rest, npcConversationHistory: effectiveHistory };
    }

    return rest;
  }

  private async loadConversationHistory(
    input: NpcAgentInput
  ): Promise<ConversationTurn[] | undefined> {
    if (!this.messageRepository) {
      return input.npcConversationHistory;
    }

    const ownerEmail = input.ownerEmail;
    const sessionId = input.sessionId;
    const npcId =
      input.npcId ?? input.stateSlices.npc?.instanceId ?? input.stateSlices.character?.instanceId;

    if (!ownerEmail || !sessionId || !npcId) {
      return input.npcConversationHistory;
    }

    try {
      return await this.messageRepository.fetchOwnHistory({
        ownerEmail,
        sessionId,
        npcId,
        limit: this.historyLimit,
      });
    } catch (error) {
      // Preserve existing history if fetch fails; diagnostics recorded downstream via warnings
      console.warn('[NpcAgent] Failed to fetch NPC history', error);
      return input.npcConversationHistory;
    }
  }

  private annotateWithServiceDiagnostics(output: AgentOutput): AgentOutput {
    const servicesAvailable = {
      messageRepository: Boolean(this.services.messageRepository),
      sensoryService: Boolean(this.services.sensoryService),
      proximityService: Boolean(this.services.proximityService),
      hygieneService: Boolean(this.services.hygieneService),
      memoryService: Boolean(this.services.memoryService),
    };

    return {
      ...output,
      diagnostics: {
        ...output.diagnostics,
        debug: {
          ...(output.diagnostics?.debug ?? {}),
          servicesAvailable,
        },
      },
    };
  }

  private computeNpcPriority(input: NpcAgentInput): number {
    const base = input.isDirectlyAddressed ? 3 : 1;

    const proximityScore: Record<string, number> = {
      intimate: 2.5,
      close: 2,
      near: 1.5,
      distant: 1,
    };

    const proximity = input.proximityLevel ? (proximityScore[input.proximityLevel] ?? 1) : 1;
    const tagWeight = (input.npcTags?.length ?? 0) > 0 ? 0.5 : 0;
    return Number((base + proximity + tagWeight).toFixed(2));
  }

  /**
   * Generate dialogue using the LLM provider.
   */
  private async generateLlmDialogue(
    input: NpcAgentInput,
    character: CharacterSlice
  ): Promise<AgentOutput> {
    // Use enhanced prompt if we have action sequences
    const hasActionSequence =
      input.actionSequence && input.actionSequence.completedActions.length > 0;

    let systemPrompt: string;
    if (hasActionSequence) {
      // Import the default config at runtime to avoid circular dependencies
      const responseConfig: NpcResponseConfig = input.responseConfig ?? getDefaultResponseConfig();
      systemPrompt = buildEnhancedSystemPrompt(character, input, responseConfig);
    } else {
      systemPrompt = buildDialogueSystemPrompt(character, input);
    }

    const userPrompt = buildDialogueUserPrompt(input);

    try {
      const response = await this.llmProvider?.generate(userPrompt, {
        systemPrompt,
        temperature: this.config.temperature ?? 0.7,
        maxTokens: this.config.maxTokens ?? 800, // Increased from 500 to allow richer responses with sensory details
      });

      if (!response || !('text' in response)) {
        throw new Error('Invalid response from LLM provider');
      }

      const promptDebug = {
        system: systemPrompt,
        user: userPrompt,
        response: response.text,
      };

      return {
        narrative: formatDialogueResponse(character.name, response.text),
        diagnostics: {
          tokenUsage: 'usage' in response ? response.usage : undefined,
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
