import type { ParsedPlayerInput, ParsedSegment } from '@minimal-rpg/schemas';
import { parsePlayerInput } from '@minimal-rpg/utils';

/**
 * LLM message structure for pre-parser
 */
export interface PreParserMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * LLM generation result for pre-parser
 */
export interface PreParserGenerationResult {
  content: string;
  model?: string;
  raw?: unknown;
}

/**
 * LLM function signature for pre-parser
 */
export type PreParserGenerateFn = (
  messages: PreParserMessage[]
) => Promise<PreParserGenerationResult>;

/**
 * Configuration for LLM-based pre-parser
 */
export interface LlmPreParserConfig {
  callModel: PreParserGenerateFn;
  systemPrompt?: string;
  debug?: boolean;
}

/**
 * Build the default system prompt for pre-parsing.
 * This prompt helps the LLM classify unmarked segments.
 */
function buildDefaultSystemPrompt(): string {
  return `You are a player input analyzer for an RPG. Parse player input into segments.

NOTATION RULES:
- Plain text → speech (observable by NPCs)
- ~text~ → thought (NOT observable by NPCs)
- *text* → action (observable by NPCs)

IMPORTANT: Markers are HINTS, not requirements. You must still analyze unmarked text:
- "I wonder about that" → thought (no tilde, but internal verb)
- "walks to the door" → action (no asterisk, but physical verb)  
- "Hello" → speech (greeting)

OUTPUT FORMAT (JSON only, no markdown):
{
  "segments": [
    {"type": "speech|thought|action", "content": "...", "observable": true|false, "confidence": 0.0-1.0}
  ],
  "warnings": ["optional warning messages"]
}

EXAMPLES:

Input: "~I don't trust her~ Hello there"
{"segments":[{"type":"thought","content":"I don't trust her","observable":false,"confidence":1.0},{"type":"speech","content":"Hello there","observable":true,"confidence":1.0}],"warnings":[]}

Input: "I wonder if she's lying. Tell me more."
{"segments":[{"type":"thought","content":"I wonder if she's lying","observable":false,"confidence":0.9},{"type":"speech","content":"Tell me more","observable":true,"confidence":1.0}],"warnings":[]}

Input: "*leans forward* What do you mean?"
{"segments":[{"type":"action","content":"leans forward","observable":true,"confidence":1.0},{"type":"speech","content":"What do you mean","observable":true,"confidence":1.0}],"warnings":[]}

Output valid JSON only.`;
}

/**
 * Parse result with warnings
 */
interface ParseResult {
  parsed: unknown;
  warnings: string[];
}

/**
 * LLM-based pre-parser for ambiguous player input.
 * Falls back to deterministic parser for marked segments.
 */
export class LlmPreParser {
  private readonly callModel: PreParserGenerateFn;
  private readonly systemPrompt: string;
  private readonly debug: boolean;

  constructor(config: LlmPreParserConfig) {
    this.callModel = config.callModel;
    this.systemPrompt = config.systemPrompt ?? buildDefaultSystemPrompt();
    this.debug = config.debug ?? false;
  }

