import { BaseAgent } from '../base.js';
import type {
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  CharacterSlice,
  KnowledgeContextItem,
} from '../types.js';
import type {
  SensoryAgentConfig,
  SensoryContext,
  SensoryIntentType,
  SensoryTargetType,
} from './types.js';
import { isSensoryIntent, SENSORY_INTENT_TYPES } from './types.js';
import type { BodyRegion } from './types.js';
import {
  resolveBodyRegion,
  DEFAULT_BODY_REGION,
  BODY_REGIONS,
  isBodyReference,
} from '@minimal-rpg/schemas';

/**
 * Agent responsible for handling sensory intents (smell, taste, touch, listen).
 *
 * Currently implements:
 * - smell: Uses character scent data from BodyMap or legacy ScentSchema
 *
 * TBD (no data source yet):
 * - taste: Would require item/consumable taste data
 * - touch: Would require texture/temperature data on items/characters
 * - listen: Would require ambient sound data on locations
 *
 * ## Body Region Resolution
 *
 * When a player says "I smell her hair", the agent:
 * 1. Receives `bodyPart: "hair"` from intent detection
 * 2. Resolves it to canonical region `hair` using `resolveBodyRegion()`
 * 3. Looks for scent data in `body.hair.scent` or falls back to `body.torso.scent`
 *
 * When no body part is specified ("I smell her"), defaults to `torso` (general body).
 *
 * ## Design Principles
 *
 * - Never say "you don't notice anything" - either provide immersive content or ignore
 * - If explicit sensory data exists, use it
 * - If no data but LLM can infer with high confidence, allow inference
 * - Otherwise, silently return no output (intent is ignored)
 *
 * @see {@link SensoryAgentConfig} for configuration options
 * @see {@link https://minimal-rpg/dev-docs/19-body-map-and-sensory-system.md} for architecture
 */
export class SensoryAgent extends BaseAgent {
  public readonly agentType: AgentType = 'sensory';
  public readonly name = 'Sensory Agent';

  /** Intent types this agent can handle */
  public static readonly HANDLED_INTENTS: readonly SensoryIntentType[] = SENSORY_INTENT_TYPES;

  /** All supported body regions */
  public static readonly SUPPORTED_BODY_REGIONS: readonly BodyRegion[] = BODY_REGIONS;

  private readonly inferenceThreshold: number;
  private readonly allowInference: boolean;
  private readonly defaultBodyRegion: BodyRegion;
  private readonly includeBodyRegionInPrompts: boolean;

  constructor(config: SensoryAgentConfig = {}) {
    super(config);
    this.inferenceThreshold = config.inferenceThreshold ?? 0.8;
    this.allowInference = config.allowInference ?? true;
    this.defaultBodyRegion = config.defaultBodyRegion ?? DEFAULT_BODY_REGION;
    this.includeBodyRegionInPrompts = config.includeBodyRegionInPrompts ?? true;
  }

  /**
   * Check if this agent can handle the given intent.
   * Handles both primary sensory intents and compound intents with sensory segments.
   */
  canHandle(intent: AgentIntent): boolean {
    // Primary sensory intent
    if (isSensoryIntent(intent.type)) {
      return true;
    }

    // Check for sensory segments in compound intents
    if (intent.segments) {
      return intent.segments.some(
        (seg) => seg.type === 'sensory' && seg.sensoryType && isSensoryIntent(seg.sensoryType)
      );
    }

    return false;
  }

  /**
   * Get the default body region used when none is specified.
   */
  getDefaultBodyRegion(): BodyRegion {
    return this.defaultBodyRegion;
  }

  /**
   * Resolve a raw body part reference to a canonical body region.
   * Exposed for testing and external use.
   */
  resolveBodyPart(rawBodyPart: string | undefined): BodyRegion {
    return resolveBodyRegion(rawBodyPart, this.defaultBodyRegion);
  }

  /**
   * Check if a string is a valid body reference (region or alias).
   */
  isValidBodyReference(value: string): boolean {
    return isBodyReference(value);
  }

  protected async process(input: AgentInput): Promise<AgentOutput> {
    const intentType = input.intent?.type;

    // For compound intents, check segments for sensory content
    const sensorySegments = input.intent?.segments?.filter(
      (seg) => seg.type === 'sensory' && seg.sensoryType
    );

    // If we have multiple sensory segments, batch them into one LLM call
    if (sensorySegments && sensorySegments.length > 0) {
      return this.handleCombinedSensory(input, sensorySegments);
    }

    // Handle single primary sensory intent
    if (intentType && isSensoryIntent(intentType)) {
      return this.handleSensoryIntent(intentType, input);
    }

    // No sensory intent found
    return this.createIgnoreResponse('Invalid intent type for SensoryAgent');
  }

