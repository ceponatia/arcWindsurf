import type { AgentInput, CharacterSlice, KnowledgeContextItem } from '../../core/types.js';
import type { SensoryContext, SensoryIntentType, SensoryTargetType } from '../types.js';
import {
  type BodyRegion,
  DEFAULT_BODY_REGION,
  resolveBodyRegion,
  ALL_HYGIENE_MODIFIERS,
  type HygieneSensoryModifiers,
} from '@minimal-rpg/schemas';

/**
 * Component responsible for extracting sensory data from character profiles and knowledge context.
 */
export class SensoryDataCollector {
  constructor(private readonly defaultBodyRegion: BodyRegion = DEFAULT_BODY_REGION) {}

  /**
   * Resolve a raw body part reference to a canonical body region.
   */
  resolveBodyPart(rawBodyPart: string | undefined): BodyRegion {
    return resolveBodyRegion(rawBodyPart, this.defaultBodyRegion);
  }

  /**
   * Resolve the target of a sensory intent.
   */
  resolveTarget(
    target: string | undefined,
    npc: CharacterSlice | undefined,
    character: CharacterSlice | undefined
  ): {
    targetType: SensoryTargetType;
    targetName: string | undefined;
    targetCharacter: CharacterSlice | undefined;
  } {
    if (npc && target) {
      const npcName = npc.name.toLowerCase();
      if (target.includes(npcName) || npcName.includes(target)) {
        return { targetType: 'character', targetName: npc.name, targetCharacter: npc };
      }
    }

    if (npc) {
      return { targetType: 'character', targetName: npc.name, targetCharacter: npc };
    }

    if (target && character) {
      const charName = character.name.toLowerCase();
      if (
        target === 'self' ||
        target === 'myself' ||
        target.includes(charName) ||
        charName.includes(target)
      ) {
        return { targetType: 'character', targetName: character.name, targetCharacter: character };
      }
    }

    return { targetType: 'unknown', targetName: undefined, targetCharacter: undefined };
  }

  extractSmellContext(input: AgentInput): SensoryContext {
    const target = input.intent?.params.target?.toLowerCase();
    const npc = input.stateSlices.npc;
    const character = input.stateSlices.character;

    let rawBodyPart = input.intent?.params.bodyPart;
    if (!rawBodyPart && input.intent?.segments) {
      const smellSegment = input.intent.segments.find(
        (seg) => seg.type === 'sensory' && seg.sensoryType === 'smell'
      );
      if (smellSegment?.bodyPart) {
        rawBodyPart = smellSegment.bodyPart;
      }
    }

    const bodyRegion = this.resolveBodyPart(rawBodyPart);
    const isExplicitBodyPart = rawBodyPart !== undefined && rawBodyPart !== null;

    const { targetType, targetName, targetCharacter } = this.resolveTarget(target, npc, character);

    let sensoryData = this.extractScentFromBodyMap(targetCharacter, bodyRegion);

    if (Object.keys(sensoryData).length === 0) {
      sensoryData = this.extractScentFromKnowledge(input.knowledgeContext, bodyRegion);
    }

    return {
      targetType,
      targetName,
      bodyRegion,
      rawBodyPart,
      sensoryData,
      hasSensoryData: Object.keys(sensoryData).length > 0,
      isExplicitBodyPart,
    };
  }

  extractTouchContext(input: AgentInput): SensoryContext {
    const target = input.intent?.params?.target?.toLowerCase();
    const npc = input.stateSlices.npc;
    const character = input.stateSlices.character;

    let rawBodyPart = input.intent?.params?.bodyPart;
    if (!rawBodyPart && input.intent?.segments) {
      const touchSegment = input.intent.segments.find(
        (seg) => seg.type === 'sensory' && seg.sensoryType === 'touch'
      );
      if (touchSegment?.bodyPart) {
        rawBodyPart = touchSegment.bodyPart;
      }
    }

    const bodyRegion = this.resolveBodyPart(rawBodyPart);
    const isExplicitBodyPart = rawBodyPart !== undefined && rawBodyPart !== null;

    const { targetType, targetName, targetCharacter } = this.resolveTarget(target, npc, character);

    let sensoryData = this.extractTextureFromBodyMap(targetCharacter, bodyRegion);

    if (Object.keys(sensoryData).length === 0) {
      sensoryData = this.extractTextureFromKnowledge(input.knowledgeContext, bodyRegion);
    }

    return {
      targetType,
      targetName,
      bodyRegion,
      rawBodyPart,
      sensoryData,
      hasSensoryData: Object.keys(sensoryData).length > 0,
      isExplicitBodyPart,
    };
  }

