/**
 * Node extraction utilities for converting profile JSON into knowledge nodes.
 */

import type { KnowledgeNode, NodeIngestionError } from './types.js';

/**
 * Default paths to extract for character profiles.
 * Based on CharacterProfile schema structure.
 */
export const DEFAULT_CHARACTER_PATHS = [
  // Core identity
  'name',
  'summary',
  // Appearance
  'appearance.build',
  'appearance.hair',
  'appearance.eyes',
  'appearance.skin',
  'appearance.face',
  'appearance.distinguishingFeatures',
  'appearance.style',
  // Personality
  'personality.traits',
  'personality.quirks',
  'personality.fears',
  'personality.desires',
  // Background
  'background.history',
  'background.occupation',
  'background.relationships',
  // Voice/style
  'voice.tone',
  'voice.vocabulary',
  'voice.mannerisms',
  // Goals
  'goals',
  // Scent (for immersive descriptions)
  'scent',
] as const;

/**
 * Default paths to extract for setting profiles.
 */
export const DEFAULT_SETTING_PATHS = [
  // Core identity
  'name',
  'summary',
  // Atmosphere
  'atmosphere.mood',
  'atmosphere.sights',
  'atmosphere.sounds',
  'atmosphere.smells',
  // Location details
  'location.type',
  'location.geography',
  'location.climate',
  // Inhabitants
  'inhabitants.population',
  'inhabitants.culture',
  'inhabitants.factions',
  // History
  'history.origin',
  'history.events',
  // Themes
  'themes',
] as const;

/**
 * Importance weights by path pattern.
 * More narratively significant paths get higher base importance.
 */
const PATH_IMPORTANCE_MAP: Record<string, number> = {
  // High importance (0.8-1.0) - core identity and major facts
  name: 0.9,
  summary: 0.85,
  'personality.traits': 0.8,
  goals: 0.8,
  'background.history': 0.75,
  // Medium importance (0.5-0.7) - useful details
  'appearance.distinguishingFeatures': 0.7,
  'personality.quirks': 0.6,
  'personality.fears': 0.65,
  'personality.desires': 0.65,
  'voice.mannerisms': 0.6,
  atmosphere: 0.6,
  themes: 0.6,
  // Lower importance (0.3-0.5) - descriptive details
  'appearance.build': 0.4,
  'appearance.hair': 0.4,
  'appearance.eyes': 0.45,
  'appearance.skin': 0.35,
  'appearance.face': 0.4,
  'appearance.style': 0.4,
  scent: 0.35,
  'voice.tone': 0.45,
  'voice.vocabulary': 0.4,
};

/**
 * Default importance for paths not in the map.
 */
const DEFAULT_IMPORTANCE = 0.5;

/**
 * Get the base importance for a given path.
 */
export function getPathImportance(path: string): number {
  // Check for exact match first
  if (path in PATH_IMPORTANCE_MAP) {
    return PATH_IMPORTANCE_MAP[path] ?? DEFAULT_IMPORTANCE;
  }

  // Check for prefix matches (e.g., 'appearance.hair.color' matches 'appearance.hair')
  for (const [pattern, importance] of Object.entries(PATH_IMPORTANCE_MAP)) {
    if (path.startsWith(pattern + '.')) {
      return importance;
    }
  }

  return DEFAULT_IMPORTANCE;
}

/**
 * Get a value from an object by dot-notation path.
 */
export function getValueAtPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined;
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Convert a value to a human-readable content string.
 */
export function valueToContent(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return null;
    }
    // For string arrays, join with commas
    if (value.every((v) => typeof v === 'string')) {
      return value.join(', ');
    }
    // For object arrays, stringify each
    return value.map((v) => JSON.stringify(v)).join('; ');
  }

  // Handle objects
  if (typeof value === 'object') {
    // Try to create a readable summary
    const obj = value as Record<string, unknown>;
    const parts: string[] = [];

    for (const [key, val] of Object.entries(obj)) {
      if (val !== null && val !== undefined && val !== '') {
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          parts.push(`${key}: ${val}`);
        }
      }
    }

    if (parts.length === 0) {
      return null;
    }
    return parts.join(', ');
  }

  // Handle primitives
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

