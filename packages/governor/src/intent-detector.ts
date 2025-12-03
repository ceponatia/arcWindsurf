import {
  type IntentDetector,
  type DetectedIntent,
  type IntentDetectionContext,
  type IntentType,
  type IntentParams,
} from './types.js';

// ============================================================================
// Intent Patterns
// ============================================================================

/**
 * Pattern matching configuration for an intent type.
 */
interface IntentPattern {
  /** Intent type this pattern matches */
  type: IntentType;

  /** Keywords that strongly indicate this intent */
  keywords: string[];

  /** Regex patterns for more complex matching */
  patterns?: RegExp[];

  /** Parameter extractors */
  extractors?: ParamExtractor[];

  /** Base confidence for keyword matches */
  baseConfidence: number;
}

/**
 * A function that extracts intent parameters from input.
 */
interface ParamExtractor {
  /** The parameter to extract */
  param: keyof IntentParams;

  /** Pattern to match and extract the value */
  pattern: RegExp;

  /** Group index to extract (default: 1) */
  groupIndex?: number;
}

/**
 * Default intent patterns for rule-based detection.
 */
const DEFAULT_PATTERNS: IntentPattern[] = [
  {
    type: 'move',
    keywords: ['go', 'walk', 'run', 'move', 'travel', 'head', 'proceed', 'enter', 'exit', 'leave'],
    patterns: [
      /^go\s+(?:to\s+)?(.+)$/i,
      /^(?:walk|run|head)\s+(?:to\s+)?(.+)$/i,
      /^enter\s+(?:the\s+)?(.+)$/i,
      /^leave(?:\s+(?:the\s+)?(.+))?$/i,
    ],
    extractors: [
      { param: 'direction', pattern: /(?:go|walk|head|move)\s+(north|south|east|west|up|down)/i },
      {
        param: 'target',
        pattern: /(?:go|walk|enter|head)\s+(?:to\s+)?(?:the\s+)?(\w+(?:\s+\w+)?)/i,
      },
    ],
    baseConfidence: 0.7,
  },
  {
    type: 'look',
    keywords: ['look', 'see', 'observe', 'survey', 'scan', 'view', 'gaze'],
    patterns: [/^look(?:\s+around)?$/i, /^look\s+at\s+(.+)$/i, /^observe\s+(.+)$/i],
    extractors: [{ param: 'target', pattern: /look\s+at\s+(?:the\s+)?(.+)/i }],
    baseConfidence: 0.8,
  },
  {
    type: 'examine',
    keywords: ['examine', 'inspect', 'study', 'analyze', 'check', 'investigate'],
    patterns: [/^examine\s+(.+)$/i, /^inspect\s+(.+)$/i, /^check\s+(.+)$/i],
    extractors: [
      { param: 'target', pattern: /(?:examine|inspect|check|study)\s+(?:the\s+)?(.+)/i },
    ],
    baseConfidence: 0.8,
  },
  {
    type: 'talk',
    keywords: ['talk', 'speak', 'say', 'ask', 'tell', 'chat', 'greet', 'hello', 'hi'],
    patterns: [
      /^talk\s+(?:to|with)\s+(.+)$/i,
      /^speak\s+(?:to|with)\s+(.+)$/i,
      /^say\s+"?(.+)"?\s+to\s+(.+)$/i,
      /^ask\s+(.+)\s+about\s+(.+)$/i,
      /^(?:hello|hi|greet)\s*(.*)$/i,
    ],
    extractors: [
      { param: 'target', pattern: /(?:talk|speak|chat)\s+(?:to|with)\s+(.+)/i },
      { param: 'target', pattern: /ask\s+(\w+)/i },
    ],
    baseConfidence: 0.75,
  },
  {
    type: 'use',
    keywords: ['use', 'activate', 'operate', 'apply', 'employ'],
    patterns: [/^use\s+(.+)$/i, /^use\s+(.+)\s+on\s+(.+)$/i, /^activate\s+(.+)$/i],
    extractors: [
      { param: 'item', pattern: /use\s+(?:the\s+)?(.+?)(?:\s+on|$)/i },
      { param: 'target', pattern: /use\s+.+\s+on\s+(?:the\s+)?(.+)/i },
    ],
    baseConfidence: 0.8,
  },
  {
    type: 'take',
    keywords: ['take', 'get', 'grab', 'pick', 'collect', 'acquire', 'obtain'],
    patterns: [/^take\s+(.+)$/i, /^(?:pick|grab)\s+(?:up\s+)?(.+)$/i, /^get\s+(.+)$/i],
    extractors: [{ param: 'item', pattern: /(?:take|get|grab|pick)\s+(?:up\s+)?(?:the\s+)?(.+)/i }],
    baseConfidence: 0.85,
  },
  {
    type: 'give',
    keywords: ['give', 'hand', 'offer', 'present', 'deliver'],
    patterns: [/^give\s+(.+)\s+to\s+(.+)$/i, /^hand\s+(.+)\s+to\s+(.+)$/i],
    extractors: [
      { param: 'item', pattern: /(?:give|hand)\s+(?:the\s+)?(.+?)\s+to/i },
      { param: 'target', pattern: /(?:give|hand)\s+.+\s+to\s+(.+)/i },
    ],
    baseConfidence: 0.85,
  },
  {
    type: 'wait',
    keywords: ['wait', 'rest', 'pause', 'stop', 'stay'],
    patterns: [/^wait(?:\s+for\s+(.+))?$/i, /^rest$/i, /^stay\s+here$/i],
    baseConfidence: 0.9,
  },
  {
    type: 'system',
    keywords: ['help', 'save', 'load', 'quit', 'exit', 'menu', 'inventory', 'stats', 'status'],
    patterns: [/^help$/i, /^save(?:\s+game)?$/i, /^load(?:\s+game)?$/i, /^(?:quit|exit)$/i],
    baseConfidence: 0.95,
  },
];

