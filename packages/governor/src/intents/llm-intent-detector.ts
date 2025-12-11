import {
  type IntentDetector,
  type IntentDetectionContext,
  type IntentDetectionResult,
  type IntentParams,
  type DetectedIntent,
  type IntentSegment,
} from './types.js';
import { type IntentType, resolveIntentType } from './intents.js';
import {
  detectSensoryIntent,
  detectAllSensoryTypes,
  extractBodyPart,
} from './rule-based-filter.js';
import { SENSORY_INDICATORS } from '@minimal-rpg/utils';

/**
 * Build the default system prompt for intent detection.
 * Compact version optimized for speed - fewer tokens = faster response.
 */
function buildDefaultSystemPrompt(): string {
  // Build keyword lists from SENSORY_INDICATORS
  const smellKeywords = SENSORY_INDICATORS.scent.slice(0, 6).join('/');
  const touchKeywords = SENSORY_INDICATORS.texture.slice(0, 6).join('/');
  const tasteKeywords = SENSORY_INDICATORS.flavor.slice(0, 6).join('/');
  const listenKeywords = SENSORY_INDICATORS.sound.slice(0, 5).join('/');
  const lookKeywords = SENSORY_INDICATORS.visual.slice(0, 6).join('/');

  return `You are an RPG intent classifier. Parse player input into JSON.

RULES:
- Outside *asterisks* = talk (speech)
- Inside *asterisks* = action/thought/emote/sensory (NEVER talk)

SENSORY KEYWORDS (use these to classify sensory intents):
- smell: ${smellKeywords}, etc.
- taste: ${tasteKeywords}, etc.
- touch: ${touchKeywords}, etc. (ONLY use touch when keyword present OR non-oral physical contact)
- listen: ${listenKeywords}, etc.
- look: ${lookKeywords}, etc.
- bodyPart = the TARGET being sensed (e.g., "her feet" → "feet")

OUTPUT FORMAT:
{"primaryType":"talk|action|smell|touch|...","confidence":0.0-1.0,"intents":[{"type":"talk|action|thought|emote|smell|touch|taste|listen|look","content":"...","bodyPart":"optional"}]}

EXAMPLE:
Input: "Sure *he notices her feet in his lap, catching their scent*"
{"primaryType":"touch","confidence":0.95,"intents":[{"type":"talk","content":"Sure"},{"type":"touch","content":"notices her feet in his lap","bodyPart":"feet"},{"type":"smell","content":"catching their scent","bodyPart":"feet"}]}

Output valid JSON only. No markdown.`;
}

export interface LlmIntentMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LlmIntentGenerationResult {
  content: string;
  model?: string;
  raw?: unknown;
}

export type LlmIntentGenerateFn = (
  messages: LlmIntentMessage[]
) => Promise<LlmIntentGenerationResult>;

export interface LlmIntentDetectorConfig {
  callModel: LlmIntentGenerateFn;
  detectorName?: string;
  historyLimit?: number;
  minConfidence?: number;
  systemPrompt?: string;
  /** When true, asks the LLM to include reasoning in its response */
  debug?: boolean;
}

interface PromptArtifacts {
  system: string;
  user: string;
  messages: LlmIntentMessage[];
  historyPreview: string[];
  contextSummary: string[];
}

interface ParseResult {
  parsed: unknown;
  warnings: string[];
}

export class LlmIntentDetector implements IntentDetector {
  private readonly callModel: LlmIntentGenerateFn;
  private readonly detectorName: string;
  private readonly historyLimit: number;
  private readonly minConfidence: number;
  private readonly systemPrompt: string;
  private readonly debug: boolean;

  constructor(config: LlmIntentDetectorConfig) {
    this.callModel = config.callModel;
    this.detectorName = config.detectorName ?? 'llm-intent-detector';
    this.historyLimit = Math.max(0, config.historyLimit ?? 3);
    this.minConfidence = Math.min(Math.max(config.minConfidence ?? 0, 0), 1);
    this.systemPrompt = config.systemPrompt ?? buildDefaultSystemPrompt();
    this.debug = config.debug ?? false;
  }

