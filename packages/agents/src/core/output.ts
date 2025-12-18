import { type Operation } from 'fast-json-patch';
import type { SensoryContextForNpc } from '@minimal-rpg/schemas';
import type { AgentType } from './types.js';

// ============================================================================
// Agent Output Types
// ============================================================================

/**
 * Token usage from LLM calls.
 */
export interface TokenUsage {
  /** Prompt tokens */
  prompt: number;

  /** Completion tokens */
  completion: number;

  /** Total tokens */
  total: number;
}

/**
 * Diagnostic information from agent execution.
 */
export interface AgentDiagnostics {
  /** Time taken to execute (ms) */
  executionTimeMs?: number;

  /** Token usage if LLM was invoked */
  tokenUsage?: TokenUsage | undefined;

  /** Any warnings or notes */
  warnings?: string[];

  /** Debug information */
  debug?: Record<string, unknown>;
}

/**
 * An event emitted by an agent.
 * Used for cross-agent communication and state coordination.
 */
export interface AgentEvent {
  /** Event type identifier */
  type: string;

  /** Event payload */
  payload: Record<string, unknown>;

  /** Source agent */
  source: AgentType;
}

/**
 * Output returned by an agent after processing a turn.
 */
export interface AgentOutput {
  /** Player-facing narrative text */
  narrative: string;

  /** Proposed state changes as JSON Patch operations */
  statePatches?: Operation[];

  /** Events emitted by this agent (for cross-agent communication) */
  events?: AgentEvent[];

  /** Optional diagnostic/debug info */
  diagnostics?: AgentDiagnostics;

  /** Whether this agent wants to continue (multi-step) */
  continueProcessing?: boolean;

  /** Structured sensory context (for SensoryAgent output to NpcAgent) */
  sensoryContext?: SensoryContextForNpc;
}

/**
 * Result of executing an agent for a single turn.
 */
export interface AgentExecutionResult {
  /** Agent type that was executed */
  agentType: AgentType;

  /** Output produced by the agent (may be fallback on error) */
  output: AgentOutput;

  /** Time taken to execute (ms) */
  executionTimeMs: number;

  /** Whether the agent completed successfully */
  success: boolean;

  /** Optional error when execution failed */
  error?: Error | undefined;
}