  /**
   * Collect all available sensory data for a set of requests.
   */
  collectCharacterSensoryData(
    character: CharacterSlice,
    requests: { type: SensoryIntentType; bodyPart: string | undefined }[]
  ): Record<string, string> {
    const data: Record<string, string> = {};
    const body = character.body;
    const hygiene = character.hygiene;

    // Collect unique body regions from all requests
    const bodyRegions = new Set<BodyRegion>();
    for (const req of requests) {
      bodyRegions.add(this.resolveBodyPart(req.bodyPart));
    }

    // For each body region, collect ALL available sensory data
    for (const bodyRegion of bodyRegions) {
      const regionData = body?.[bodyRegion];

      // Get hygiene modifiers
      const hygieneLevel = hygiene?.bodyParts?.[bodyRegion]?.level ?? 0;
      const hygieneProfile = ALL_HYGIENE_MODIFIERS[bodyRegion];
      // @ts-expect-error - Indexing with number on hygieneProfile
      const hygieneModifiers = hygieneProfile?.[hygieneLevel] as
        | HygieneSensoryModifiers
        | undefined;

      if (!regionData && !hygieneModifiers) continue;

      // Scent data
      const baseScent = regionData?.scent;
      const hygieneScent = hygieneModifiers?.scent;

      if (baseScent || hygieneScent) {
        const primary = hygieneScent?.primary ?? baseScent?.primary;
        if (primary) {
          let scentText = primary;
          const notes = [...(baseScent?.notes ?? []), ...(hygieneScent?.notes ?? [])];
          if (notes.length > 0) {
            scentText += ` with notes of ${notes.join(', ')}`;
          }
          data[`smell_${bodyRegion}`] = scentText;
        }

        const intensity = Math.max(baseScent?.intensity ?? 0, hygieneScent?.intensity ?? 0);
        if (intensity > 0) {
          data[`smell_${bodyRegion}_intensity`] = String(intensity);
        }
      }

      // Texture data
      const baseTexture = regionData?.texture;
      const hygieneTexture = hygieneModifiers?.texture;

      if (baseTexture || hygieneTexture) {
        const primary = hygieneTexture?.primary ?? baseTexture?.primary;
        if (primary) {
          data[`touch_${bodyRegion}`] = primary;
        }

        const temp = hygieneTexture?.temperature ?? baseTexture?.temperature;
        if (temp && temp !== 'neutral') {
          data[`touch_${bodyRegion}_temp`] = temp;
        }

        const moisture = hygieneTexture?.moisture ?? baseTexture?.moisture;
        if (moisture && moisture !== 'normal') {
          data[`touch_${bodyRegion}_moisture`] = moisture;
        }
      }

      // Flavor data (for taste intents)
      const baseFlavor = regionData?.flavor;
      const hygieneFlavor = hygieneModifiers?.flavor;

      if (baseFlavor || hygieneFlavor) {
        const primary = hygieneFlavor?.primary ?? baseFlavor?.primary;
        if (primary) {
          let flavorText = primary;
          const notes = [...(baseFlavor?.notes ?? []), ...(hygieneFlavor?.notes ?? [])];
          if (notes.length > 0) {
            flavorText += ` with notes of ${notes.join(', ')}`;
          }
          data[`taste_${bodyRegion}`] = flavorText;
        }

        const intensity = Math.max(baseFlavor?.intensity ?? 0, hygieneFlavor?.intensity ?? 0);
        if (intensity > 0) {
          data[`taste_${bodyRegion}_intensity`] = String(intensity);
        }
      }

      // Visual data
      const baseVisual = regionData?.visual;
      const hygieneVisual = hygieneModifiers?.visual;

      if (baseVisual || hygieneVisual) {
        let description = baseVisual?.description ?? '';
        if (hygieneVisual?.descriptionAppend) {
          description = description
            ? `${description}, ${hygieneVisual.descriptionAppend}`
            : hygieneVisual.descriptionAppend;
        }

        if (description) {
          data[`visual_${bodyRegion}`] = description;
        }
      }
    }

    return data;
  }