// ============================================================================
// Rule-Based Intent Detector
// ============================================================================

/**
 * Configuration for the rule-based intent detector.
 */
export interface RuleBasedIntentDetectorConfig {
  /** Custom patterns to add or override */
  customPatterns?: IntentPattern[] | undefined;

  /** Minimum confidence threshold (below this returns 'unknown') */
  minConfidence?: number | undefined;

  /** Whether to use context for boosting confidence */
  useContext?: boolean | undefined;
}

/**
 * A rule-based intent detector using keyword and pattern matching.
 * Suitable for offline/local intent detection without LLM calls.
 */
export class RuleBasedIntentDetector implements IntentDetector {
  private readonly patterns: IntentPattern[];
  private readonly minConfidence: number;
  private readonly useContext: boolean;

  constructor(config: RuleBasedIntentDetectorConfig = {}) {
    // Merge custom patterns with defaults (custom takes precedence)
    const customPatterns = config.customPatterns ?? [];
    const customTypes = new Set(customPatterns.map((p) => p.type));

    this.patterns = [
      ...customPatterns,
      ...DEFAULT_PATTERNS.filter((p) => !customTypes.has(p.type)),
    ];

    this.minConfidence = config.minConfidence ?? 0.3;
    this.useContext = config.useContext ?? true;
  }

  detect(input: string, context?: IntentDetectionContext): Promise<DetectedIntent> {
    const normalizedInput = input.trim().toLowerCase();

    // Score each intent pattern
    const scores = this.patterns.map((pattern) => ({
      pattern,
      score: this.scorePattern(normalizedInput, pattern, context),
      params: this.extractParams(input, pattern),
      signals: this.findMatchingSignals(normalizedInput, pattern),
    }));

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    const best = scores[0];

    // Check if best score meets minimum threshold
    if (!best || best.score < this.minConfidence) {
      return Promise.resolve({
        type: 'unknown',
        confidence: best?.score ?? 0,
        params: best?.params,
        signals: best?.signals,
      });
    }

    return Promise.resolve({
      type: best.pattern.type,
      confidence: Math.min(best.score, 1.0), // Cap at 1.0
      params: best.params,
      signals: best.signals,
    });
  }

