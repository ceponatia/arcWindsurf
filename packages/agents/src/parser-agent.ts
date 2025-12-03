import { BaseAgent } from './base.js';
import type {
  AgentConfig,
  AgentInput,
  AgentIntent,
  AgentOutput,
  AgentType,
  IntentType,
} from './types.js';

/**
 * Configuration specific to the parser agent.
 */
export interface ParserAgentConfig extends AgentConfig {
  /** Regex patterns for extracting structured data */
  patterns?: ParserPattern[];
}

/**
 * A pattern for extracting structured data.
 */
export interface ParserPattern {
  /** Name of the pattern */
  name: string;

  /** Regex pattern to match */
  pattern: RegExp;

  /** Target path in the profile (e.g., 'appearance.hair.color') */
  targetPath: string;

  /** Which capture group to use (default: 1) */
  captureGroup?: number;
}

/**
 * Agent responsible for parsing and normalizing profile data.
 * Handles extraction of structured attributes from free-text.
 */
export class ParserAgent extends BaseAgent {
  public readonly agentType: AgentType = 'parser';
  public readonly name = 'Parser/Normalization Agent';

  /** Intent types this agent can handle */
  private static readonly HANDLED_INTENTS: IntentType[] = ['custom'];

  /** Default parsing patterns */
  private readonly patterns: ParserPattern[];

  constructor(config: ParserAgentConfig = {}) {
    super(config);
    this.patterns = config.patterns ?? DEFAULT_PARSER_PATTERNS;
  }

  canHandle(intent: AgentIntent): boolean {
    // Parser handles custom intents that relate to profile normalization
    return ParserAgent.HANDLED_INTENTS.includes(intent.type) && intent.params.action === 'parse';
  }

  protected async process(input: AgentInput): Promise<AgentOutput> {
    const action = input.intent?.params.action;

    switch (action) {
      case 'parse':
        return this.handleParse(input);
      default:
        return {
          narrative: 'Nothing to parse.',
        };
    }
  }

  /**
   * Handle a parse action.
   * Extracts structured data from the input text.
   */
  private async handleParse(input: AgentInput): Promise<AgentOutput> {
    const text = input.playerInput;
    const extracted = this.extractWithPatterns(text);

    // If we have an LLM provider, also try LLM-based extraction
    if (this.llmProvider && extracted.length === 0) {
      return this.extractWithLlm(input);
    }

    if (extracted.length === 0) {
      return {
        narrative: 'No structured data could be extracted.',
        diagnostics: {
          debug: { patternsChecked: this.patterns.length },
        },
      };
    }

    // Generate patches from extracted data
    const statePatches = extracted.map((item) => ({
      op: 'add' as const,
      path: `/${item.path.replace(/\./g, '/')}`,
      value: item.value,
    }));

    return {
      narrative: `Extracted ${extracted.length} attribute(s) from the text.`,
      statePatches,
      events: [
        {
          type: 'attributes_extracted',
          payload: {
            count: extracted.length,
            paths: extracted.map((e) => e.path),
          },
          source: this.agentType,
        },
      ],
      diagnostics: {
        debug: {
          extracted,
        },
      },
    };
  }

  /**
   * Extract structured data using regex patterns.
   */
  private extractWithPatterns(text: string): ExtractedAttribute[] {
    const results: ExtractedAttribute[] = [];

    for (const pattern of this.patterns) {
      const match = pattern.pattern.exec(text);
      if (match) {
        const captureGroup = pattern.captureGroup ?? 1;
        const value = match[captureGroup];
        if (value) {
          results.push({
            name: pattern.name,
            path: pattern.targetPath,
            value: value.trim(),
          });
        }
      }
    }

    return results;
  }

