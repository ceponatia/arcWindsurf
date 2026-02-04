import { type Processor, type Job } from 'bullmq';
import { Effect } from 'effect';
import { WorldBus } from '@minimal-rpg/bus';
import {
  TieredCognitionRouter,
  type LlmCognitionTask,
  type LLMMessage,
} from '@minimal-rpg/llm';
import type { WorldEvent } from '@minimal-rpg/schemas';
import type { JobData, CognitionTask, JobResult } from '../types.js';

/**
 * Creates a processor for NPC cognition (LLM calls).
 */
export const createCognitionProcessor = (
  bus: WorldBus,
  router: TieredCognitionRouter
): Processor<JobData<CognitionTask>, JobResult> => {
  return async (job: Job<JobData<CognitionTask>, JobResult>) => {
    const { payload, sessionId } = job.data;
    const { actorId, context } = payload;

    try {
      // 1. Prepare LLM task
      const llmTask: LlmCognitionTask = {
        type: 'fast',
        messages: [
          {
            role: 'system',
            content: `You are NPC ${actorId}. Context: ${context.memoryContext ?? 'No memory'}.`,
          },
          ...context.lastEvents.map<LLMMessage>((event: WorldEvent) => ({
            role: 'user',
            content: JSON.stringify(event),
          })),
        ],
      };

      // 2. Execute via TieredRouter (using Effect)
      const program = router.execute(llmTask);
      const response = await Effect.runPromise(program);

      if (!response.content) {
        throw new Error('LLM returned empty response');
      }

      // 3. Emit intent back to WorldBus
      const speakIntent: Extract<WorldEvent, { type: 'SPEAK_INTENT' }> = {
        type: 'SPEAK_INTENT',
        actorId,
        content: response.content,
        sessionId,
      };

      await bus.emit(speakIntent);

      return {
        success: true,
        eventsEmitted: 1,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
};