  /**
   * Score how well input matches a pattern.
   */
  private scorePattern(
    input: string,
    pattern: IntentPattern,
    context?: IntentDetectionContext
  ): number {
    let score = 0;

    // Keyword matching
    const words = input.split(/\s+/);
    const keywordMatches = pattern.keywords.filter((kw) =>
      words.some((w) => w === kw || w.startsWith(kw))
    );

    if (keywordMatches.length > 0) {
      // First word match is stronger
      if (pattern.keywords.includes(words[0] ?? '')) {
        score = pattern.baseConfidence;
      } else {
        score = pattern.baseConfidence * 0.8;
      }
    }

    // Regex pattern matching (adds to score)
    if (pattern.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(input)) {
          score = Math.max(score, pattern.baseConfidence + 0.1);
          break;
        }
      }
    }

    // Context boosting
    if (this.useContext && context && score > 0) {
      score = this.applyContextBoost(score, pattern, context);
    }

    return score;
  }

  /**
   * Apply context-based confidence boosting.
   */
  private applyContextBoost(
    score: number,
    pattern: IntentPattern,
    context: IntentDetectionContext
  ): number {
    let boost = 0;

    // If action is in available actions, boost confidence
    if (context.availableActions?.some((a) => a.toLowerCase() === pattern.type)) {
      boost += 0.1;
    }

    // If talking and NPCs are present, boost talk confidence
    if (pattern.type === 'talk' && context.presentNpcs && context.presentNpcs.length > 0) {
      boost += 0.05;
    }

    // If using/taking items and items are in inventory, boost
    if (
      (pattern.type === 'use' || pattern.type === 'give') &&
      context.inventoryItems &&
      context.inventoryItems.length > 0
    ) {
      boost += 0.05;
    }

    return Math.min(score + boost, 1.0);
  }

  /**
   * Extract parameters from input using pattern extractors.
   */
  private extractParams(input: string, pattern: IntentPattern): IntentParams | undefined {
    if (!pattern.extractors || pattern.extractors.length === 0) {
      return undefined;
    }

    const params: IntentParams = {};
    let hasParams = false;

    for (const extractor of pattern.extractors) {
      const match = input.match(extractor.pattern);
      if (match) {
        const value = match[extractor.groupIndex ?? 1];
        if (value) {
          const trimmedValue = value.trim();
          switch (extractor.param) {
            case 'target':
              params.target = trimmedValue;
              break;
            case 'direction':
              params.direction = trimmedValue;
              break;
            case 'item':
              params.item = trimmedValue;
              break;
            case 'action':
              params.action = trimmedValue;
              break;
            case 'extra':
              // For extra, we store in the extra object
              params.extra ??= {};
              params.extra['value'] = trimmedValue;
              break;
          }
          hasParams = true;
        }
      }
    }

    return hasParams ? params : undefined;
  }

  /**
   * Find which keywords/patterns matched.
   */
  private findMatchingSignals(input: string, pattern: IntentPattern): string[] {
    const signals: string[] = [];
    const words = input.split(/\s+/);

    // Add matching keywords
    for (const keyword of pattern.keywords) {
      if (words.includes(keyword)) {
        signals.push(keyword);
      }
    }

    // Add pattern matches
    if (pattern.patterns) {
      for (const regex of pattern.patterns) {
        if (regex.test(input)) {
          signals.push(`pattern:${regex.source.slice(0, 20)}`);
          break; // Only add one pattern signal
        }
      }
    }

    return signals;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a rule-based intent detector with default configuration.
 */
export function createRuleBasedIntentDetector(
  config?: RuleBasedIntentDetectorConfig
): RuleBasedIntentDetector {
  return new RuleBasedIntentDetector(config);
}

/**
 * Create a fallback intent detector that always returns 'unknown'.
 * Useful as a placeholder when no real detector is configured.
 */
export function createFallbackIntentDetector(): IntentDetector {
  return {
    detect(input: string): Promise<DetectedIntent> {
      return Promise.resolve({
        type: 'unknown',
        confidence: 0,
        params: { action: input },
      });
    },
  };
}
