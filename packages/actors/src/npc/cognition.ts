import { Effect } from 'effect';
import type { LLMMessage, LLMProvider } from '@minimal-rpg/llm';
import type { CharacterProfile, WorldEvent } from '@minimal-rpg/schemas';
import type { CognitionContext, ActionResult } from './types.js';
import { NPC_DECISION_SYSTEM_PROMPT, buildNpcCognitionPrompt } from './prompts.js';
import { performance } from 'node:perf_hooks';

const NPC_DECISION_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((err: unknown) => {
        clearTimeout(timeout);
        const error = err instanceof Error ? err : new Error(String(err));
        reject(error);
      });
  });
}

/**
 * Cognition layer - decision-making for NPCs.
 *
 * This is a simplified version for Phase 3.
 * Phase 4 will integrate LLM providers for rich decision-making.
 */
export class CognitionLayer {
  /**
   * Decide on an action based on perception (synchronous for Phase 3).
   */
  static decideSync(context: CognitionContext): ActionResult | null {
    const { perception, state } = context;

    // No relevant events - idle
    if (perception.relevantEvents.length === 0) {
      return null;
    }

    // Simple rule: If someone spoke, respond with a SPEAK_INTENT
    const speakEvents = perception.relevantEvents.filter((e) => e.type === 'SPOKE');
    if (speakEvents.length > 0) {
      const lastSpeak = speakEvents[speakEvents.length - 1] as Record<string, unknown>;
      const speakerActorId = lastSpeak['actorId'] as string | undefined;

      if (speakerActorId && speakerActorId !== state.id) {
        const intent: WorldEvent = {
          type: 'SPEAK_INTENT',
          content: `[NPC ${state.npcId} responding to speech]`,
          targetActorId: speakerActorId,
          actorId: state.id,
          sessionId: state.sessionId,
          timestamp: new Date(),
        };

        return { intent, delayMs: 500 };
      }
    }

    // Default: No action
    return null;
  }

  /**
   * Decide on an action based on perception (async for Phase 4 LLM integration).
   *
   * For Phase 3, this just calls decideSync.
   * Phase 4 will replace this with LLM-based cognition.
   */
  static async decide(context: CognitionContext): Promise<ActionResult | null> {
    return await Promise.resolve(this.decideSync(context));
  }

  /**
   * LLM-backed decision making. Falls back to rule-based decideSync on error or empty response.
   */
  static async decideLLM(
    context: CognitionContext,
    profile: CharacterProfile,
    llmProvider: LLMProvider
  ): Promise<ActionResult | null> {
    if (context.perception.relevantEvents.length === 0) return null;

    const start = performance.now();

    try {
      const prompt = buildNpcCognitionPrompt(context.perception, context.state, profile);
      const messages: LLMMessage[] = [
        { role: 'system', content: NPC_DECISION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await withTimeout(
        Effect.runPromise(llmProvider.chat(messages)),
        NPC_DECISION_TIMEOUT_MS,
        '[NPC Cognition] LLM decision'
      );

      const elapsed = performance.now() - start;
      if (elapsed > NPC_DECISION_TIMEOUT_MS) {
        console.warn(`[NPC Cognition] Decision took ${elapsed.toFixed(0)}ms (>2s threshold)`);
      }

      const content = result.content?.trim();
      if (!content || content.toUpperCase().includes('NO_ACTION')) {
        return this.decideSync(context);
      }

      const intent: WorldEvent = {
        type: 'SPEAK_INTENT',
        content,
        actorId: context.state.id,
        sessionId: context.state.sessionId,
        timestamp: new Date(),
      };

      return { intent, delayMs: 300 } satisfies ActionResult;
    } catch (error) {
      if (error instanceof Error && error.message.includes('timed out')) {
        console.warn(`[NPC Cognition] Decision timed out (>${NPC_DECISION_TIMEOUT_MS}ms); falling back to rules`);
      }
      console.error('[NPC Cognition] LLM failed, falling back to rules', error);
      return this.decideSync(context);
    }
  }

  /**
   * Evaluate if the NPC should act immediately or wait.
   */
  static shouldAct(context: CognitionContext): boolean {
    // For now, always act if we have relevant events
    return context.perception.relevantEvents.length > 0;
  }

  /**
   * Generate a summary of the decision for logging.
   */
  static summarizeDecision(result: ActionResult | null): string {
    if (!result) {
      return 'No action needed';
    }

    return `Decided to ${result.intent.type}${result.delayMs ? ` (delay: ${result.delayMs}ms)` : ''}`;
  }
}
