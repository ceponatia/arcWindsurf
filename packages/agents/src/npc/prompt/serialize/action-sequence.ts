import type { NpcAgentInput } from '../../types.js';
import type { NpcResponseConfig, SensoryDetail } from '@minimal-rpg/schemas';

/**
 * Serialize the multi-action sequence block for enhanced prompts.
 * Returns an empty list when there is no action sequence to render.
 */
export function serializeActionSequence(
  input: NpcAgentInput,
  responseConfig: NpcResponseConfig
): string[] {
  const completed = input.actionSequence?.completedActions;
  if (!completed?.length) return [];

  const lines: string[] = [];
  lines.push('\n--- ACTION SEQUENCE ---');
  lines.push('The player performed these actions in order:');

  for (const action of completed) {
    const sensory = input.accumulatedContext?.perAction.find((p) => p.actionId === action.id);

    lines.push(`\n${action.order}. ✅ ${action.description}`);

    if (sensory?.sensory) {
      const senses = Object.entries(sensory.sensory)
        .filter(([, v]) => v?.length)
        .map(([k, v]) => {
          const details = v as SensoryDetail[];
          return `${k}: ${details.map((s) => s.description).join(', ')}`;
        });
      if (senses.length) {
        lines.push(`   Sensory: ${senses.join('; ')}`);
      }
    }
  }

  if (input.actionSequence?.interruptedAt) {
    lines.push(`\n❌ INTERRUPTED: ${input.actionSequence.interruptedAt.reason}`);
    if (input.actionSequence.interruptedAt.consequence) {
      lines.push(`   Consequence: ${input.actionSequence.interruptedAt.consequence}`);
    }
  }

  if (responseConfig.showPendingActions && input.actionSequence?.pendingActions.length) {
    lines.push('\n⏸️ PENDING (not attempted):');
    for (const action of input.actionSequence.pendingActions) {
      lines.push(`   - ${action.description}`);
    }
  }

  return lines;
}
