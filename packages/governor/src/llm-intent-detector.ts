import {
  type IntentDetector,
  type IntentDetectionContext,
  type IntentDetectionResult,
  type IntentType,
  type IntentParams,
  type DetectedIntent,
} from './types.js';

const INTENT_TYPES: IntentType[] = [
  'move',
  'look',
  'talk',
  'use',
  'take',
  'give',
  'examine',
  'wait',
  'system',
  'unknown',
];

const DEFAULT_SYSTEM_PROMPT = [
  'You are an intent classifier for a text-based RPG.',
  'Determine the single most likely intent expressed by the player.',
  'Use the supplied history and context only as short hints.',
  'Respond with STRICT JSON that matches this schema and NOTHING ELSE:',
  '{',
  '  "type": "move|look|talk|use|take|give|examine|wait|system|unknown",',
  '  "confidence": number between 0 and 1,',
  '  "params": { "target"?: string, "item"?: string, "direction"?: string, "action"?: string },',
  '  "signals"?: string[]',
  '}',
  'Do not include markdown fences, commentary, or natural language.',
].join('\n');

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

  constructor(config: LlmIntentDetectorConfig) {
    this.callModel = config.callModel;
    this.detectorName = config.detectorName ?? 'llm-intent-detector';
    this.historyLimit = Math.max(0, config.historyLimit ?? 3);
    this.minConfidence = Math.min(Math.max(config.minConfidence ?? 0, 0), 1);
    this.systemPrompt = config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
  }

  async detect(input: string, context?: IntentDetectionContext): Promise<IntentDetectionResult> {
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
    const historyPreview = (context?.recentHistory ?? [])
      .slice(-this.historyLimit)
      .map((entry, idx) => `${idx + 1}. ${entry}`);

    const contextSummary: string[] = [];

    if (context?.currentLocation) {
      contextSummary.push(`Location: ${context.currentLocation}`);
    }
    if (context?.presentNpcs && context.presentNpcs.length > 0) {
      contextSummary.push(`NPCs: ${context.presentNpcs.join(', ')}`);
    }
    if (context?.inventoryItems && context.inventoryItems.length > 0) {
      contextSummary.push(`Inventory: ${context.inventoryItems.join(', ')}`);
    }
    if (context?.availableActions && context.availableActions.length > 0) {
      contextSummary.push(`Actions: ${context.availableActions.join(', ')}`);
    }

    const sections: string[] = [`Player Input:\n${trimmedInput}`];

    if (historyPreview.length > 0) {
      sections.push(`Recent Turns:\n${historyPreview.join('\n')}`);
    }

    if (contextSummary.length > 0) {
      sections.push(`Context Summary:\n${contextSummary.map((line) => `- ${line}`).join('\n')}`);
    }

    sections.push(
      'Output JSON only. Fields must exactly match the schema. Use "unknown" if intent cannot be determined.'
    );

    const user = sections.join('\n\n');
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
    const type = this.mapIntentType(record['type']);
    const confidence = this.clampConfidence(record['confidence']);
    const params = this.normalizeParams(record['params']);
    const signals = this.normalizeSignals(record['signals']);

    return {
      type,
      confidence,
      params,
      signals,
    };
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

    const normalized = value.toLowerCase().trim();
    if ((INTENT_TYPES as string[]).includes(normalized)) {
      return normalized as IntentType;
    }

    const aliases: Record<string, IntentType> = {
      inspect: 'examine',
      observe: 'look',
      speak: 'talk',
      say: 'talk',
      wait: 'wait',
    };

    return aliases[normalized] ?? 'unknown';
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