  async detect(input: string, context?: IntentDetectionContext): Promise<IntentDetectionResult> {
    // Fast path: Try rule-based sensory detection first
    const ruleBasedResult = detectSensoryIntent(input);

    if (ruleBasedResult) {
      // Deterministic match found! Skip expensive LLM call
      // Still need to extract bodyPart and handle compound cases
      const allSensoryTypes = detectAllSensoryTypes(input);

      if (allSensoryTypes.length > 1) {
        // Multiple sensory types detected - create segments with context-aware body parts
        const segments: IntentSegment[] = allSensoryTypes.map((s) => ({
          type: 'sensory',
          content: input, // Full input for each sense
          sensoryType: s.sensoryType,
          // Extract body part relative to each sensory type's verb position
          bodyPart: extractBodyPart(input, s.sensoryType),
        }));

        return {
          intent: {
            type: ruleBasedResult.type,
            confidence: ruleBasedResult.confidence,
            segments,
          },
          debug: {
            detector: `${this.detectorName}-rule-based`,
            prompt: { system: 'N/A (rule-based)', user: input },
            historyPreview: [],
            contextSummary: [],
            rawResponse: `Rule-based match: ${ruleBasedResult.matchedKeyword} → ${ruleBasedResult.type}`,
            parsed: { sensoryTypes: allSensoryTypes },
            warnings: undefined,
          },
        };
      }

      // Single sensory type - simple intent with context-aware body part extraction
      const bodyPart = extractBodyPart(input, ruleBasedResult.sensoryType);
      return {
        intent: {
          type: ruleBasedResult.type,
          confidence: ruleBasedResult.confidence,
          params: bodyPart ? { bodyPart } : undefined,
        },
        debug: {
          detector: `${this.detectorName}-rule-based`,
          prompt: { system: 'N/A (rule-based)', user: input },
          historyPreview: [],
          contextSummary: [],
          rawResponse: `Rule-based match: ${ruleBasedResult.matchedKeyword} → ${ruleBasedResult.type}`,
          parsed: ruleBasedResult,
          warnings: undefined,
        },
      };
    }

    // Fallback: Use LLM for complex/ambiguous inputs
    const prompt = this.buildPrompt(input, context);
    let response: LlmIntentGenerationResult;

    try {
      response = await this.callModel(prompt.messages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown LLM error';
      throw new Error(`LLM intent detector failed: ${message}`);
    }

    const parseResult = this.parseResponse(response.content);
    const normalized = this.normalizeIntent(parseResult.parsed, input);

    if (normalized.confidence < this.minConfidence) {
      normalized.type = 'unknown';
    }

    return {
      intent: normalized,
      debug: {
        detector: this.detectorName,
        model: response.model,
        prompt: { system: prompt.system, user: prompt.user },
        historyPreview: prompt.historyPreview,
        contextSummary: prompt.contextSummary,
        rawResponse: response.content,
        parsed: parseResult.parsed,
        warnings: parseResult.warnings.length > 0 ? parseResult.warnings : undefined,
      },
    };
  }

  private buildPrompt(input: string, context?: IntentDetectionContext): PromptArtifacts {
    const trimmedInput = input.trim();

    // Limit history to reduce tokens
    const historyPreview = (context?.recentHistory ?? [])
      .slice(-this.historyLimit)
      .map((entry, idx) => `${idx + 1}. ${entry}`);

    // Only include essential context
    const contextSummary: string[] = [];
    if (context?.presentNpcs && context.presentNpcs.length > 0) {
      contextSummary.push(`NPCs: ${context.presentNpcs.join(', ')}`);
    }

    // Build compact user prompt
    let user = trimmedInput;

    if (historyPreview.length > 0) {
      user += `\n[History: ${historyPreview.join('; ')}]`;
    }

    if (contextSummary.length > 0) {
      user += `\n[${contextSummary.join('; ')}]`;
    }

    if (this.debug) {
      user += '\n[DEBUG: include "reasoning" field]';
    }

    const messages: LlmIntentMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: user },
    ];

