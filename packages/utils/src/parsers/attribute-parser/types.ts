export interface ParserPattern {
  /** Name of the pattern */
  name: string;

  /** Regex pattern to match */
  pattern: RegExp;

  /** Target path in the profile (e.g., 'physique.appearance.hair.color') */
  targetPath: string;

  /** Which capture group to use (default: 1) */
  captureGroup?: number;
}

export interface ExtractedAttribute {
  /** Name of the attribute */
  name: string;

  /** Target path in the profile */
  path: string;

  /** Extracted value */
  value: string;
}

export interface ParserLlmProvider {
  generate(
    prompt: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<{ text: string; usage?: unknown }>;
}

export interface AttributeParserConfig {
  /** Regex patterns for extracting structured data */
  patterns?: ParserPattern[];
  /** Optional LLM provider for fallback extraction */
  llmProvider?: ParserLlmProvider;
}
