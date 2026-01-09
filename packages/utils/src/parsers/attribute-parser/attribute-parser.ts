import { getArraySafe } from '@minimal-rpg/schemas';
import type {
  ParserPattern,
  ExtractedAttribute,
  ParserLlmProvider,
  AttributeParserConfig,
} from './types.js';

export type { ParserPattern, ExtractedAttribute, ParserLlmProvider, AttributeParserConfig };

/**
 * Service responsible for parsing and normalizing profile data.
 * Handles extraction of structured attributes from free-text.
 */
export class AttributeParser {
  /** Default parsing patterns */
  private readonly patterns: ParserPattern[];
  private readonly llmProvider: ParserLlmProvider | undefined;

  constructor(config: AttributeParserConfig = {}) {
    this.patterns = config.patterns ?? DEFAULT_PARSER_PATTERNS;
    this.llmProvider = config.llmProvider;
  }

  /**
   * Parse text to extract attributes.
   * Tries regex patterns first, then LLM if available and no patterns matched.
   */
  public async parse(text: string): Promise<ExtractedAttribute[]> {
    const extracted = this.extractWithPatterns(text);

    // If we have an LLM provider and regex failed, try LLM-based extraction
    if (this.llmProvider && extracted.length === 0) {
      return this.extractWithLlm(text);
    }

    return extracted;
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
        const value = getArraySafe(match, captureGroup);
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
  private async extractWithLlm(text: string): Promise<ExtractedAttribute[]> {
    if (!this.llmProvider) return [];

    const systemPrompt = `You are a parser that extracts structured character attributes from natural language descriptions.

Given a text description, extract any of the following attributes if mentioned:
- physique.appearance.hair.color
- physique.appearance.hair.style
- physique.appearance.hair.length
- physique.appearance.eyes.color
- physique.build.skinTone
- physique.build.height
- physique.build.torso
- physique.build.arms.build
- physique.build.arms.length
- physique.build.legs.build
- physique.build.legs.length
- physique.build.feet.size
- physique.build.feet.shape

Respond in JSON format with an array of objects: [{"path": "physique.appearance.hair.color", "value": "brown"}, ...]
Only include attributes that are explicitly mentioned in the text.
If no attributes can be extracted, respond with an empty array: []`;

    try {
      const response = await this.llmProvider.generate(text, {
        systemPrompt,
        temperature: 0.1, // Low temperature for deterministic extraction
        maxTokens: 200,
      });

      return this.parseLlmResponse(response.text);
    } catch (error) {
      console.warn('LLM extraction failed:', error);
      return [];
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
}

/**
 * Default patterns for extracting character attributes.
 */
export const DEFAULT_PARSER_PATTERNS: ParserPattern[] = [
  {
    name: 'hair_color',
    pattern: /(?:hair\s*(?:color|colour):\s*|(?:has\s+)?(\w+)\s+hair)/i,
    targetPath: 'physique.appearance.hair.color',
    captureGroup: 1,
  },
  {
    name: 'hair_style',
    pattern: /(?:hair\s*style:\s*|(\w+)\s+(?:styled\s+)?hair)/i,
    targetPath: 'physique.appearance.hair.style',
    captureGroup: 1,
  },
  {
    name: 'hair_length',
    pattern: /(?:hair\s*length:\s*|(\w+)(?:\s+length)?\s+hair)/i,
    targetPath: 'physique.appearance.hair.length',
    captureGroup: 1,
  },
  {
    name: 'eye_color',
    pattern: /(?:eye\s*(?:color|colour):\s*|(\w+)\s+eyes)/i,
    targetPath: 'physique.appearance.eyes.color',
    captureGroup: 1,
  },
  {
    name: 'skin_tone',
    pattern: /(?:skin\s*(?:tone|color|colour):\s*|(\w+)\s+skin)/i,
    targetPath: 'physique.build.skinTone',
    captureGroup: 1,
  },
  {
    name: 'height',
    pattern: /(?:height:\s*|(?:is\s+)?(\d+(?:\.\d+)?(?:\s*(?:cm|m|ft|feet|inches?))?))/i,
    targetPath: 'physique.build.height',
    captureGroup: 1,
  },
  {
    name: 'build_torso',
    pattern: /(?:build:\s*|(lithe|nubile|average|athletic|heavy|obese)\s+build)/i,
    targetPath: 'physique.build.torso',
    captureGroup: 1,
  },
  {
    name: 'arms_build',
    pattern: /(?:arms?\s*(?:are\s+)?(very skinny|slender|average|toned|muscular))/i,
    targetPath: 'physique.build.arms.build',
    captureGroup: 1,
  },
  {
    name: 'arms_length',
    pattern: /(?:arms?\s*(?:are\s+)?(long|short|average)(?:\s+length)?)/i,
    targetPath: 'physique.build.arms.length',
    captureGroup: 1,
  },
  {
    name: 'legs_build',
    pattern: /(?:legs?\s*(?:are\s+)?(very skinny|slender|average|toned|muscular))/i,
    targetPath: 'physique.build.legs.build',
    captureGroup: 1,
  },
  {
    name: 'legs_length',
    pattern: /(?:legs?\s*(?:are\s+)?(long|short|average)(?:\s+length)?)/i,
    targetPath: 'physique.build.legs.length',
    captureGroup: 1,
  },
  {
    name: 'feet_size',
    pattern: /(?:feet?\s*(?:are\s+|size:\s*)?(tiny|petite|small|average|large))/i,
    targetPath: 'physique.build.feet.size',
    captureGroup: 1,
  },
  {
    name: 'feet_shape',
    pattern: /(?:feet?\s*(?:are\s+)?(narrow|wide|average)(?:\s+shaped)?)/i,
    targetPath: 'physique.build.feet.shape',
    captureGroup: 1,
  },
];