  /**
   * Handle multiple sensory intents in a single LLM call.
   * More efficient and produces cohesive descriptions.
   */
  private async handleCombinedSensory(
    input: AgentInput,
    segments: NonNullable<AgentInput['intent']>['segments']
  ): Promise<AgentOutput> {
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

    // Collect all sensory types and body parts requested
    const sensoryRequests: Array<{
      type: SensoryIntentType;
      bodyPart: string | undefined;
      content: string;
    }> = [];

    for (const seg of segments) {
      if (seg.type === 'sensory' && seg.sensoryType && isSensoryIntent(seg.sensoryType)) {
        sensoryRequests.push({
          type: seg.sensoryType,
          bodyPart: seg.bodyPart,
          content: seg.content,
        });
      }
    }

    if (sensoryRequests.length === 0) {
      return this.createIgnoreResponse('No valid sensory requests in segments');
    }

    // Collect available sensory data from character profile
    const availableData = this.collectCharacterSensoryData(targetCharacter, sensoryRequests);

    // If no LLM, try template-based response
    if (!this.llmProvider) {
      if (Object.keys(availableData).length === 0) {
        return this.createIgnoreResponse('No sensory data and no LLM available');
      }
      return this.generateTemplateSensoryResponse(targetCharacter.name, availableData);
    }

    // Generate combined sensory description with LLM
    return this.generateCombinedSensoryNarrative(
      input,
      targetCharacter,
      sensoryRequests,
      availableData
    );
  }

  /**
   * Collect all relevant sensory data from character profile for the requested senses.
   */
  private collectCharacterSensoryData(
    character: CharacterSlice,
    requests: Array<{ type: SensoryIntentType; bodyPart: string | undefined }>
  ): Record<string, string> {
    const data: Record<string, string> = {};
    const body = character.body;

    for (const req of requests) {
      const bodyRegion = this.resolveBodyPart(req.bodyPart);

      if (req.type === 'smell') {
        // Check body map for region-specific scent
        const regionData = body?.[bodyRegion];
        if (regionData?.scent?.primary) {
          data[`smell_${bodyRegion}`] = regionData.scent.primary;
        }
        if (regionData?.scent?.intensity !== undefined) {
          data[`smell_${bodyRegion}_intensity`] = String(regionData.scent.intensity);
        }
        if (regionData?.scent?.notes?.length) {
          data[`smell_${bodyRegion}_notes`] = regionData.scent.notes.join(', ');
        }
        // Also check legacy scent schema
        if (character.scent) {
          if (character.scent.hairScent) data['smell_hair'] = character.scent.hairScent;
          if (character.scent.bodyScent) data['smell_body'] = character.scent.bodyScent;
          if (character.scent.perfume) data['smell_perfume'] = character.scent.perfume;
        }
      }

      if (req.type === 'touch') {
        // Check body map for region-specific texture
        const regionData = body?.[bodyRegion];
        if (regionData?.texture?.primary) {
          data[`touch_${bodyRegion}`] = regionData.texture.primary;
        }
        if (regionData?.texture?.temperature) {
          data[`touch_${bodyRegion}_temp`] = regionData.texture.temperature;
        }
        if (regionData?.texture?.moisture) {
          data[`touch_${bodyRegion}_moisture`] = regionData.texture.moisture;
        }
      }

      // Taste and listen TBD - no data sources yet
    }

    return data;
  }

