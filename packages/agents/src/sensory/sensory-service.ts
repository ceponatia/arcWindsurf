import type { AgentInput, AgentOutput } from '../core/types.js';
import type { SensoryServiceConfig, SensoryIntentType } from './types.js';
import { isSensoryIntent, SENSORY_INTENT_TYPES } from './types.js';
import type { BodyRegion } from './types.js';
import {
  resolveBodyRegion,
  DEFAULT_BODY_REGION,
  BODY_REGIONS,
  isBodyReference,
} from '@minimal-rpg/schemas';
import { SensoryContextBuilder } from './components/context-builder.js';
import { SensoryDataCollector } from './components/data-collector.js';
import { SensoryNarrator } from './components/narrator.js';

/**
 * Service responsible for handling sensory intents (smell, taste, touch, listen).
 *
 * Currently implements:
 * - smell: Uses character scent data from BodyMap or legacy ScentSchema
 * - touch: Uses texture data from BodyMap
 *
 * TBD (no data source yet):
 * - taste: Would require item/consumable taste data
 * - listen: Would require ambient sound data on locations
 *
 * ## Design Principles
 *
 * - Never say "you don't notice anything" - either provide immersive content or ignore
 * - If explicit sensory data exists, use it
 * - If no data but LLM can infer with high confidence, allow inference
 * - Otherwise, silently return no output (intent is ignored)
 *
 * @see {@link SensoryServiceConfig} for configuration options
 */
export class SensoryService {
  public readonly name = 'Sensory Service';

  /** Intent types this service can handle */
  public static readonly HANDLED_INTENTS: readonly SensoryIntentType[] = SENSORY_INTENT_TYPES;

  /** All supported body regions */
  public static readonly SUPPORTED_BODY_REGIONS: readonly BodyRegion[] = BODY_REGIONS;

  private readonly config: SensoryServiceConfig;
  private readonly contextBuilder: SensoryContextBuilder;
  private readonly dataCollector: SensoryDataCollector;
  private readonly narrator: SensoryNarrator;

  constructor(config: SensoryServiceConfig = {}) {
    this.config = config;

    this.dataCollector = new SensoryDataCollector(config.defaultBodyRegion ?? DEFAULT_BODY_REGION);
    this.contextBuilder = new SensoryContextBuilder(this.dataCollector);
    this.narrator = new SensoryNarrator(config.llmProvider, config);
  }

  /**
   * Get the default body region used when none is specified.
   */
  getDefaultBodyRegion(): BodyRegion {
    return this.config.defaultBodyRegion ?? DEFAULT_BODY_REGION;
  }

  /**
   * Resolve a raw body part reference to a canonical body region.
   * Exposed for testing and external use.
   */
  resolveBodyPart(rawBodyPart: string | undefined): BodyRegion {
    return resolveBodyRegion(rawBodyPart, this.getDefaultBodyRegion());
  }

  /**
   * Check if a string is a valid body reference (region or alias).
   */
  isValidBodyReference(value: string): boolean {
    return isBodyReference(value);
  }

  /**
   * Build structured sensory context for NPC agents to use.
   * This does NOT generate prose - it provides data that the NPC agent will weave into narrative.
   */
  public getSensoryContext(
    input: AgentInput,
    segments?: NonNullable<AgentInput['intent']>['segments']
  ): AgentOutput {
    return this.contextBuilder.buildStructuredSensoryContext(input, segments);
  }

  /**
   * Generate combined sensory narrative using LLM.
   * Single call handles all requested senses for the character.
   */
  public async generateSensoryNarrative(
    input: AgentInput,
    segments?: NonNullable<AgentInput['intent']>['segments']
  ): Promise<AgentOutput> {
    const effectiveSegments =
      segments ??
      input.intent?.segments?.filter((seg) => seg.type === 'sensory' && seg.sensoryType);

    if (!effectiveSegments || effectiveSegments.length === 0) {
      // Fallback for single intent
      if (input.intent?.type && isSensoryIntent(input.intent.type)) {
        return this.handleSensoryIntent(input.intent.type, input);
      }
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
    const sensoryRequests: {
      type: SensoryIntentType;
      bodyPart: string | undefined;
      content: string;
    }[] = [];

    for (const seg of effectiveSegments) {
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
    const availableData = this.dataCollector.collectCharacterSensoryData(
      targetCharacter,
      sensoryRequests
    );

    // If no LLM, try template-based response
    if (!this.config.llmProvider) {
      if (Object.keys(availableData).length === 0) {
        return this.createIgnoreResponse('No sensory data and no LLM available');
      }
      return this.narrator.generateTemplateSensoryResponse(targetCharacter.name, availableData);
    }

    // Generate combined sensory description with LLM
    return this.narrator.generateCombinedSensoryNarrative(
      input,
      targetCharacter,
      sensoryRequests,
      availableData
    );
  }

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

  private async handleSmell(input: AgentInput): Promise<AgentOutput> {
    const context = this.dataCollector.extractSmellContext(input);

    if (context.targetType !== 'character') {
      return this.createIgnoreResponse(
        `Smell intent for ${context.targetType} TBD - only character scent implemented`,
        { context }
      );
    }

    if (!context.hasSensoryData && !this.config.llmProvider) {
      return this.createIgnoreResponse('No scent data available and no LLM for inference', {
        context,
      });
    }

    if (context.hasSensoryData) {
      return this.narrator.generateSmellNarrative(input, context);
    }

    if ((this.config.allowInference ?? true) && this.config.llmProvider) {
      return this.narrator.inferSmellFromContext(input, context);
    }

    return this.createIgnoreResponse('No scent data and inference disabled', {
      context,
    });
  }

  private async handleTouch(input: AgentInput): Promise<AgentOutput> {
    const context = this.dataCollector.extractTouchContext(input);

    if (context.targetType !== 'character') {
      return this.createIgnoreResponse(
        `Touch intent for ${context.targetType} TBD - only character texture implemented`,
        { context }
      );
    }

    if (!context.hasSensoryData && !this.config.llmProvider) {
      return this.createIgnoreResponse('No texture data available and no LLM for inference', {
        context,
      });
    }

    if (context.hasSensoryData) {
      return this.narrator.generateTouchNarrative(input, context);
    }

    if ((this.config.allowInference ?? true) && this.config.llmProvider) {
      return this.narrator.inferTouchFromContext(input, context);
    }

    return this.createIgnoreResponse('No texture data and inference disabled', {
      context,
    });
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
