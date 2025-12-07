import type {
  AgentIntent,
  IntentParams,
  IntentSegment as AgentIntentSegment,
} from '@minimal-rpg/agents';
import type { DetectedIntent, IntentType, IntentSegment } from '../intents/types.js';

/**
 * Build an AgentIntent from a DetectedIntent using a mapping function
 * from governor-level IntentType to agent-level IntentType.
 */
export function buildAgentIntent(
  detected: DetectedIntent,
  mapType: (type: IntentType) => AgentIntent['type']
): AgentIntent {
  const params = buildIntentParams(detected.params);

  const segments: AgentIntentSegment[] | undefined = detected.segments
    ? detected.segments.map(
        (segment: IntentSegment): AgentIntentSegment => ({
          type: segment.type,
          content: segment.content,
          sensoryType: segment.sensoryType,
          bodyPart: segment.bodyPart,
        })
      )
    : undefined;

  const intent: AgentIntent = {
    type: mapType(detected.type),
    params,
    confidence: detected.confidence,
  };

  if (detected.signals) {
    intent.signals = detected.signals;
  }

  if (segments) {
    intent.segments = segments;
  }

  return intent;
}

function buildIntentParams(source: DetectedIntent['params']): IntentParams {
  if (!source) {
    return {};
  }

  const params: IntentParams = {};

  if (source.target !== undefined) params.target = source.target;
  if (source.npcId !== undefined) params.npcId = source.npcId;
  if (source.direction !== undefined) params.direction = source.direction;
  if (source.item !== undefined) params.item = source.item;
  if (source.bodyPart !== undefined) params.bodyPart = source.bodyPart;
  if (source.action !== undefined) params.action = source.action;
  if (source.narrateType !== undefined) params.narrateType = source.narrateType;
  if (source.extra !== undefined) params.extra = source.extra;

  return params;
}
