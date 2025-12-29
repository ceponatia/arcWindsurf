import type { AgentInput, AgentOutput } from '../../core/types.js';
import type { SensoryContextForNpc, SensoryDetail } from '@minimal-rpg/schemas';
import type { SensoryDataCollector } from './data-collector.js';

/**
 * Component responsible for building structured sensory context for NPC agents.
 */
export class SensoryContextBuilder {
  constructor(private readonly collector: SensoryDataCollector) {}

  buildStructuredSensoryContext(
    input: AgentInput,
    segments: NonNullable<AgentInput['intent']>['segments']
  ): AgentOutput {
    if (!segments || segments.length === 0) {
      return this.createIgnoreResponse('No sensory segments to process');
    }

    // Get target character
    const npc = input.stateSlices.npc;
    const character = input.stateSlices.character;
    const targetCharacter = npc ?? character;

    if (!targetCharacter) {
      return this.createIgnoreResponse('No character target for sensory input');
    }

    const sensoryContext: SensoryContextForNpc = {
      available: {},
      narrativeHints: {
        playerIsSniffing: false,
        playerIsTouching: false,
        playerIsTasting: false,
        recentSensoryAction: false,
      },
    };

    // Collect sensory details from character profile
    const smellDetails: SensoryDetail[] = [];
    const touchDetails: SensoryDetail[] = [];
    const tasteDetails: SensoryDetail[] = [];
    const soundDetails: SensoryDetail[] = [];
    const sightDetails: SensoryDetail[] = [];

    for (const seg of segments) {
      if (seg.type !== 'sensory' || !seg.sensoryType) continue;

      const bodyRegion = this.collector.resolveBodyPart(seg.bodyPart);
      const regionData = targetCharacter.body?.[bodyRegion];

      if (!regionData) continue;

      // Determine which sense and collect data
      switch (seg.sensoryType) {
        case 'smell':
          sensoryContext.narrativeHints.playerIsSniffing = true;
          if (regionData.scent) {
            const description = regionData.scent.notes?.length
              ? `${regionData.scent.primary} with notes of ${regionData.scent.notes.join(', ')}`
              : regionData.scent.primary;
            smellDetails.push({
              source: `${targetCharacter.name}'s ${this.getRegionLabel(bodyRegion)}`,
              bodyPart: this.getRegionLabel(bodyRegion),
              description,
              intensity: regionData.scent.intensity ?? 0.5,
            });
          }
          break;

        case 'touch':
          sensoryContext.narrativeHints.playerIsTouching = true;
          if (regionData.texture) {
            const parts: string[] = [regionData.texture.primary];
            if (regionData.texture.temperature && regionData.texture.temperature !== 'neutral') {
              parts.push(regionData.texture.temperature);
            }
            if (regionData.texture.moisture && regionData.texture.moisture !== 'normal') {
              parts.push(regionData.texture.moisture);
            }
            if (regionData.texture.notes?.length) {
              parts.push(...regionData.texture.notes);
            }
            touchDetails.push({
              source: `${targetCharacter.name}'s ${this.getRegionLabel(bodyRegion)}`,
              bodyPart: this.getRegionLabel(bodyRegion),
              description: parts.join(', '),
              intensity: 0.7,
            });
          }
          break;

        case 'taste':
          sensoryContext.narrativeHints.playerIsTasting = true;
          if (regionData.flavor) {
            const description = regionData.flavor.notes?.length
              ? `${regionData.flavor.primary} with notes of ${regionData.flavor.notes.join(', ')}`
              : regionData.flavor.primary;
            tasteDetails.push({
              source: `${targetCharacter.name}'s ${this.getRegionLabel(bodyRegion)}`,
              bodyPart: this.getRegionLabel(bodyRegion),
              description,
              intensity: regionData.flavor.intensity ?? 0.5,
            });
          }
          break;

        case 'listen':
          // TBD: Implement sound data when available
          break;
      }
    }

    // Populate available sensory data
    if (smellDetails.length) sensoryContext.available.smell = smellDetails;
    if (touchDetails.length) sensoryContext.available.touch = touchDetails;
    if (tasteDetails.length) sensoryContext.available.taste = tasteDetails;
    if (soundDetails.length) sensoryContext.available.sound = soundDetails;
    if (sightDetails.length) sensoryContext.available.sight = sightDetails;

    // Determine player focus (what they're primarily trying to sense)
    if (segments.length > 0 && segments[0]?.sensoryType) {
      sensoryContext.playerFocus = {
        sense: segments[0].sensoryType as 'smell' | 'touch' | 'taste' | 'sound' | 'sight',
        target: targetCharacter.name,
        bodyPart: segments[0].bodyPart,
      };
    }

    sensoryContext.narrativeHints.recentSensoryAction =
      sensoryContext.narrativeHints.playerIsSniffing ||
      sensoryContext.narrativeHints.playerIsTouching ||
      sensoryContext.narrativeHints.playerIsTasting;

    // Return structured context with empty narrative
    return {
      narrative: '', // Empty - NPC agent writes prose
      sensoryContext,
      diagnostics: {
        debug: {
          targetName: targetCharacter.name,
          sensoryDetailsCount: {
            smell: smellDetails.length,
            touch: touchDetails.length,
            taste: tasteDetails.length,
            sound: soundDetails.length,
            sight: sightDetails.length,
          },
          source: 'structured-data',
        },
      },
    };
  }

  private getRegionLabel(region: string): string {
    if (region === 'torso') {
      return 'body';
    }

    return region
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .trim()
      .toLowerCase();
  }

  private createIgnoreResponse(reason: string, debugData?: Record<string, unknown>): AgentOutput {
    return {
      narrative: '',
      diagnostics: {
        warnings: [`SensoryService ignored intent: ${reason}`],
        debug: { ignored: true, reason, ...debugData },
      },
    };
  }
}
