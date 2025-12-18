import type { AccumulatedSensoryContext } from '../../core/types.js';
import type { NpcResponseConfig } from '@minimal-rpg/schemas';
import type { NumberRange } from './types.js';

/**
 * Count how many sensory detail items are available across all completed actions.
 */
export function countSensoryDetails(context?: AccumulatedSensoryContext): number {
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
 * Compute the sentence count range for a response given the number of actions.
 */
export function getSentenceRange(
  actionCount: number,
  responseConfig: NpcResponseConfig
): NumberRange {
  return {
    min: actionCount * responseConfig.minSentencesPerAction,
    max: actionCount * responseConfig.maxSentencesPerAction,
  };
}
