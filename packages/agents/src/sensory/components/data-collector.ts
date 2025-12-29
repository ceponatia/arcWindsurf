import type { AgentInput, CharacterSlice, KnowledgeContextItem } from '../../core/types.js';
import type { SensoryContext, SensoryIntentType, SensoryTargetType } from '../types.js';
import { type BodyRegion, DEFAULT_BODY_REGION, resolveBodyRegion } from '@minimal-rpg/schemas';

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
    const target = input.intent?.params?.target?.toLowerCase();
    const npc = input.stateSlices.npc;
    const character = input.stateSlices.character;

    let rawBodyPart = input.intent?.params?.bodyPart;
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

    let sensoryData = this.extractScentFromBodyMap(targetCharacter?.body, bodyRegion);

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

    let sensoryData = this.extractTextureFromBodyMap(targetCharacter?.body, bodyRegion);

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

    // Collect unique body regions from all requests
    const bodyRegions = new Set<BodyRegion>();
    for (const req of requests) {
      bodyRegions.add(this.resolveBodyPart(req.bodyPart));
    }

    // For each body region, collect ALL available sensory data
    for (const bodyRegion of bodyRegions) {
      const regionData = body?.[bodyRegion];
      if (!regionData) continue;

      // Scent data
      if (regionData.scent?.primary) {
        data[`smell_${bodyRegion}`] = regionData.scent.primary;
      }
      if (regionData.scent?.intensity !== undefined) {
        data[`smell_${bodyRegion}_intensity`] = String(regionData.scent.intensity);
      }
      if (regionData.scent?.notes?.length) {
        data[`smell_${bodyRegion}_notes`] = regionData.scent.notes.join(', ');
      }

      // Texture data
      if (regionData.texture?.primary) {
        data[`touch_${bodyRegion}`] = regionData.texture.primary;
      }
      if (regionData.texture?.temperature && regionData.texture.temperature !== 'neutral') {
        data[`touch_${bodyRegion}_temp`] = regionData.texture.temperature;
      }
      if (regionData.texture?.moisture && regionData.texture.moisture !== 'normal') {
        data[`touch_${bodyRegion}_moisture`] = regionData.texture.moisture;
      }

      // Flavor data (for taste intents)
      if (regionData.flavor?.primary) {
        data[`taste_${bodyRegion}`] = regionData.flavor.primary;
      }
      if (regionData.flavor?.intensity !== undefined) {
        data[`taste_${bodyRegion}_intensity`] = String(regionData.flavor.intensity);
      }
      if (regionData.flavor?.notes?.length) {
        data[`taste_${bodyRegion}_notes`] = regionData.flavor.notes.join(', ');
      }

      // Visual data
      if (regionData.visual?.description) {
        data[`visual_${bodyRegion}`] = regionData.visual.description;
      }
    }

    return data;
  }

  extractScentFromBodyMap(
    bodyMap: CharacterSlice['body'],
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!bodyMap) {
      return result;
    }

    const regionData = bodyMap[bodyRegion];
    if (regionData?.scent) {
      const scent = regionData.scent;
      const scentText = scent.notes?.length
        ? `${scent.primary} with notes of ${scent.notes.join(', ')}`
        : scent.primary;
      result[bodyRegion] = scentText;
    }

    if (!result[bodyRegion] && bodyRegion !== 'torso') {
      const torsoData = bodyMap.torso;
      if (torsoData?.scent) {
        const scent = torsoData.scent;
        result['bodyScent'] = scent.notes?.length
          ? `${scent.primary} with notes of ${scent.notes.join(', ')}`
          : scent.primary;
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
    bodyMap: CharacterSlice['body'],
    bodyRegion: BodyRegion = this.defaultBodyRegion
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!bodyMap) {
      return result;
    }

    const regionData = bodyMap[bodyRegion];
    if (regionData?.texture) {
      const texture = regionData.texture;
      const parts: string[] = [texture.primary];

      if (texture.temperature && texture.temperature !== 'neutral') {
        parts.push(texture.temperature);
      }
      if (texture.moisture && texture.moisture !== 'normal') {
        parts.push(texture.moisture);
      }
      if (texture.notes?.length) {
        parts.push(...texture.notes);
      }

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