/**
 * Result of extracting nodes from a profile.
 */
export interface ExtractedNode {
  /** The path this node was extracted from */
  path: string;
  /** Human-readable content */
  content: string;
  /** Base importance for this path */
  baseImportance: number;
}

/**
 * Extract knowledge nodes from a profile JSON.
 *
 * @param profileJson The profile to extract from
 * @param paths Paths to extract (uses defaults if not provided)
 * @param isCharacter Whether this is a character profile (affects default paths)
 * @returns Extracted nodes and any errors
 */
export function extractNodes(
  profileJson: unknown,
  paths?: string[],
  isCharacter = true
): { nodes: ExtractedNode[]; errors: NodeIngestionError[] } {
  const extractPaths =
    paths ?? (isCharacter ? [...DEFAULT_CHARACTER_PATHS] : [...DEFAULT_SETTING_PATHS]);

  const nodes: ExtractedNode[] = [];
  const errors: NodeIngestionError[] = [];

  for (const path of extractPaths) {
    try {
      const value = getValueAtPath(profileJson, path);
      const content = valueToContent(value);

      if (content !== null && content.length > 0) {
        nodes.push({
          path,
          content,
          baseImportance: getPathImportance(path),
        });
      }
    } catch (error) {
      errors.push({
        path,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { nodes, errors };
}

/**
 * Create a KnowledgeNode from an extracted node.
 * Does not include embedding - that must be computed separately.
 */
export function createKnowledgeNode(
  extracted: ExtractedNode,
  options: {
    id: string;
    characterInstanceId?: string;
    settingInstanceId?: string;
  }
): KnowledgeNode {
  const now = new Date();

  const node: KnowledgeNode = {
    id: options.id,
    path: extracted.path,
    content: extracted.content,
    baseImportance: extracted.baseImportance,
    narrativeImportance: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Only set owner IDs if defined (exactOptionalPropertyTypes)
  if (options.characterInstanceId !== undefined) {
    node.characterInstanceId = options.characterInstanceId;
  }
  if (options.settingInstanceId !== undefined) {
    node.settingInstanceId = options.settingInstanceId;
  }

  return node;
}

/**
 * Check if a node's content has changed and needs re-embedding.
 */
export function nodeContentChanged(existing: KnowledgeNode, extracted: ExtractedNode): boolean {
  return existing.content !== extracted.content;
}

/**
 * Compute a diff between existing nodes and newly extracted nodes.
 */
/** A node update pair with existing and new extracted data */
export interface NodeUpdatePair {
  existing: KnowledgeNode;
  extracted: ExtractedNode;
}

export interface NodeDiff {
  /** Nodes that need to be created (new paths) */
  toCreate: ExtractedNode[];
  /** Nodes that need to be updated (content changed) */
  toUpdate: NodeUpdatePair[];
  /** Nodes that are unchanged */
  unchanged: KnowledgeNode[];
  /** Existing nodes whose paths are no longer in the profile */
  toRemove: KnowledgeNode[];
}

/**
 * Diff existing nodes against newly extracted nodes.
 */
export function diffNodes(existing: KnowledgeNode[], extracted: ExtractedNode[]): NodeDiff {
  const existingByPath = new Map(existing.map((n) => [n.path, n]));
  const extractedByPath = new Map(extracted.map((e) => [e.path, e]));

  const toCreate: ExtractedNode[] = [];
  const toUpdate: NodeUpdatePair[] = [];
  const unchanged: KnowledgeNode[] = [];
  const toRemove: KnowledgeNode[] = [];

  // Check each extracted node
  for (const [path, ext] of extractedByPath) {
    const existingNode = existingByPath.get(path);

    if (!existingNode) {
      // New node
      toCreate.push(ext);
    } else if (nodeContentChanged(existingNode, ext)) {
      // Content changed
      toUpdate.push({ existing: existingNode, extracted: ext });
    } else {
      // No change
      unchanged.push(existingNode);
    }
  }

  // Find nodes to remove (paths that no longer exist)
  for (const [path, node] of existingByPath) {
    if (!extractedByPath.has(path)) {
      toRemove.push(node);
    }
  }

  return { toCreate, toUpdate, unchanged, toRemove };
}