    return { system: this.systemPrompt, user, messages, historyPreview, contextSummary };
  }

  private parseResponse(content: string): ParseResult {
    const warnings: string[] = [];
    const trimmed = content.trim();
    const jsonPayload = this.extractJsonPayload(trimmed);

    if (!jsonPayload) {
      warnings.push('no-json-found');
      return { parsed: undefined, warnings };
    }

    try {
      return { parsed: JSON.parse(jsonPayload), warnings };
    } catch (error) {
      warnings.push('json-parse-failed');
      warnings.push(error instanceof Error ? error.message : 'unknown-error');
      return { parsed: undefined, warnings };
    }
  }

  private extractJsonPayload(content: string): string | null {
    const fenced = /```json([\s\S]*?)```/i.exec(content);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }

    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      return content.slice(start, end + 1).trim();
    }

    return null;
  }

  private normalizeIntent(value: unknown, fallbackInput: string): DetectedIntent {
    if (!value || typeof value !== 'object') {
      return this.buildUnknownIntent(fallbackInput);
    }

    const record = value as Record<string, unknown>;

    // Support both "primaryType" (new) and "type" (legacy) fields
    let type = this.mapIntentType(record['primaryType'] ?? record['type']);
    const confidence = this.clampConfidence(record['confidence']);
    const params = this.normalizeParams(record['params']);
    const signals = this.normalizeSignals(record['signals']);

    // Support both "intents" (new) and "segments" (legacy) fields
    let segments = this.normalizeSegments(record['intents'] ?? record['segments']);

    // === SENSORY SIGNAL PROMOTION ===
    // If the LLM returned the old format with signals containing sensory types,
    // promote the first sensory signal to be the primary type and generate segments
    const sensoryTypes = ['smell', 'touch', 'taste', 'listen', 'look'];
    const sensorySignal = signals?.find((s) => sensoryTypes.includes(s));

    if (sensorySignal && !sensoryTypes.includes(type)) {
      // Promote sensory signal to primary type
      type = this.mapIntentType(sensorySignal);

      // If no segments exist, auto-generate them from the legacy format
      if (!segments || segments.length === 0) {
        segments = this.generateSegmentsFromLegacy(type, params, fallbackInput);
      }
    }

    // Extract suggestedType for unknown intents
    const suggestedType =
      type === 'unknown' && typeof record['suggestedType'] === 'string'
        ? record['suggestedType'].trim()
        : undefined;

    const intent: DetectedIntent = {
      type,
      confidence,
      params,
      signals,
    };

    if (suggestedType) {
      intent.suggestedType = suggestedType;
    }

    if (segments && segments.length > 0) {
      intent.segments = segments;
    }

    return intent;
  }

  /**
   * Generate segments from legacy format when LLM doesn't provide the new multi-intent array.
   * This creates a single sensory segment from params and input.
   */
  private generateSegmentsFromLegacy(
    primaryType: IntentType,
    params: IntentParams | undefined,
    input: string
  ): IntentSegment[] {
    const sensoryTypes = ['smell', 'touch', 'taste', 'listen', 'look'];

    if (!sensoryTypes.includes(primaryType)) {
      return [];
    }

    const segment: IntentSegment = {
      type: 'sensory',
      content: input.trim(),
      sensoryType: primaryType as 'smell' | 'touch' | 'look' | 'taste' | 'listen',
    };

    // Extract bodyPart from params if available
    if (params?.bodyPart && typeof params.bodyPart === 'string') {
      segment.bodyPart = params.bodyPart;
    }

    return [segment];
  }

  private normalizeSegments(input: unknown): IntentSegment[] | undefined {
    if (!Array.isArray(input)) {
      return undefined;
    }

    const segments: IntentSegment[] = [];
    // Valid segment types - includes both action types and sensory types
    const validTypes = [
      'talk',
      'action',
      'thought',
      'emote',
      'sensory',
      'smell',
      'touch',
      'taste',
      'listen',
      'look',
    ];
    // Sensory types that should be normalized to segment type "sensory" with sensoryType field
    const sensoryTypes = ['smell', 'touch', 'taste', 'listen', 'look'];

    for (const item of input) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const record = item as Record<string, unknown>;
      const rawType = record['type'];
      const content = record['content'];

      // Validate required fields
      if (!validTypes.includes(rawType as string) || typeof content !== 'string') {
        continue;
      }

      // Normalize sensory types (smell, touch, etc.) to segment type "sensory" with sensoryType
      const isSensoryType = sensoryTypes.includes(rawType as string);
      const segmentType = isSensoryType ? 'sensory' : (rawType as IntentSegment['type']);

      const segment: IntentSegment = {
        type: segmentType,
        content: content.trim(),
      };

      // Extract sensoryType and bodyPart for sensory segments
      if (isSensoryType) {
        segment.sensoryType = rawType as 'smell' | 'touch' | 'look' | 'taste' | 'listen';
      } else if (rawType === 'sensory') {
        // Handle legacy format where sensoryType is a separate field
        const sensoryType = record['sensoryType'];
        if (
          sensoryType === 'smell' ||
          sensoryType === 'touch' ||
          sensoryType === 'look' ||
          sensoryType === 'taste' ||
          sensoryType === 'listen'
        ) {
          segment.sensoryType = sensoryType;
        }
      }

      // Extract bodyPart for any sensory segment
      if (segment.type === 'sensory') {
        const bodyPart = record['bodyPart'];
        if (typeof bodyPart === 'string' && bodyPart.trim()) {
          segment.bodyPart = bodyPart.trim();
        }
      }

      segments.push(segment);
    }

    return segments.length > 0 ? segments : undefined;
  }

  private normalizeParams(input: unknown): IntentParams | undefined {
    if (!input || typeof input !== 'object') {
      return undefined;
    }

    const params: IntentParams = {};
    const source = input as Record<string, unknown>;

    if (typeof source['target'] === 'string') {
      params.target = source['target'];
    }
    if (typeof source['item'] === 'string') {
      params.item = source['item'];
    }
    if (typeof source['direction'] === 'string') {
      params.direction = source['direction'];
    }
    if (typeof source['action'] === 'string') {
      params.action = source['action'];
    }
    if (typeof source['bodyPart'] === 'string') {
      params.bodyPart = source['bodyPart'];
    }
    // Handle narrateType for narrate intents
    const narrateType = source['narrateType'];
    if (
      narrateType === 'action' ||
      narrateType === 'thought' ||
      narrateType === 'emote' ||
      narrateType === 'narrative'
    ) {
      params.narrateType = narrateType;
    }
    if (source['extra'] && typeof source['extra'] === 'object') {
      params.extra = source['extra'] as Record<string, unknown>;
    }

    return Object.keys(params).length > 0 ? params : undefined;
  }

  private normalizeSignals(input: unknown): string[] | undefined {
    if (!Array.isArray(input)) {
      return undefined;
    }

    const signals = input.filter((entry): entry is string => typeof entry === 'string');
    return signals.length > 0 ? signals : undefined;
  }

  private mapIntentType(value: unknown): IntentType {
    if (typeof value !== 'string') {
      return 'unknown';
    }

    return resolveIntentType(value);
  }

  private clampConfidence(value: unknown): number {
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return Math.min(Math.max(numeric, 0), 1);
  }

  private buildUnknownIntent(fallbackInput: string): DetectedIntent {
    return {
      type: 'unknown',
      confidence: 0,
      params: fallbackInput ? { action: fallbackInput } : undefined,
    };
  }
}