  /**
   * Extract structured data using the LLM.
   */
  private async extractWithLlm(input: AgentInput): Promise<AgentOutput> {
    const systemPrompt = `You are a parser that extracts structured character attributes from natural language descriptions.

Given a text description, extract any of the following attributes if mentioned:
- appearance.hair.color
- appearance.hair.style
- appearance.eyes.color
- appearance.skin.tone
- appearance.build
- appearance.height

Respond in JSON format with an array of objects: [{"path": "appearance.hair.color", "value": "brown"}, ...]
Only include attributes that are explicitly mentioned in the text.
If no attributes can be extracted, respond with an empty array: []`;

    try {
      const response = await this.llmProvider!.generate(input.playerInput, {
        systemPrompt,
        temperature: 0.1, // Low temperature for deterministic extraction
        maxTokens: 200,
      });

      const parsed = this.parseLlmResponse(response.text);

      if (parsed.length === 0) {
        return {
          narrative: 'No structured data could be extracted.',
          diagnostics: {
            tokenUsage: response.usage,
          },
        };
      }

      const statePatches = parsed.map((item) => ({
        op: 'add' as const,
        path: `/${item.path.replace(/\./g, '/')}`,
        value: item.value,
      }));

      return {
        narrative: `Extracted ${parsed.length} attribute(s) using LLM analysis.`,
        statePatches,
        diagnostics: {
          tokenUsage: response.usage,
          debug: { extracted: parsed },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        narrative: 'Failed to extract structured data.',
        diagnostics: {
          warnings: [`LLM extraction failed: ${errorMessage}`],
        },
      };
    }
  }

  /**
   * Parse the LLM response to extract attributes.
   */
  private parseLlmResponse(response: string): ExtractedAttribute[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = /\[[\s\S]*\]/.exec(response);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as unknown[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item): item is { path: string; value: string } => {
          if (typeof item !== 'object' || item === null) {
            return false;
          }
          const obj = item as Record<string, unknown>;
          return typeof obj['path'] === 'string' && typeof obj['value'] === 'string';
        })
        .map((item) => ({
          name: item.path.split('.').pop() ?? 'unknown',
          path: item.path,
          value: item.value,
        }));
    } catch {
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected override getFallbackNarrative(_input: AgentInput): string {
    return 'Unable to parse the input.';
  }
}

/**
 * An extracted attribute from parsing.
 */
interface ExtractedAttribute {
  /** Name of the attribute */
  name: string;

  /** Target path in the profile */
  path: string;

  /** Extracted value */
  value: string;
}

/**
 * Default patterns for extracting character attributes.
 */
export const DEFAULT_PARSER_PATTERNS: ParserPattern[] = [
  {
    name: 'hair_color',
    pattern: /(?:hair\s*(?:color|colour):\s*|(?:has\s+)?(\w+)\s+hair)/i,
    targetPath: 'appearance.hair.color',
    captureGroup: 1,
  },
  {
    name: 'hair_style',
    pattern: /(?:hair\s*style:\s*|(\w+)\s+(?:styled\s+)?hair)/i,
    targetPath: 'appearance.hair.style',
    captureGroup: 1,
  },
  {
    name: 'eye_color',
    pattern: /(?:eye\s*(?:color|colour):\s*|(\w+)\s+eyes)/i,
    targetPath: 'appearance.eyes.color',
    captureGroup: 1,
  },
  {
    name: 'skin_tone',
    pattern: /(?:skin\s*(?:tone|color|colour):\s*|(\w+)\s+skin)/i,
    targetPath: 'appearance.skin.tone',
    captureGroup: 1,
  },
  {
    name: 'height',
    pattern: /(?:height:\s*|(?:is\s+)?(\d+(?:\.\d+)?(?:\s*(?:cm|m|ft|feet|inches?))?))/i,
    targetPath: 'appearance.height',
    captureGroup: 1,
  },
  {
    name: 'build',
    pattern: /(?:build:\s*|(slim|slender|athletic|muscular|heavy|stocky|average)\s+build)/i,
    targetPath: 'appearance.build',
    captureGroup: 1,
  },
];
