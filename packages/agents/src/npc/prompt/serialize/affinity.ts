import type { AgentInput } from '../../../core/types.js';
import { formatAffinityPrompt } from '@minimal-rpg/schemas';
import { extractAffinityContext, getDispositionGuidance } from '../../affinity.js';

/**
 * Serialize relationship/affinity information into prompt text.
 */
export function serializeAffinity(input: AgentInput): string[] {
  const affinityContext = extractAffinityContext(input);
  if (!affinityContext) return [];

  const lines: string[] = [];
  lines.push('\n--- RELATIONSHIP WITH PLAYER ---');
  lines.push(formatAffinityPrompt(affinityContext));

  const disposition = affinityContext.relationship;
  lines.push(`Disposition: ${disposition}`);
  lines.push(`Disposition guidance: ${getDispositionGuidance(disposition)}`);

  return lines;
}
