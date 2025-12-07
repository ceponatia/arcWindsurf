import type {
  Agent,
  AgentConfig,
  AgentDiagnostics,
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  LlmProvider,
} from './types.js';

/**
 * Base class for all agents.
 * Provides common functionality like timing, diagnostics, and LLM access.
 */
export abstract class BaseAgent implements Agent {
  public abstract readonly agentType: AgentType;
  public abstract readonly name: string;

  protected readonly llmProvider: LlmProvider | undefined;
  protected readonly config: AgentConfig;

  constructor(config: AgentConfig = {}) {
    this.config = config;
    this.llmProvider = config.llmProvider;
  }

  /**
   * Execute the agent's logic for a turn.
   * Wraps the internal process method with timing and error handling.
   */
  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      const result = await this.process(input);

      const executionTimeMs = Date.now() - startTime;

      // Merge diagnostics
      const diagnostics: AgentDiagnostics = {
        ...result.diagnostics,
        executionTimeMs,
        warnings: [...warnings, ...(result.diagnostics?.warnings ?? [])],
      };

      return {
        ...result,
        diagnostics,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        narrative: this.getFallbackNarrative(input),
        diagnostics: {
          executionTimeMs,
          warnings: [...warnings, `Agent error: ${errorMessage}`],
        },
      };
    }
  }

  /**
   * Check if this agent can handle the given intent.
   * Subclasses should override to specify their capabilities.
   */
  abstract canHandle(intent: AgentIntent): boolean;

  /**
   * Process a turn and return output.
   * Subclasses must implement this method.
   */
  protected abstract process(input: AgentInput): Promise<AgentOutput>;

  /**
   * Get a fallback narrative when processing fails.
   * Subclasses can override for domain-specific fallbacks.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected getFallbackNarrative(_input: AgentInput): string {
    return 'Something went wrong. Please try again.';
  }

  /**
   * Build a prompt from the input for LLM-based agents.
   * Subclasses can use this as a starting point.
   */
  protected buildBasePrompt(input: AgentInput): string {
    const parts: string[] = [];

    // Add player input
    parts.push(`Player: ${input.playerInput}`);

    // Add knowledge context if available
    if (input.knowledgeContext && input.knowledgeContext.length > 0) {
      parts.push('\nRelevant context:');
      for (const item of input.knowledgeContext) {
        parts.push(`- ${item.path}: ${item.content}`);
      }
    }

    // Add recent conversation if available
    if (input.conversationHistory && input.conversationHistory.length > 0) {
      parts.push('\nRecent conversation:');
      for (const turn of input.conversationHistory.slice(-5)) {
        const speaker = turn.speaker === 'player' ? 'Player' : 'Character';
        parts.push(`${speaker}: ${turn.content}`);
      }
    }

    return parts.join('\n');
  }
}