  extractScentFromBodyMap(
    character: CharacterSlice | undefined,
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    if (!character) return {};
    // Reuse collectCharacterSensoryData for consistency
    const data = this.collectCharacterSensoryData(character, [
      { type: 'smell', bodyPart: bodyRegion },
    ]);

    const result: Record<string, string> = {};
    const regionScent = data[`smell_${bodyRegion}`];
    if (regionScent) {
      result[bodyRegion] = regionScent;
    }

    // Fallback to torso/body scent if specific region not found
    if (!result[bodyRegion] && bodyRegion !== 'torso') {
      const torsoData = this.collectCharacterSensoryData(character, [
        { type: 'smell', bodyPart: 'torso' },
      ]);
      const torsoScent = torsoData['smell_torso'];
      if (torsoScent) {
        result['bodyScent'] = torsoScent;
      }
    }

    return result;
  }

  extractScentFromKnowledge(
    knowledgeContext: KnowledgeContextItem[] | undefined,
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!knowledgeContext) {
      return result;
    }

    for (const item of knowledgeContext) {
      const pathLower = item.path.toLowerCase();

      if (pathLower.includes('body') && pathLower.includes('scent')) {
        if (pathLower.includes(bodyRegion)) {
          result[bodyRegion] = item.content;
        }
        if (pathLower.includes('torso') && !result['torso']) {
          result['torso'] = item.content;
        }
        continue;
      }

      if (pathLower.includes('scent') || pathLower.includes('smell')) {
        if (pathLower.includes('hair') && (bodyRegion === 'hair' || bodyRegion === 'head')) {
          result['hairScent'] = item.content;
        } else if (pathLower.includes('body') && bodyRegion === 'torso') {
          result['bodyScent'] = item.content;
        } else if (pathLower.includes('perfume') || pathLower.includes('fragrance')) {
          if (['neck', 'chest', 'torso'].includes(bodyRegion)) {
            result['perfume'] = item.content;
          }
        } else {
          result['scent'] ??= item.content;
        }
      }
    }

    return result;
  }

  extractTextureFromBodyMap(
    character: CharacterSlice | undefined,
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    if (!character) return {};
    // Reuse collectCharacterSensoryData for consistency
    const data = this.collectCharacterSensoryData(character, [
      { type: 'touch', bodyPart: bodyRegion },
    ]);

    const result: Record<string, string> = {};
    const touch = data[`touch_${bodyRegion}`];
    if (touch) {
      const parts: string[] = [touch];
      const temp = data[`touch_${bodyRegion}_temp`];
      if (temp) parts.push(temp);
      const moisture = data[`touch_${bodyRegion}_moisture`];
      if (moisture) parts.push(moisture);
      result[bodyRegion] = parts.join(', ');
    }

    return result;
  }

  extractTextureFromKnowledge(
    knowledgeContext: KnowledgeContextItem[] | undefined,
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!knowledgeContext) {
      return result;
    }

    for (const item of knowledgeContext) {
      const pathLower = item.path.toLowerCase();

      if (pathLower.includes('texture') || pathLower.includes('touch')) {
        if (pathLower.includes(bodyRegion)) {
          result[bodyRegion] = item.content;
        }
      }
    }

    return result;
  }

  extractFlavorFromBodyMap(
    bodyMap: CharacterSlice['body'],
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!bodyMap) {
      return result;
    }

    const regionData = bodyMap[bodyRegion];
    if (regionData?.flavor) {
      const flavor = regionData.flavor;
      const flavorText = flavor.notes?.length
        ? `${flavor.primary} with notes of ${flavor.notes.join(', ')}`
        : flavor.primary;
      result[bodyRegion] = flavorText;
    }

    return result;
  }

  extractFlavorFromKnowledge(
    knowledgeContext: KnowledgeContextItem[] | undefined,
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!knowledgeContext) {
      return result;
    }

    for (const item of knowledgeContext) {
      const pathLower = item.path.toLowerCase();

      if (pathLower.includes('flavor') || pathLower.includes('taste')) {
        if (pathLower.includes(bodyRegion)) {
          result[bodyRegion] = item.content;
        }
      }
    }

    return result;
  }
}