  /**
   * Generate a template-based response when no LLM is available.
   */
  private generateTemplateSensoryResponse(
    targetName: string,
    data: Record<string, string>
  ): AgentOutput {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('smell_') && !key.includes('_intensity')) {
        parts.push(`${targetName} has ${value}.`);
      }
      if (key.startsWith('touch_') && !key.includes('_temp')) {
        parts.push(`${targetName}'s skin feels ${value}.`);
      }
    }

    if (parts.length === 0) {
      return this.createIgnoreResponse('No sensory data to template');
    }

    return {
      narrative: parts.join(' '),
      diagnostics: { debug: { source: 'template', data } },
    };
  }

  /**
   * Generate combined sensory narrative using LLM.
   * Single call handles all requested senses for the character.
   */
  private async generateCombinedSensoryNarrative(
    input: AgentInput,
    character: CharacterSlice,
    requests: Array<{ type: SensoryIntentType; bodyPart: string | undefined; content: string }>,
    availableData: Record<string, string>
  ): Promise<AgentOutput> {
    // Build list of what senses to describe
    const sensesList = requests
      .map((r) => {
        const region = r.bodyPart ? this.getRegionLabel(this.resolveBodyPart(r.bodyPart)) : '';
        return region ? `${r.type} (${region})` : r.type;
      })
      .join(', ');

    // Build data context
    const dataLines = Object.entries(availableData)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const systemPrompt = `Generate a brief sensory description for a narrative RPG.
Target NPC: ${character.name}
Requested senses: ${sensesList}

${dataLines ? `Available sensory data:\n${dataLines}` : 'No explicit sensory data - infer from context.'}

NPC info:
- Physique: ${typeof character.physique === 'string' ? character.physique : 'N/A'}

CRITICAL POV RULES:
- "You" refers to the PLAYER who is experiencing the sensation
- The NPC (${character.name}) is the TARGET being sensed/touched
- Describe what the PLAYER feels/smells/etc when interacting with the NPC
- Example: If player grabs NPC's wrists → "You feel her slender wrists in your grip" (NOT "his hands on your wrists")
- Use "your" for the player's body parts, "her/his" for the NPC's body parts

Rules:
- Describe ALL requested senses in 1-3 sentences total
- Be evocative and immersive
- Use the provided data when available
- Infer naturally when data is missing`;

    const userPrompt = `Player action: "${input.playerInput}"`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.5,
        maxTokens: 150,
      });

      return {
        narrative: response.text.trim(),
        diagnostics: {
          debug: {
            targetName: character.name,
            source: 'llm-combined',
            sensesRequested: requests.map((r) => r.type),
            contextParts: Object.keys(availableData).length,
          },
          tokenUsage: response.usage,
        },
      };
    } catch (error) {
      console.error('[SensoryAgent] Combined LLM generation failed:', error);
      return this.createIgnoreResponse('LLM generation failed');
    }
  }

  /**
   * Handle a specific sensory intent type.
   */
  private async handleSensoryIntent(
    intentType: SensoryIntentType,
    input: AgentInput
  ): Promise<AgentOutput> {
    switch (intentType) {
      case 'smell':
        return this.handleSmell(input);
      case 'touch':
        return this.handleTouch(input);
      case 'taste':
        return this.createIgnoreResponse('Taste intent TBD - no data source implemented');
      case 'listen':
        return this.createIgnoreResponse('Listen intent TBD - no data source implemented');
    }
  }

  /**
   * Handle smell intent for characters.
   * Uses scent data from character profile (ScentSchema).
   */
  private async handleSmell(input: AgentInput): Promise<AgentOutput> {
    const context = this.extractSmellContext(input);

    // If targeting non-character, ignore for now
    // TBD: Implement item/location smell when data sources exist
    if (context.targetType !== 'character') {
      return this.createIgnoreResponse(
        `Smell intent for ${context.targetType} TBD - only character scent implemented`,
        { context, inputSlices: this.summarizeInputSlices(input) }
      );
    }

    // If no scent data and no LLM, ignore
    if (!context.hasSensoryData && !this.llmProvider) {
      return this.createIgnoreResponse('No scent data available and no LLM for inference', {
        context,
        inputSlices: this.summarizeInputSlices(input),
      });
    }

    // If we have explicit scent data, generate narrative
    if (context.hasSensoryData) {
      return this.generateSmellNarrative(input, context);
    }

    // No explicit data - try LLM inference if allowed
    if (this.allowInference && this.llmProvider) {
      return this.inferSmellFromContext(input, context);
    }

    // No data and inference not allowed - ignore
    return this.createIgnoreResponse('No scent data and inference disabled', {
      context,
      inputSlices: this.summarizeInputSlices(input),
    });
  }

  /**
   * Summarize input slices for debug output.
   */
  private summarizeInputSlices(input: AgentInput): Record<string, unknown> {
    const npc = input.stateSlices.npc;
    const character = input.stateSlices.character;
    return {
      npc: npc
        ? {
            name: npc.name,
            hasBody: !!npc.body,
            bodyRegions: npc.body ? Object.keys(npc.body) : [],
            bodyData: npc.body,
          }
        : null,
      character: character
        ? {
            name: character.name,
            hasBody: !!character.body,
            bodyRegions: character.body ? Object.keys(character.body) : [],
          }
        : null,
      knowledgeContextCount: input.knowledgeContext?.length ?? 0,
    };
  }

  /**
   * Extract smell-relevant context from input state slices.
   */
  private extractSmellContext(input: AgentInput): SensoryContext {
    const target = input.intent?.params?.target?.toLowerCase();
    const npc = input.stateSlices.npc;
    const character = input.stateSlices.character;

    // Extract body part from intent params OR from compound intent segments
    // For compound intents, the bodyPart is on the sensory segment, not the top-level params
    let rawBodyPart = input.intent?.params?.bodyPart;
    if (!rawBodyPart && input.intent?.segments) {
      // Find the smell-related segment and get its bodyPart
      const smellSegment = input.intent.segments.find(
        (seg) => seg.type === 'sensory' && seg.sensoryType === 'smell'
      );
      if (smellSegment?.bodyPart) {
        rawBodyPart = smellSegment.bodyPart;
      }
    }

    // Resolve body part to canonical region
    const bodyRegion = this.resolveBodyPart(rawBodyPart);
    const isExplicitBodyPart = rawBodyPart !== undefined && rawBodyPart !== null;

    // Determine target
    const { targetType, targetName, targetCharacter } = this.resolveTarget(target, npc, character);

    // Debug: log what we're working with
    console.log('[SensoryAgent] extractSmellContext:', {
      target,
      rawBodyPart,
      bodyRegion,
      hasNpc: !!npc,
      npcName: npc?.name,
      hasNpcBody: !!npc?.body,
      npcBodyKeys: npc?.body ? Object.keys(npc.body) : [],
      targetCharacterName: targetCharacter?.name,
      hasTargetBody: !!targetCharacter?.body,
      targetBodyKeys: targetCharacter?.body ? Object.keys(targetCharacter.body) : [],
    });

    // First try to extract scent from target character's body map (direct access)
    let sensoryData = this.extractScentFromBodyMap(targetCharacter?.body, bodyRegion);

    // Fall back to knowledge context if no body map data
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

  /**
   * Resolve the target entity from player input.
   */
  private resolveTarget(
    target: string | undefined,
    npc: CharacterSlice | undefined,
    character: CharacterSlice | undefined
  ): {
    targetType: SensoryTargetType;
    targetName: string | undefined;
    targetCharacter: CharacterSlice | undefined;
  } {
    // Check if targeting a specific NPC
    if (npc && target) {
      const npcName = npc.name.toLowerCase();
      if (target.includes(npcName) || npcName.includes(target)) {
        return { targetType: 'character', targetName: npc.name, targetCharacter: npc };
      }
    }

    // If no NPC match but we have an NPC slice, assume it's the target
    if (npc) {
      return { targetType: 'character', targetName: npc.name, targetCharacter: npc };
    }

    // Fallback to player character if examining self
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

  /**
   * Extract scent data from a character's body map.
   * Uses the new BodyMap schema with per-region scent data.
   */
  private extractScentFromBodyMap(
    bodyMap: CharacterSlice['body'],
    bodyRegion: BodyRegion = DEFAULT_BODY_REGION
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!bodyMap) {
      return result;
    }

    // Try to get scent for the specific region
    const regionData = bodyMap[bodyRegion];
    if (regionData?.scent) {
      const scent = regionData.scent;
      const scentText = scent.notes?.length
        ? `${scent.primary} with notes of ${scent.notes.join(', ')}`
        : scent.primary;
      result[bodyRegion] = scentText;
    }

    // Fallback to torso for general body scent if no specific region scent
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

  /**
   * Extract scent-related data from knowledge context.
   * Looks for paths like 'body.hair.scent', 'body.torso.scent', 'scent.hairScent' (legacy).
   * Filters by body region when specified.
   */
  private extractScentFromKnowledge(
    knowledgeContext: KnowledgeContextItem[] | undefined,
    bodyRegion: BodyRegion = DEFAULT_BODY_REGION
  ): Record<string, string> {
    const result: Record<string, string> = {};

    if (!knowledgeContext) {
      return result;
    }

    for (const item of knowledgeContext) {
      const pathLower = item.path.toLowerCase();

      // New body map format: 'body.{region}.scent' or 'bodyMap.{region}.scent'
      if (pathLower.includes('body') && pathLower.includes('scent')) {
        // Check if this matches the target body region
        if (pathLower.includes(bodyRegion)) {
          result[bodyRegion] = item.content;
        }
        // Also capture general body scent as fallback
        if (pathLower.includes('torso') && !result['torso']) {
          result['torso'] = item.content;
        }
        continue;
      }

      // Legacy scent schema format: 'scent.hairScent', 'scent.bodyScent', etc.
      if (pathLower.includes('scent') || pathLower.includes('smell')) {
        // Determine what type of scent this is and if it matches target region
        if (pathLower.includes('hair') && (bodyRegion === 'hair' || bodyRegion === 'head')) {
          result['hairScent'] = item.content;
        } else if (pathLower.includes('body') && bodyRegion === 'torso') {
          result['bodyScent'] = item.content;
        } else if (pathLower.includes('perfume') || pathLower.includes('fragrance')) {
          // Perfume is usually on neck/chest - match if targeting those regions
          if (['neck', 'chest', 'torso'].includes(bodyRegion)) {
            result['perfume'] = item.content;
          }
        } else {
          // Generic scent - use as fallback
          result['scent'] ??= item.content;
        }
      }
    }

    return result;
  }

  /**
   * Generate a narrative response when we have explicit scent data.
   */
  private async generateSmellNarrative(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;

    // If we have an LLM, use it to generate a natural narrative
    if (this.llmProvider) {
      return this.generateLlmSmellNarrative(input, context);
    }

    // Template-based fallback
    const parts: string[] = [];
    const regionLabel = isExplicitBodyPart ? this.getRegionLabel(bodyRegion) : '';

    if (sensoryData['perfume']) {
      parts.push(`${targetName} wears ${sensoryData['perfume']}.`);
    }

    if (sensoryData['hairScent']) {
      parts.push(`${targetName}'s hair carries ${sensoryData['hairScent']}.`);
    }

    if (sensoryData['bodyScent']) {
      parts.push(`You catch ${sensoryData['bodyScent']}.`);
    }

    if (sensoryData[bodyRegion]) {
      const prefix = regionLabel ? `From ${targetName}'s ${regionLabel}, you` : 'You';
      parts.push(`${prefix} detect ${sensoryData[bodyRegion]}.`);
    }

    if (sensoryData['scent']) {
      parts.push(sensoryData['scent']);
    }

    if (parts.length === 0) {
      // Should not happen since hasSensoryData was true, but be safe
      return this.createIgnoreResponse('Unexpected empty sensory data');
    }

    return {
      narrative: parts.join(' '),
      diagnostics: {
        debug: {
          sensoryData,
          targetName,
          bodyRegion,
          isExplicitBodyPart,
          source: 'template',
        },
      },
    };
  }

  /**
   * Get a human-readable label for a body region.
   */
  private getRegionLabel(region: BodyRegion): string {
    const labels: Record<BodyRegion, string> = {
      head: 'head',
      face: 'face',
      hair: 'hair',
      neck: 'neck',
      shoulders: 'shoulders',
      torso: 'body',
      chest: 'chest',
      back: 'back',
      arms: 'arms',
      hands: 'hands',
      waist: 'waist',
      hips: 'hips',
      legs: 'legs',
      feet: 'feet',
    };
    return labels[region] ?? region;
  }

  /**
   * Generate smell narrative using LLM.
   */
  private async generateLlmSmellNarrative(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;

    const systemPrompt = this.buildSmellSystemPrompt(
      targetName,
      sensoryData,
      bodyRegion,
      isExplicitBodyPart
    );
    const userPrompt = `The player says: "${input.playerInput}"\n\nDescribe what they smell using ONLY the scent data provided. Keep it to 1-2 sentences.`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.4, // Lower temperature for more faithful output
        maxTokens: this.config.maxTokens ?? 100,
      });

      return {
        narrative: response.text.trim(),
        diagnostics: {
          tokenUsage: response.usage,
          debug: {
            sensoryData,
            targetName,
            bodyRegion,
            isExplicitBodyPart,
            source: 'llm',
          },
        },
      };
    } catch {
      // LLM failed, fall back to template
      return this.generateSmellNarrative(
        { ...input, stateSlices: { ...input.stateSlices } },
        context
      );
    }
  }

  /**
   * Attempt to infer smell from general context when no explicit scent data exists.
   * Only used when allowInference is true and we have an LLM.
   */
  private async inferSmellFromContext(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, bodyRegion, isExplicitBodyPart } = context;

    // Build context from available information
    const contextParts: string[] = [];

    // Add character info if available
    const character = input.stateSlices.npc ?? input.stateSlices.character;
    if (character) {
      contextParts.push(`Character: ${character.name}`);
      if (character.personality) {
        const traits = Array.isArray(character.personality)
          ? character.personality.join(', ')
          : character.personality;
        contextParts.push(`Personality: ${traits}`);
      }
    }

    // Add any other knowledge context
    if (input.knowledgeContext?.length) {
      const relevantContext = input.knowledgeContext
        .filter((k) => k.score > 0.5)
        .slice(0, 3)
        .map((k) => k.content);
      if (relevantContext.length) {
        contextParts.push(`Context: ${relevantContext.join(' ')}`);
      }
    }

    if (contextParts.length === 0) {
      // Not enough context to infer
      return this.createIgnoreResponse('Insufficient context for smell inference');
    }

    const bodyRegionNote =
      this.includeBodyRegionInPrompts && isExplicitBodyPart
        ? `\nThe player is specifically trying to smell their ${this.getRegionLabel(bodyRegion)}.`
        : '';

    const systemPrompt = `You are generating immersive sensory descriptions for a narrative RPG.
The player is trying to smell ${targetName ?? 'something'}.${bodyRegionNote}
You do NOT have explicit scent data, but you may be able to infer a likely scent based on the context provided.

CRITICAL POV RULES:
- "You" refers to the PLAYER who is experiencing the sensation
- ${targetName ?? 'The NPC'} is the TARGET being smelled
- Describe what the PLAYER smells from the NPC
- Example: "You catch her perfume" NOT "his nose detects your scent"
- Use "your" for player body parts, "her/his" for NPC body parts

Guidelines:
- Only generate a response if you can make a reasonable, grounded inference
- Base your inference on the character's description, setting, or other context
- Keep the response to 1-2 sentences
- Be evocative and immersive
- If you cannot make a confident inference, respond with exactly: [NO_INFERENCE]

Available context:
${contextParts.join('\n')}`;

    const userPrompt = `Player: "${input.playerInput}"\n\nWhat does the player smell?`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.6, // Lower temperature for more grounded inferences
        maxTokens: 100,
      });

      const text = response.text.trim();

      // Check if LLM declined to infer
      if (text.includes('[NO_INFERENCE]') || text.length < 10) {
        return this.createIgnoreResponse('LLM could not infer scent from context');
      }

      return {
        narrative: text,
        diagnostics: {
          tokenUsage: response.usage,
          debug: { targetName, source: 'llm-inference', contextParts: contextParts.length },
        },
      };
    } catch {
      return this.createIgnoreResponse('LLM inference failed');
    }
  }

  // ============================================================================
  // Touch Intent Handling
  // ============================================================================

  /**
   * Handle touch intent for characters.
   * Uses texture data from character profile body map.
   */
  private async handleTouch(input: AgentInput): Promise<AgentOutput> {
    const context = this.extractTouchContext(input);

    // If targeting non-character, ignore for now
    if (context.targetType !== 'character') {
      return this.createIgnoreResponse(
        `Touch intent for ${context.targetType} TBD - only character texture implemented`,
        { context, inputSlices: this.summarizeInputSlices(input) }
      );
    }

    // If no texture data and no LLM, ignore
    if (!context.hasSensoryData && !this.llmProvider) {
      return this.createIgnoreResponse('No texture data available and no LLM for inference', {
        context,
        inputSlices: this.summarizeInputSlices(input),
      });
    }

    // If we have explicit texture data, generate narrative
    if (context.hasSensoryData) {
      return this.generateTouchNarrative(input, context);
    }

    // No explicit data - try LLM inference if allowed
    if (this.allowInference && this.llmProvider) {
      return this.inferTouchFromContext(input, context);
    }

    // No data and inference not allowed - ignore
    return this.createIgnoreResponse('No texture data and inference disabled', {
      context,
      inputSlices: this.summarizeInputSlices(input),
    });
  }

  /**
   * Extract touch-relevant context from input state slices.
   */
  private extractTouchContext(input: AgentInput): SensoryContext {
    const target = input.intent?.params?.target?.toLowerCase();
    const npc = input.stateSlices.npc;
    const character = input.stateSlices.character;

    // Extract body part from intent params OR from compound intent segments
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

    // Extract texture from target character's body map
    let sensoryData = this.extractTextureFromBodyMap(targetCharacter?.body, bodyRegion);

    // Fall back to knowledge context if no body map data
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
   * Extract texture data from a character's body map.
   */
  private extractTextureFromBodyMap(
    bodyMap: CharacterSlice['body'],
    bodyRegion: BodyRegion = DEFAULT_BODY_REGION
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

  /**
   * Extract texture-related data from knowledge context.
   */
  private extractTextureFromKnowledge(
    knowledgeContext: KnowledgeContextItem[] | undefined,
    bodyRegion: BodyRegion = DEFAULT_BODY_REGION
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

  /**
   * Generate a narrative response when we have explicit texture data.
   */
  private async generateTouchNarrative(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;

    if (this.llmProvider) {
      return this.generateLlmTouchNarrative(input, context);
    }

    // Template-based fallback
    const parts: string[] = [];
    const regionLabel = isExplicitBodyPart ? this.getRegionLabel(bodyRegion) : '';

    if (sensoryData[bodyRegion]) {
      const prefix = regionLabel
        ? `${targetName}'s ${regionLabel} feels`
        : `You feel ${targetName}'s skin -`;
      parts.push(`${prefix} ${sensoryData[bodyRegion]}.`);
    }

    if (parts.length === 0) {
      return this.createIgnoreResponse('Unexpected empty texture data');
    }

    return {
      narrative: parts.join(' '),
      diagnostics: {
        debug: {
          sensoryData,
          targetName,
          bodyRegion,
          isExplicitBodyPart,
          source: 'template',
        },
      },
    };
  }

  /**
   * Generate touch narrative using LLM.
   */
  private async generateLlmTouchNarrative(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, sensoryData, bodyRegion, isExplicitBodyPart } = context;

    const systemPrompt = this.buildTouchSystemPrompt(
      targetName,
      sensoryData,
      bodyRegion,
      isExplicitBodyPart
    );
    const userPrompt = `The player says: "${input.playerInput}"\n\nDescribe what they feel using ONLY the texture data provided. Keep it to 1-2 sentences.`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.4,
        maxTokens: 100,
      });

      return {
        narrative: response.text.trim(),
        diagnostics: {
          tokenUsage: response.usage,
          debug: {
            sensoryData,
            targetName,
            bodyRegion,
            isExplicitBodyPart,
            source: 'llm',
          },
        },
      };
    } catch {
      return this.generateTouchNarrative(
        { ...input, stateSlices: { ...input.stateSlices } },
        context
      );
    }
  }

  /**
   * Build system prompt for touch narrative generation.
   */
  private buildTouchSystemPrompt(
    targetName: string | undefined,
    sensoryData: Record<string, string>,
    bodyRegion: BodyRegion,
    isExplicitBodyPart: boolean
  ): string {
    const parts: string[] = [
      'You are generating sensory descriptions for a narrative RPG.',
      `The player is feeling/touching ${targetName ?? 'something'}.`,
    ];

    if (this.includeBodyRegionInPrompts && isExplicitBodyPart) {
      parts.push(`They are specifically touching their ${this.getRegionLabel(bodyRegion)}.`);
    }

    parts.push('');
    parts.push('TEXTURE DATA (use ONLY this information):');

    for (const [key, value] of Object.entries(sensoryData)) {
      parts.push(`- ${key}: ${value}`);
    }

    parts.push('');
    parts.push('CRITICAL POV RULES:');
    parts.push(`- "You" refers to the PLAYER who is experiencing the sensation`);
    parts.push(`- ${targetName ?? 'The NPC'} is the TARGET being touched`);
    parts.push('- Describe what the PLAYER feels when touching the NPC');
    parts.push('- Example: "You feel her soft skin" NOT "his hands on your skin"');
    parts.push('- Use "your" for player body parts, "her/his" for NPC body parts');
    parts.push('');
    parts.push('RULES:');
    parts.push(
      '- Describe ONLY the textures/sensations listed above. Do not invent additional details.'
    );
    parts.push('- Keep it to 1-2 sentences.');
    parts.push('- Be evocative but factual to the provided data.');
    parts.push('- Do not mention game mechanics or meta information.');

    return parts.join('\n');
  }

  /**
   * Attempt to infer touch from general context when no explicit texture data exists.
   */
  private async inferTouchFromContext(
    input: AgentInput,
    context: SensoryContext
  ): Promise<AgentOutput> {
    const { targetName, bodyRegion, isExplicitBodyPart } = context;

    const contextParts: string[] = [];

    const character = input.stateSlices.npc ?? input.stateSlices.character;
    if (character) {
      contextParts.push(`Character: ${character.name}`);
    }

    if (contextParts.length === 0) {
      return this.createIgnoreResponse('Insufficient context for touch inference');
    }

    const bodyRegionNote =
      this.includeBodyRegionInPrompts && isExplicitBodyPart
        ? `\nThe player is specifically touching their ${this.getRegionLabel(bodyRegion)}.`
        : '';

    const systemPrompt = `You are generating sensory descriptions for a narrative RPG.
The player is touching ${targetName ?? 'something'}.${bodyRegionNote}
You do NOT have explicit texture data, but you may be able to infer a likely sensation based on the context provided.

CRITICAL POV RULES:
- "You" refers to the PLAYER who is experiencing the sensation
- ${targetName ?? 'The NPC'} is the TARGET being touched
- Describe what the PLAYER feels when touching the NPC
- Example: "You feel her soft skin" NOT "his hands on your skin"
- Use "your" for player body parts, "her/his" for NPC body parts

Guidelines:
- Only generate a response if you can make a reasonable, grounded inference
- Keep the response to 1-2 sentences
- If you cannot make a confident inference, respond with exactly: [NO_INFERENCE]

Available context:
${contextParts.join('\n')}`;

    const userPrompt = `Player: "${input.playerInput}"\n\nWhat does the player feel?`;

    try {
      const response = await this.llmProvider!.generate(userPrompt, {
        systemPrompt,
        temperature: 0.6,
        maxTokens: 100,
      });

      const text = response.text.trim();

      if (text.includes('[NO_INFERENCE]') || text.length < 10) {
        return this.createIgnoreResponse('LLM could not infer texture from context');
      }

      return {
        narrative: text,
        diagnostics: {
          tokenUsage: response.usage,
          debug: { targetName, source: 'llm-inference', contextParts: contextParts.length },
        },
      };
    } catch {
      return this.createIgnoreResponse('LLM inference failed');
    }
  }

  // ============================================================================
  // Shared Helpers
  // ============================================================================

  /**
   * Build system prompt for smell narrative generation.
   */
  private buildSmellSystemPrompt(
    targetName: string | undefined,
    sensoryData: Record<string, string>,
    bodyRegion: BodyRegion,
    isExplicitBodyPart: boolean
  ): string {
    const parts: string[] = [
      'You are generating sensory descriptions for a narrative RPG.',
      `The player is smelling ${targetName ?? 'something'}.`,
    ];

    if (this.includeBodyRegionInPrompts && isExplicitBodyPart) {
      parts.push(`They are specifically smelling their ${this.getRegionLabel(bodyRegion)}.`);
    }

    parts.push('');
    parts.push('SCENT DATA (use ONLY this information):');

    for (const [key, value] of Object.entries(sensoryData)) {
      parts.push(`- ${key}: ${value}`);
    }

    parts.push('');
    parts.push('CRITICAL POV RULES:');
    parts.push(`- "You" refers to the PLAYER who is experiencing the sensation`);
    parts.push(`- ${targetName ?? 'The NPC'} is the TARGET being smelled`);
    parts.push('- Describe what the PLAYER smells from the NPC');
    parts.push('- Example: "You catch her perfume" NOT "his nose detects your scent"');
    parts.push('- Use "your" for player body parts, "her/his" for NPC body parts');
    parts.push('');
    parts.push('RULES:');
    parts.push('- Describe ONLY the scents listed above. Do not invent additional scents.');
    parts.push('- Keep it to 1-2 sentences.');
    parts.push('- Be evocative but factual to the provided data.');
    parts.push('- Do not mention game mechanics or meta information.');

    return parts.join('\n');
  }

  /**
   * Create a response that effectively ignores the intent.
   * Returns an empty narrative and logs the reason in diagnostics.
   */
  private createIgnoreResponse(reason: string, debugData?: Record<string, unknown>): AgentOutput {
    return {
      narrative: '', // Empty narrative = intent is ignored
      diagnostics: {
        warnings: [`SensoryAgent ignored intent: ${reason}`],
        debug: { ignored: true, reason, ...debugData },
      },
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override getFallbackNarrative(_input: AgentInput): string {
    // Return empty - we never want to say "you don't notice anything"
    return '';
  }
}
