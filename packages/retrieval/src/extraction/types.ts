import type { KnowledgeNode } from '../types.js';

export interface ExtractedNode {
  /** The path this node was extracted from */
  path: string;
  /** Human-readable content */
  content: string;
  /** Base importance for this path */
  baseImportance: number;
}

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