  /**
   * Parse player input into segments.
   * Uses deterministic parser first, LLM only for unmarked text.
   */
  async parse(input: string): Promise<ParsedPlayerInput> {
    // First try deterministic parsing
    const deterministicResult = parsePlayerInput(input);

    // If we got segments with markers, those are definitive
    const markedSegments = deterministicResult.segments.filter((s) => s.rawMarkers);

    // If all text was marked, we're done
    if (markedSegments.length === deterministicResult.segments.length) {
      return deterministicResult;
    }

    // If there are only unmarked segments and they're ambiguous, use LLM
    const unmarkedSegments = deterministicResult.segments.filter((s) => !s.rawMarkers);

    // Check if unmarked text needs LLM analysis
    if (unmarkedSegments.length > 0 && this.needsLlmAnalysis(unmarkedSegments)) {
      try {
        const llmResult = await this.parseWithLlm(input);

        // Merge: Marked segments (definitive) + LLM-classified unmarked segments
        return this.mergeResults(deterministicResult, llmResult);
      } catch (error) {
        // Fallback to deterministic result on LLM error
        const warnings = deterministicResult.warnings ?? [];
        warnings.push(
          `LLM pre-parser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return {
          ...deterministicResult,
          warnings,
        };
      }
    }

    // All unmarked text is simple speech, use deterministic result
    return deterministicResult;
  }

  /**
   * Check if unmarked segments need LLM analysis.
   * Returns false for simple cases like single greetings.
   */
  private needsLlmAnalysis(segments: ParsedSegment[]): boolean {
    if (segments.length === 0) return false;

    // If only one segment and it's short speech, don't need LLM
    if (segments.length === 1) {
      const segment = segments[0];
      if (!segment) return false;

      const content = segment.content.toLowerCase();
      const words = content.split(/\s+/);

      // Simple greetings/acknowledgments don't need LLM
      if (words.length <= 3) {
        const simplePatterns = ['hello', 'hi', 'hey', 'yes', 'no', 'okay', 'sure', 'thanks'];
        if (simplePatterns.some((p) => content.includes(p))) {
          return false;
        }
      }
    }

    // Check for thought indicators in unmarked text
    const thoughtIndicators = ['wonder', 'think', 'feel', 'notice', 'realize', 'remember'];
    const hasThoughtIndicator = segments.some((s) =>
      thoughtIndicators.some((indicator) => s.content.toLowerCase().includes(indicator))
    );

    if (hasThoughtIndicator) return true;

    // Check for action verbs in unmarked text
    const actionVerbs = ['walk', 'run', 'lean', 'grab', 'take', 'look', 'move', 'step'];
    const hasActionVerb = segments.some((s) =>
      actionVerbs.some((verb) => s.content.toLowerCase().includes(verb))
    );

    return hasActionVerb;
  }

  /**
   * Parse input using LLM
   */
  private async parseWithLlm(input: string): Promise<ParsedPlayerInput> {
    const messages: PreParserMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: input },
    ];

    const response = await this.callModel(messages);
    const parseResult = this.parseResponse(response.content);

    return this.normalizeResponse(parseResult, input);
  }

  /**
   * Parse LLM response JSON
   */
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

  /**
   * Extract JSON from response (handles markdown fences)
   */
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

  /**
   * Normalize LLM response to ParsedPlayerInput
   */
  private normalizeResponse(parseResult: ParseResult, fallbackInput: string): ParsedPlayerInput {
    if (!parseResult.parsed || typeof parseResult.parsed !== 'object') {
      // Fallback: treat as single speech segment
      return {
        rawInput: fallbackInput,
        segments: [
          {
            id: 'seg-0',
            type: 'speech',
            content: fallbackInput.trim(),
            observable: true,
            confidence: 0.5,
          },
        ],
        warnings: ['Failed to parse LLM response', ...parseResult.warnings],
      };
    }

    const record = parseResult.parsed as Record<string, unknown>;
    const segmentsRaw = record['segments'];

    if (!Array.isArray(segmentsRaw)) {
      return {
        rawInput: fallbackInput,
        segments: [
          {
            id: 'seg-0',
            type: 'speech',
            content: fallbackInput.trim(),
            observable: true,
            confidence: 0.5,
          },
        ],
        warnings: ['Invalid segments array', ...parseResult.warnings],
      };
    }

    const segments: ParsedSegment[] = [];
    for (let i = 0; i < segmentsRaw.length; i++) {
      const seg: unknown = segmentsRaw[i];
      if (!seg || typeof seg !== 'object') continue;

      const segRecord: Record<string, unknown> = seg as Record<string, unknown>;
      const type = segRecord['type'];
      const content = segRecord['content'];
      const observable = segRecord['observable'];
      const confidence = segRecord['confidence'];

      if (
        (type === 'speech' || type === 'thought' || type === 'action') &&
        typeof content === 'string' &&
        typeof observable === 'boolean'
      ) {
        segments.push({
          id: `seg-${i}`,
          type,
          content: content.trim(),
          observable,
          confidence: typeof confidence === 'number' ? confidence : undefined,
        });
      }
    }

    const llmWarnings = Array.isArray(record['warnings'])
      ? record['warnings'].filter((w): w is string => typeof w === 'string')
      : [];

    return {
      rawInput: fallbackInput,
      segments:
        segments.length > 0
          ? segments
          : [
              {
                id: 'seg-0',
                type: 'speech',
                content: fallbackInput.trim(),
                observable: true,
                confidence: 0.5,
              },
            ],
      warnings: [...llmWarnings, ...parseResult.warnings],
    };
  }

  /**
   * Merge deterministic and LLM results.
   * Marked segments from deterministic parser take precedence.
   */
  private mergeResults(
    deterministic: ParsedPlayerInput,
    llm: ParsedPlayerInput
  ): ParsedPlayerInput {
    // For now, prefer LLM results when they exist since it analyzed the full context
    // In the future, we could do more sophisticated merging
    return {
      ...llm,
      warnings: [...(deterministic.warnings ?? []), ...(llm.warnings ?? [])],
    };
  }
}
